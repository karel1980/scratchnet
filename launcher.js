/*
 * The javascript being launched.
 *   Reads minimal CLI args (with sensible defaults) and loads associated config jsons
 *   Instantiates all componentens, organizes dependency injection
 */

// TODO
//  - foresee gradual step by step achievement of the goals through mocks and shortcuts


var path = require('path');
var http = require('http');
var expr = require('express');
var connect = require('connect');
var utils = connect.utils;

var dir = require('./lib/dir');
var comm = require('./lib/comm');



function _loadConf (type, id) {
    var file = path.join(__dirname, 'config', type, id + '.json');
    return require(file);
}
var show = function() {
   console.log(mydir.services)
}



// TODO: is there a way to nicely handle CLI args in node? 
// for now we hardcode the 'config we need from a json file at ./test/launcher/comm-local-PORTNUMBER.json 

var id = process.argv[2];
var conf = _loadConf('launcher', (id || "me"));

conf.id = conf.id || id;
id = conf.id;
conf.port = Number(conf.port || 2000);

var app = expr();
app.get("/_id", function(req, res ) {
    res.setHeader('Content-Type', 'text/plain');
    res.send(id);
});


/* 
 * Continuously print the number of registered services
 * (when you have 2 'node launcher.js' processes it should print '2')
 */
var mydir = dir();

mydir.register('hello-' + Math.random(), 'localhost', conf.port);



//TODO - for now, creation of comms and services should probably be delegated to the mngr component
var services = {};
for (var i = 0; i<conf.services.length; i++) {
    var serv = conf.services[i];
    servConf = _loadConf("service", serv);
    servConf.id = servConf.id || serv;
    services[servConf.id] = servConf;
}
conf.services = services; // replace

for (commId in conf.comms) {
    var commConf = conf.comms[commId];
    commConf.id = commConf.id || commId;
    commConf.service = services[commConf.service];
    comm(commConf); // create and activate communciation-connections
}
// -- end of stuff to move to mngr?

app.listen(conf.port);    
console.log("["+id+"] launched on port : "+conf.port);

return;

