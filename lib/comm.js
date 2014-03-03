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
 * -2- for the scratch-block calls -- 
 * GET ./call/{message}{/args...} --> these get transferred to other side via POST ./receive
 * -3- for the scratch-system calls
 * GET ./poll
 * GET ./reset_all{?peer} -- optional peer param indicates transfered message: indicating peer was reset
 * -4- for the actual communication to the peer:
 * POST ./receive with json BODY containing the called message
 */

var path = require('path');
var util = require('util');
var http = require('http');
var expr = require('express');

var connect = require('connect');
var utils = connect.utils;

exports = module.exports = createCommunication;

// ----------------------------------------------------------------------------
// --
// --  Communication Framework
// --
/** 
 * Creates the communication and notifies the callback when service is started at port
 *   ! Exported as the Main Factory Function of this module.
 *
 * Elements of the config:
 *   - id       : The optional identifier of this side of the communication
 *   - bind     : The optional local bind specs (== portnumber to bind to, auto-allocated if not specified)
 *     - host     : The ip-address (if multiple ones) to bind to locally - defaults to all (ie 0.0.0.0)
 *     - port     : The port-number to bind to locally - defaults to random available pick
 *   - connect  : The bind specs of the peer to connect to. These are not required at create, and can later be set through setConnect(host, port, id)
 *     - host     : The remote ip-address to connect to
 *     - port     : The remote port to send messages to
 *     - id       : The (optional) identifier of the remote instance
 *     The bind and connect parameters can optionally be specified in one string host:port like "localhost:2002" or even "2002"
 *   - service  : The configuration object specifying the service to implement. See createServiceHandler()
 * The callback function should have this signature: fn(bind)
 *   Where bind holds the actual local connection-parameters (ip and port) after local startup.
 */
function createCommunication ( conf, callback) {
    return new Communication( conf, callback);
}

/**
 * Helper function parsing host:port strings into {host: "..", port: ..} structures
 */
function parseIpPort(ipport) {

    if (!ipport || typeof ipport != "string") {return ipport;}
    
    var parts = ipport.split(":")
    if (parts.length == 1) {
        parts[1] = parts[0];
        parts[0] = "127.0.0.1";
    }
    return {host: parts[0], port: Number(parts[1])};
}


/**
 * Actual constructor for the Communication object.
 * See exposed factory-method createCommunication() for usage and description of arguments
 */
function Communication(conf, callback) {
    this.id         = conf.id;
    this.bind       = parseIpPort(conf.bind);
    this.connect    = parseIpPort(conf.connect);
    this.service    = this.createServiceHandler(conf.service);
    
    this.app = expr();
    this.app.use(expr.bodyParser());

    this.init();
    this.start(callback);
}

/**
 * Report the TCP port this service is bound to. 
 * To be called after callback.
 */
Communication.prototype.getPort = function() {
    return this.bind.port;
}

/** 
 * Allow setting the connection peer after creation
 */
Communication.prototype.setConnect = function(host, port, id) {
    this.connect = {host: host, port: port, id: id};
}

/**
 * Creates the delegate service-handler object to handle the specific service protocol.
 *   - conf   : the specific service configuration 
 *     - type  : string indicating the type of protocol / service 
 *       ! further actual layout depends on this type - see the related constructor.
 *     - role   : the (optional) role this side of the communication is played in this service-protocol
 *       e.g. for request-response type protocols this could be "request" or "response"
 */
Communication.prototype.createServiceHandler = function (conf, role) {
    var srv;
    if (conf.type == "peer") {
        srv = new PeerServiceHandler(this, conf);
    } else if (conf.type == "request-response") {
        srv = new RequestResponseServiceHandler(this.comm, conf);
    } else {
        srv = null;
    }
    
    return srv;
}

/** 
 * Helper function implementing all required response-events in actual http communication to the connected peer.
 */
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

/**
 * Sends data (as json body) to peer using POST
 *   - opts
 *     - path   : path-part of the URI to call
 *   - data   : structure to be sent 
 */
Communication.prototype.sendToPeer = function(opts, data) { 
    var dataString = (!!data) ? JSON.stringify(data) : "";
    var headers = {
        'Content-Type': 'application/json',
        'Content-Length': dataString.length
    }
   
    utils.merge(opts, {host: this.connect.host, port: this.connect.port});
    utils.merge(opts, { method: "POST", headers: headers});
    
    var req = http.request(opts, ignoringResponse);
    req.on('error', function(err){
        console.log("  !! there was an error connecting to peer @%j: %s", this.connect, err.message);
    });
    req.write(dataString);
    req.end();
}

/** 
 * Sends reset message to peer
 */
Communication.prototype.sendReset = function() {
    console.log("transfer reset request");
    this.sendToPeer({ path: '/reset_all' });
}

/** 
 * Sends data to peer
 */
Communication.prototype.sendMessage = function(data) {
    console.log("sending %j", data);
    this.sendToPeer({ path: '/receive/'}, data );
}
 
