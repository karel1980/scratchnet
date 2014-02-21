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
    var srv;
    if (conf.type == "peer") {
        srv = new PeerServiceHandler(comm, conf);
    } else if (conf.type == "request-response") {
        //TODO implement 
    } else {
        srv = null;
    }
    
    return srv;
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

Communication.prototype.sendReset = function() {
    console.log("transfer reset request");
    this.sendToPeer({ path: '/reset_all' });
}
    
Communication.prototype.sendMessage = function(data) {
    console.log("sending %j", data);
    this.sendToPeer({ path: '/receive/'}, data );
}
 


Communication.prototype.reset = function() {
    console.log('<< reset >>');
    this.queues = {};
    this._error = null;
}

Communication.prototype.getQueue = function(name) {
    if (!this.queues[name]) {
        this.queues[name] = new Queue();
    }
    return this.queues[name];
}


function Queue(name) {
    this._name = name;
    this._top = 0;
    this._ptr = 0;
    this._last = {};
    this._crnt = {};
}

Queue.prototype.enqueue = function (content) {
    this._last = content;
    if (this._ptr == this._top) this._crnt = content; // publish immediately!
    this._top++; // forces the 'available' boolean
    this[this._top] = content;
}

Queue.prototype.dequeue = function () {
    if (this._ptr < this._top) {
        delete this[this._ptr];
        this._ptr++; 
        this._crnt = this[this._ptr]; // advance to next - possibly last
    }
}

Queue.prototype.hasNext = function () {
    return this._top > this._ptr;
}

Queue.prototype.toPollString = function () {
    var name = this._name;
    var poll = "";
    poll += pollArgs( this._crnt, this.name + '-crnt-');
    poll += pollArgs( this._last, this.name + '-last-');
    poll += name + '-ptr '  + this._ptr  + '\n';
    poll += name + '-top '  + this._top  + '\n';
    poll += name + '-hasNext '  + this.hasNext() + '\n';
    return poll;
}


//------------ helper functions assembling 'poll' body

function pollString(s) {
    s = s || "";
    if (typeof s != "string") {return s;}
    s = s.replace(/ /g, '_'); //Sadly the poll response does not properly support spaces.
    return encodeURIComponent(s);
}

function pollArgs(set, pfx) {
    var poll = "";
    for (k in set) {
        poll += pfx + k + " " + pollString(set[k]) + '\n';
    }
    return poll;
}

function pollQueues(qs) {
    var poll = "";
    for (var name in qs) {
        var q = qs[name];
        poll += q.toPollString();
    }
    return poll;
}



Communication.prototype.init = function() {
    
    this.reset();
    var self = this;
 
    var app = this.app;
    // generic stuff - called by scratch
    app.get('/poll', function(req, res){
        var poll = '';
        poll += pollQueues(self.queues);
        if (!!self._error) {
            poll += '_error ' + self._error + '\n';
        }
        
        res.setHeader('Content-Type', 'text/plain');
        res.send(poll);
    });

    // called by scratch through GET
    app.use(function(req, res, next) {
        if (req.url == '/reset_all') {
            self.reset();
            if (req.method == 'GET') { // GET means this is called by scratch
                self.sendReset(); // only then POST the reset to the other side
            }
            res.setHeader('Content-Type', 'text/plain');
            res.send('ok');
            return;
        }
        next();
    });
       
    // generic stuff - called by other
    app.post('/receive', function(req, res){
    
        console.log("received json: %j", req.body);
        var name = req.body["message"];
        var content = self.service.parseContent(name, req.body["args"]);
        var q = self.getQueue(name);
        q.enqueue(content);
        self._error = null;

        res.setHeader('Content-Type', 'text/plain');
        res.send('ok');
    });

    // service-specific stuff
    this.service.init();
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


function PeerServiceHandler(comm, conf) {
    this.comm = comm;
    this.conf = conf;
    this.msgConfByName = {};
}

PeerServiceHandler.prototype.init = function() {
    var comm = this.comm;
   
    var msgs = this.conf.messages;
    var numMsgs = msgs.length;
    if ( numMsgs == 0) {
        console.log("no message-support declared.");
    }

    console.log("initialising service support for #%d messages ...", numMsgs);
    
    for (var i = 0; i< numMsgs; i++) {
        var msgConf = msgs[i];
        this.addMessageSupport(msgConf);
    }
}

PeerServiceHandler.prototype.addMessageSupport = function(msgConf) {
    var comm = this.comm;
    var app  = comm.app;
    var name = msgConf.id;
    console.log("adding message-support for %s", name);
    this.msgConfByName[name] = msgConf;
    
    app.use(function(req, res, next) {
        var pathSegments = req.url.split('/');
        if (pathSegments[1] == name) {
            var args = pathSegments.slice(2, pathSegments.length);
            comm.sendMessage({message: name, args: args});
            res.setHeader('Content-Type', 'text/plain');
            res.send('ok');
            return;
        }
        next();
    });

    app.get('/' + name + '-ack', function(req, res){
        var q = comm.getQueue(name);
        q.dequeue();
        console.log('ack @%03d => %j', q._ptr, q._crnt);

        res.setHeader('Content-Type', 'text/plain');
        res.send('ok');
    });
}

PeerServiceHandler.prototype.parseContent = function(name, args) {
    var content = {};
    var msgConf = this.msgConfByName[name];
    var argsConf = msgConf.args;
    for (var i=0; i<args.length;i++) {
        var argName = argsConf[i].id;
        content[argName] = args[i];
    }

    return content;
}
