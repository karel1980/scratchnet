/*
 * The javascript being launched.
 *   Reads minimal CLI args (with sensible defaults) and loads associated config jsons
 *   Instantiates all componentens, organizes dependency injection
 */

var path = require('path');
var http = require('http');
var expr = require('express');

var dir = require('./lib/dir');
var comm = require('./lib/comm');



/** 
 * convenience method to load json-config locally stored per type.
 */
function _loadConf (type, id) {
    var file = path.join(__dirname, 'config', type, id + '.json');
    return require(file);
}

//-------------   MAIN LAUNCHER PROCESSING ------------

// CLI Parsing
var id = process.argv[2];

var conf = _loadConf('launcher', (id || "me"));
conf.id = conf.id || id;
id = conf.id;

//  -- note conf.port could be forced to 0 (not null) to request random port allocation
conf.port = Number(conf.port != null ? conf.port : 2000); 


//-------------
//TODO - all below is for now, most of it should probably end up inside the manager component


// Create express APP.
var app = expr();

// Publish own id over http
app.get("/_id", function(req, res ) {
    res.setHeader('Content-Type', 'text/plain');
    res.send(id);
});

// Read local services from conf
var services = {};
for (var i = 0; i<conf.services.length; i++) {
    var serv = conf.services[i];
    servConf = _loadConf("service", serv);
    servConf.id = servConf.id || serv;
    services[servConf.id] = servConf;
}
conf.services = services; // replace

// Instantiate persisted - hardwired communication-links
for (commId in conf.comms) {
    var commConf = conf.comms[commId];
    commConf.id = commConf.id || commId;
    commConf.service = services[commConf.service];
    comm(commConf); // create and activate communciation-connections
}

// Fire up the service
conf.port = conf.port || 0; // if you don't have a preferred port choose 0 to allow the system to allocate one
var server = http.createServer(app);
server.listen(conf.port, function() {
    var address = server.address();
    conf.port = address.port;
    console.log("[%s] launched on %j", id, address);
});

return;