/** 
 * Performs protocol-state-reset (typically triggered by GET or POST of /reset_all)
 */
Communication.prototype.reset = function() {
    console.log('<< reset >>');
    this.queues = {};
    this._error = null;
}

/** 
 * Gets the args queue for the "name"d message.
 * Note: Per message a queueu of received args is maintained.
 */
Communication.prototype.getQueue = function(name) {
    if (!this.queues[name]) {
        this.queues[name] = new Queue(name);
    }
    return this.queues[name];
}

/** 
 * Creates a queue for the message specified by name
 */
function Queue(name) {
    this._name = name;
    this._top = 0;
    this._ptr = 0;
    this._last = {};
    this._crnt = {};
}

/** 
 * Adds content to the queue.
 * Content should be a hashtable with the various recieved args
 */
Queue.prototype.enqueue = function (content) {
    this._last = content;
    if (this._ptr == this._top) this._crnt = content; // publish immediately!
    this._top++; // forces the 'available' boolean
    this[this._top] = content;
}

/**
 * Acks the reception of the oldest content in the queue, removes it, and advances the pointer to the next available message
 */
Queue.prototype.dequeue = function () {
    if (this._ptr < this._top) {
        delete this[this._ptr];
        this._ptr++; 
        this._crnt = this[this._ptr]; // advance to next - possibly last
    }
}

/**
 * Returns true if non-acked messages are in the queue
 */
Queue.prototype.hasNext = function () {
    return this._top > this._ptr;
}

/** 
 * Formats the content of the queue in a format suitable for delivery to scratch via the /poll request
 */
Queue.prototype.toPollString = function () {
    var name = this._name;
    var poll = "";
    poll += pollArgs( this._crnt, name + '-crnt-');
    poll += pollArgs( this._last, name + '-last-');
    poll += name + '-ptr '  + this._ptr  + '\n';
    poll += name + '-top '  + this._top  + '\n';
    poll += name + '-hasNext '  + this.hasNext() + '\n';
    return poll;
}


//------------ helper functions assembling 'poll' body
/** makes the ctring-value "safe"  for scratch - ie url-encode. but avoid spaces (even url-encoded ones) */
function pollSafe(s) {
    s = s || "";
    if (typeof s != "string") {return s;}
    s = decodeURIComponent(s);
    s = s.replace(/ /g, '_'); //Sadly the poll response does not properly support spaces.
    return encodeURIComponent(s);
}
/** adds the arguments in the set to the /poll format */
function pollArgs(set, pfx) {
    var poll = "";
    for (k in set) {
        poll += pfx + k + " " + pollSafe(set[k]) + '\n';
    }
    return poll;
}
/** adds all named queues in the qs (hashtable of queues) to the /poll format */
function pollQueues(qs) {
    var poll = "";
    for (var name in qs) {
        var q = qs[name];
        poll += q.toPollString();
    }
    return poll;
}

/**
 * Initializes the communication. Making it ready to be started.
 */
Communication.prototype.init = function() {
    
    this.reset();
    var self = this;
 
    var app = this.app;
    
    // called by scratch through GET - roughly 30 times per second
    app.get('/poll', function(req, res){
        var poll = '';
        poll += pollQueues(self.queues);
        if (!!self._error) {
            poll += '_error ' + self._error + '\n';
        }
        
        res.setHeader('Content-Type', 'text/plain');
        res.send(poll);
    });

    // called by scratch through GET - when STOP is pressed
    // called by other side through POST - when other side is resetting
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


    // generic stuff - called by flash to allow usage in online editor
    app.get('/crossdomain.xml', function(req, res){
    
        console.log("request for xdomain-config");
        var xdomfile = path.join(__dirname,'..','public','comm','crossdomain.xml');
        res.sendfile(xdomfile);
    });


    // generic stuff - called by flash to allow usage in online editor
    app.get('/extension', function(req, res){

        console.log("request for block-spec file");
        var spec = {};
        if (self.service && self.bind && self.bind.port && self.connect ) {
            spec = self.service.makeScratchExtensionSpec(self.bind.port, self.connect.id);
        }

        res.setHeader('Content-Disposition', 'attachement; filename=' + spec.filename);
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(spec.extension));
    });

    // now configure service-specific stuff
    this.service.init();
}

/** 
 * Starts the communication effectively by locally binding to the tcp/ip stack.
 * After effective start the callback function is called to report the local address (ip and tcp port) to the local address
 */
Communication.prototype.start = function( callback) {
    if (!this.bind ) {
        this.bind = {port: 0};  // if you don't have a preferred port choose 0 to allow the system to allocate one
    }
    var self = this;
    var server = http.createServer(this.app);
    server.listen(this.bind.port, function() {
        self.bind = server.address(); // register the port we're at
        console.log("service connected on %j", self.bind);
        if ( callback ) {
            callback(self.bind);
        }
    });    
}
// --
// ----------------------------------------------------------------------------



// ----------------------------------------------------------------------------
// --
// --  Various Helper Functions
// -- 
/**
 *  Creates "safe" names to use in Scratch-Extension-BlockSpecs.
 */
