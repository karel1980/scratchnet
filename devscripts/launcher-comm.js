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
var conf = require('./lib/conf')();

//-------------   MAIN LAUNCHER PROCESSING ------------

// CLI Parsing
var id = process.argv[2] || "me";

var launch_conf = conf.get('launcher', id)

//  -- note conf.port could be forced to 0 (not null) to request random port allocation
launch_conf.port = Number(launch_conf.port != null ? launch_conf.port : 2000); 

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
launch_conf.services.forEach(function(name) {
  svc = conf.get("service", name)
  services[svc.id] = svc
})
// replace
launch_conf.services = services;

// Instantiate persisted - hardwired communication-links
console.log(JSON.stringify(launch_conf))
for (commId in launch_conf.comms) {
    var commConf = launch_conf.comms[commId];
    commConf.id = commConf.id || commId;
    commConf.service = services[commConf.service];
    comm(commConf); // create and activate communciation-connections
}

// Fire up the service
launch_conf.port = launch_conf.port || 0; // if you don't have a preferred port choose 0 to allow the system to allocate one

var server = http.createServer(app);
server.listen(launch_conf.port, function() {
    var address = server.address();
    launch_conf.port = address.port;
    console.log("[%s] launched on %j", id, address);
});

return;

