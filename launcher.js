/*
 * The javascript being launched.
 *   Instantiates all componentens, organizes dependency injection
 */

// TODO
//  - rewrite to fit the discription
//  - foresee gradual step by step achievement of the goals through mocks and shortcuts


var path = require('path');
var dir = require('./lib/dir');
var comm = require('./lib/comm');

// TODO: is there a way to nicely handle CLI args in node? - then decide on ways to trigger
// for now we hardcode the 'config we need from a json file at ./test/launcher/comm-local-2001.json and ./test/launcher/comm-local-2002.json

var confId = Number(process.argv[2] || 2001);
var confFile = path.join(__dirname, 'test', 'launcher', 'comm-local-'+ confId + '.json');
var conf = require(confFile);

comm(conf);

/* 
 * Continuously print the number of registered services
 * (when you have 2 'node launcher.js' processes it should print '2')
 */
var mydir = dir();

mydir.register('hello-' + Math.random(), 'localhost', Number(confId));

var show = function() {
   console.log(mydir.services)
}

return;

