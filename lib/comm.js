/* Module handling the actual communication between connected peers
 * as well as obey the contract towards scratch
 */

// TODO: 
//  - rewrite to fit the module structure
//  - rewrite to get config passed in (rather then use CLI args)
//  - investigate into other connection then http between peers
//  - then close down port to only localhost (ensuring scratch only calls)
//  - investigate in more scratch features
//  - look into fitting in with the other aspects of the bigger picture

var http = require('http');
var expr = require('express');

var connect = require('connect');
var utils = connect.utils;


exports = module.exports = createCommunication;

function createCommunication (app, conf) {
    return new Communication(app, conf);
}

function parseIpPort(ipport) {
  var parts = ipport.split(":")
  if (parts.length == 1) {
    parts[1] = parts[0];
    parts[0] = "127.0.0.1";
  }
  return {host: parts[0], port: parts[1]};
}

function makeProtoStrategy(proto, connect){
    // TODO 
    // - actually make strategy object to handle communication based on type
    // - and allow for more complicated message-layouts (more arguments)
    // - consider posting json over HTTP (in the body) or using socket.io
    var protoStrategy = {};
    protoStrategy.sendToPeer = function(opts) {
        utils.merge(opts, connect);

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
    };
    return protoStrategy;
}

function makeServiceStrategy(srv) {
    // TODO 
    return srv;
}

function scratchPollString(s) {
    s = s || "";
    s = s.replace(/ /g, '_'); //Sadly the poll response does not properly support spaces.
    return encodeURIComponent(s);
}

function Communication(app, conf) {
    this.connect    = parseIpPort(conf.connect);
    this.protocol   = makeProtoStrategy(conf.protocol, this.connect);
    this.service    = makeServiceStrategy(conf.service);
    
    this.app = app;

    this.init();
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
    console.log("connection to  - " + this.connect.host + " : " + this.connect.port);
    
    this.reset();
    var me = this;

    function sendReset() {
        console.log("transfer reset request");
        me.protocol.sendToPeer({ path: '/reset_all?from=peer' });               
    }
    
    function sendMessage(msg) {
        console.log("sending " + msg);
        me.protocol.sendToPeer({ path: '/receive/' + encodeURIComponent(msg) });               
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
