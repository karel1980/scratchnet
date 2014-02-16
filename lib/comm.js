/* Module handling the actual communication between connected peers
 * as well as obey the contract towards scratch.
 *
 * To be able to multiplex multiple communication-channels of this type 
 * on one instance of this, we will need to instantiate multiple ports. 
 * ( this because the scratch-ectension-descriptions do not allow to 
 *   specify some URI prefix)
 * This also makes the communicating peer to be identified by only 2 parts:
 *   host:port
 * 
 * Relative to this URI each service will support these resources:
 * -1- for the enduser --
 * GET ./extension >> generated scratch-block-spec file to save and import into scratch
 *                   TODO use content-disposition header to also generate unique filenames with s2e extension
 * -2- for the scratch-block calls -- 
 * GET ./call/{message}{/args...} --> these get transferred to other side via POST ./receive
 * -3- for the scratch-system calls
 * GET ./poll
 * GET ./reset_all{?peer} -- optional peer param indicates transfered message: indicating peer was reset
 * -4- for the actual communication to the peer:
 * POST ./receive  with json BODY containing the called message
 */

var http = require('http');
var expr = require('express');

var connect = require('connect');
var utils = connect.utils;

exports = module.exports = createCommunication;

function createCommunication ( conf) {
    return new Communication( conf);
}

function parseIpPort(ipport) {
    if (!ipport || typeof ipport != "string") {return ipport;}
    var parts = ipport.split(":")
    if (parts.length == 1) {
        parts[1] = parts[0];
        parts[0] = "127.0.0.1";
    }
    return {host: parts[0], port: parts[1]};
}


function createServiceHandler(srv) {
    // TODO interprete the service description and build a serviceHandler for it
    
    
    return srv;
}

function scratchPollString(s) {
    s = s || "";
    s = s.replace(/ /g, '_'); //Sadly the poll response does not properly support spaces.
    return encodeURIComponent(s);
}

function Communication(conf) {
    console.log("Creating comm as configured:");
    console.log(conf);
    this.id         = conf.id;
    this.bind       = parseIpPort(conf.bind);
    this.connect    = parseIpPort(conf.connect);
    this.service    = createServiceHandler(conf.service);
    
    this.app = expr();

    this.init();
    //this.service.init(this.app);
    this.start();
}

Communication.prototype.sendToPeer = function(opts, data) {
    utils.merge(opts, this.connect);

    var ignoringResponse = function(response) {
        var str = '';
        //another chunk of data has been recieved, so append it to `str`
        response.on('data', function (chunk) {
            str += chunk;
        });
        //the whole response has been recieved, so we just print it out here
        response.on('end', function () {
            console.log("  .. completed sending // ignoring response " + str);
            // we don't really care about the response
        });
        //what if there is an error?
        response.on('error', function(err){
            console.log("  !! there was an error communicating to peer..: " + err.message);
        })
    }

    var req = http.request(opts, ignoringResponse);
    req.on('error', function(err){
        console.log("  !! there was an error connecting to peer..: " + err.message);
    });
    req.end();
}

Communication.prototype.reset = function() {
    console.log('<< reset >>');
    this.queue = {};
    this.top = 0;
    this.ptr = 0;
    this.last = "";
    this.line = "";
    this._error = null;
}

Communication.prototype.enqueue = function(msg) {
    this.last = msg;
    if (this.ptr == this.top) this.line = msg; // publish immediately!
    this.top++; // forces the 'available' boolean
    this.queue[this.top] = msg;
    this._error = null;
}

Communication.prototype.dequeue = function() {
    if (this.ptr < this.top) {
        delete this.queue[this.ptr];
        this.ptr++; 
        this.line = this.queue[this.ptr]; // advance to next - possibly last
    }
}

Communication.prototype.init = function() {
    console.log("bind at        - " + this.bind.host +    " : " + this.bind.port);
    console.log("connection to  - " + this.connect.host + " : " + this.connect.port);
    
    this.reset();
    var me = this;

    function sendReset() {
        console.log("transfer reset request");
        me.sendToPeer({ path: '/reset_all?from=peer' });               
    }
    
    function sendMessage(msg) {
        console.log("sending " + msg);
        me.sendToPeer({ path: '/receive/' + encodeURIComponent(msg) });               
    }
    
    //
    // called by scratch 
    //
    this.app.get('/send/:msg', function(req, res){
        var msg = req.param('msg');
        sendMessage(msg);
        res.setHeader('Content-Type', 'text/plain');
        res.send('ok');
    });

    this.app.get('/ack', function(req, res){
        me.dequeue();
        console.log('ack @' + me.ptr + ' = ' + me.line);

        res.setHeader('Content-Type', 'text/plain');
        res.send('ok');
    });

    this.app.get('/poll', function(req, res){
        var poll = '';
        poll += 'line ' + scratchPollString(me.line) + '\n';
        poll += 'last ' + scratchPollString(me.last) + '\n';
        poll += 'ptr '  + me.ptr  + '\n';
        poll += 'top '  + me.top  + '\n';
        poll += 'hasNext '  + (me.top > me.ptr)  + '\n';
        if (!!me._error) {
            poll += '_error ' + me._error + '\n';
        }
        
        res.setHeader('Content-Type', 'text/plain');
        res.send(poll);
    });

    // 
    // called by scratch OR by other
    this.app.get('/reset_all', function(req, res){
        me.reset();
        
        if (req.query.from != "peer") {
            sendReset(); // Transfer the resetting to the other side
        } else {
            me._error = "Connection reset by peer!";
        }
        
        res.setHeader('Content-Type', 'text/plain');
        res.send('ok');
    });

    //
    // called by other
    //
    this.app.get('/receive/:msg', function(req, res){
        var msg = req.param('msg')
        console.log("received " + msg);
        me.enqueue(msg);

        res.setHeader('Content-Type', 'text/plain');
        res.send('ok');
    });

}

Communication.prototype.start = function(app) {
    this.app.listen(this.bind.port);    
}
