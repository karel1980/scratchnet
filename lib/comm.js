/** Module handling the actual communication between connected peers
 * as well as obey the contract towards scratch.
 *
 * To be able to multiplex multiple communication-channels of this type 
 * on one nodejs-instance we will need to instantiate multiple ports. 
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

    if (!ipport || typeof ipport != "string") {return null;}
    
    var parts = ipport.split(":")
    if (parts.length == 1) {
        parts[1] = parts[0];
        parts[0] = "127.0.0.1";
    }
    return {host: parts[0], port: parts[1]};
}

function createServiceHandler(comm, conf) {
    // TODO interprete the service description and build a serviceHandler for it
    
    var srv;
    if (conf.type == "peer") {
        srv = new PeerServiceHandler();
    } else if (conf.type == "request-response") {
        //TODO implement 
    } else {
        srv = null;
    }
    
    return srv;
}

function scratchPollString(s) {
    s = s || "";
    s = s.replace(/ /g, '_'); //Sadly the poll response does not properly support spaces.
    return encodeURIComponent(s);
}

function Communication(conf) {
    this.id         = conf.id;
    this.bind       = parseIpPort(conf.bind);
    this.connect    = parseIpPort(conf.connect);
    this.service    = createServiceHandler(this, conf.service);
    
    this.app = expr();
    this.app.use(expr.bodyParser());

    this.init();
    this.start();
}

/**
 * Report the TCP port this service is bound to
 */
Communication.prototype.getPort = function() {
    return this.bind.port;
}

/** 
 * Allow setting the connection peer after creation
 */
Communication.prototype.setPeer = function(host, port, id) {
    this.connect = {host: host, port: port};
    
    //TODO use the id of the peer to generate meaningfull extsion-block-definition file
}

function ignoringResponse(response) {
    var str = '';
    //another chunk of data has been recieved, so append it to `str`
    response.on('data', function (chunk) {
        str += chunk;
    });
    //the whole response has been recieved, so we just print it out here
    response.on('end', function () {
        console.log("  .. completed sending // ignoring response %s", str);
        // we don't really care about the response
    });
    //what if there is an error?
    response.on('error', function(err){
        console.log("  !! there was an error communicating to peer..: %s", err.message);
    })
}

Communication.prototype.sendToPeer = function(opts, data) { 
    var dataString = (!!data) ? JSON.stringify(data) : "";
    var headers = {
        'Content-Type': 'application/json',
        'Content-Length': dataString.length
    }
   
    utils.merge(opts, this.connect);
    utils.merge(opts, { method: "POST", headers: headers});
    
    var req = http.request(opts, ignoringResponse);
    req.on('error', function(err){
        console.log("  !! there was an error connecting to peer..: %s", err.message);
    });
    req.write(dataString);
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
    
    this.reset();
    var self = this;
    this.service.init();

    function sendReset() {
        console.log("transfer reset request");
        self.sendToPeer({ path: '/reset_all' });               
    }
    
    function sendMessage(data) {
        console.log("sending %j", data);
        self.sendToPeer({ path: '/receive/'}, data );               
    }
    
    //
    // called by scratch 
    //
    this.app.get('/send/:msg', function(req, res){
        var msg = req.param('msg');
        sendMessage({message: 'send', args: [msg]});
        res.setHeader('Content-Type', 'text/plain');
        res.send('ok');
    });

    this.app.get('/ack', function(req, res){
        self.dequeue();
        console.log('ack @%03d => %s', self.ptr, self.line);

        res.setHeader('Content-Type', 'text/plain');
        res.send('ok');
    });

    this.app.get('/poll', function(req, res){
        var poll = '';
        poll += 'line ' + scratchPollString(self.line) + '\n';
        poll += 'last ' + scratchPollString(self.last) + '\n';
        poll += 'ptr '  + self.ptr  + '\n';
        poll += 'top '  + self.top  + '\n';
        poll += 'hasNext '  + (self.top > self.ptr)  + '\n';
        if (!!self._error) {
            poll += '_error ' + self._error + '\n';
        }
        
        res.setHeader('Content-Type', 'text/plain');
        res.send(poll);
    });

     
    // called by scratch
    this.app.get('/reset_all', function(req, res){
        self.reset();
        sendReset(); // Transfer the resetting to the other side        
        res.setHeader('Content-Type', 'text/plain');
        res.send('ok');
    });
    // transfered by other
    this.app.post('/reset_all', function(req, res){
        self.reset();
        res.setHeader('Content-Type', 'text/plain');
        res.send('ok');
    });


    //
    // called by other
    //
    this.app.post('/receive', function(req, res){
    
        console.log("received json: %j", req.body);
        var msg = req.body.args[0];
        console.log("received message %s", msg);
        self.enqueue(msg);

        res.setHeader('Content-Type', 'text/plain');
        res.send('ok');
    });

}

Communication.prototype.start = function(app) {
    if (!this.bind ) {
        this.bind = {port: 0};  // if you don't have a preferred port choose 0 to allow the system to allocate one
    }
    var self = this;
    var server = http.createServer(this.app);
    server.listen(this.bind.port, function() {
        self.bind = server.address(); // register the port we're at
        console.log("service connected on port %j", self.bind);
    });    
}

function PeerServiceHandler(comm) {
    this.comm = comm;
}

PeerServiceHandler.prototype.init = function() {
    // TODO
}