function specName(name, parm) {
    parm = parm || "";
    return util.format(name, parm).trim().replace(/[.+-]/g,"_").replace(/[^ _0-9a-zA-Z]/g, "");
}


// ----------------------------------------------------------------------------
// --
// --  Various Service Handler Implementations
// -- 
// --      -- PeerServiceHandler -------------------------------------------
// -- 
/**
 * Service Handler for Protocols between peers (equal sides) 
 */
function PeerServiceHandler(comm, conf) {
    this.comm = comm;
    this.conf = conf;
    this.msgConfByName = {};
}

/** 
 * Initializes the specific service-handling support in the setup of the communication.
 * Called during comm-initialization.
 */
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

/** 
 * Adds support for one message.
 * Called during initialization.
 */
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

/**
 * Helps interpreting the content-args received by the parent communication object
 */
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


/** 
 * Helps producing the block-specs in the scratch-extension-spec
 */
PeerServiceHandler.prototype.addScratchBlockSpecsForMessage = function(blocks, name, msgConf, remoteid) {
    //add msgblock
    var msgName = msgConf.name || name;
    var msgArgs = msgConf.args;
    var blockName = specName(msgName, remoteid);
    for (var i = 0; i< msgArgs.length; i++) {
        blockName += " %s";
    }
    var msgBlock = [" ", blockName, name];
    for (var i = 0; i< msgArgs.length; i++) {
        msgBlock.push(msgArgs[i].id);
    }
    blocks.push(msgBlock);
        
    //add args-reporterblocks
    for (var i=0; i<msgArgs.length; i++) {
        var arg = msgArgs[i];
        //add args-crnt
        var argCrntName = arg.queue.crnt;
        if (argCrntName) {
            blocks.push(["r", specName(argCrntName,remoteid), name + "-crnt-" + arg.id]);
        }
        //add args-top
        var argLastName = arg.queue.last || arg.id;
        blocks.push(["r", specName(argLastName,remoteid), name + "-last-" + arg.id]);
    }

    if (msgConf.queue) {
        //add ackblock
        var ackName = msgConf.queue.ack;
        if (!!ackName) {
            blocks.push([" ", specName(ackName, remoteid), name+ "-ack"]);
        }
        //add ptr reporterblock
        var ptrName = msgConf.queue.ptr;
        if (!!ptrName) {
            blocks.push(["r", specName(ptrName, remoteid), name+ "-ptr"]);
        }
        //add top reporterblock
        var topName = msgConf.queue.top;
        if (!!topName) {
            blocks.push(["r", specName(topName, remoteid), name+ "-top"]);
        }
        //add boolean indicator reporterblock
        var hasnextName = msgConf.queue.hasnext;
        if (!!hasnextName) {
            blocks.push(["b", specName(hasnextName, remoteid), name+ "-hasNext"]);
        }
    }
    
    
}

/**
 * Produces the sratch-extension-spec structure associated to this service
 */
PeerServiceHandler.prototype.makeScratchExtensionSpec = function(localport, remoteid) {
    var spec = {};

    spec.filename = util.format("ext-%s-%s.s2e", this.conf.id, remoteid);
    spec.extension = {
        "extensionName": specName(this.conf.name, remoteid),
        "extensionPort": localport,
        "blockSpecs": []
    };
    
    var self = this;
    var msgConfs = this.msgConfByName
    Object.keys(msgConfs).forEach(function(name) {
        self.addScratchBlockSpecsForMessage(spec.extension.blockSpecs, name, msgConfs[name], remoteid);
    });

    return spec;
}



// -- 
// --      -- RequestResponseServiceHandler ---------------------------------
// -- 
/**
 * Service Handler for Protocols between request-response sides
 */
function RequestResponseServiceHandler(comm, conf) {
    this.comm = comm;
    this.conf = conf;
    this.msgConfByName = {};
}

/** 
 * Initializes the specific service-handling support in the setup of the communication.
 * Called during comm-initialization.
 */
RequestResponseServiceHandler.prototype.init = function() {
    var comm = this.comm;
   
}

/** 
 * Adds support for one message.
 * Called during initialization.
 */
RequestResponseServiceHandler.prototype.addMessageSupport = function(msgConf) {
    var comm = this.comm;
    var app  = comm.app;
    var name = msgConf.id;
}

/**
 * Helps interpreting the content-args received by the parent communication object
 */
RequestResponseServiceHandler.prototype.parseContent = function(name, args) {
    var content = {};

    return content;
}


/** 
 * Helps producing the block-specs in the scratch-extension-spec
 */
RequestResponseServiceHandler.prototype.addScratchBlockSpecsForMessage = function(blocks, name, msgConf, remoteid) {
    //add msgblock
}

/**
 * Produces the sratch-extension-spec structure associated to this service
 */
RequestResponseServiceHandler.prototype.makeScratchExtensionSpec = function(localport, remoteid) {
    var spec = {};

    return spec;
}
// --
// ----------------------------------------------------------------------------

