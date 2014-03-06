var mngr = require('./lib/mngr'),
  util = require('util'),
  conf = require('./lib/conf')();

// Parse arguments
var argv = require('minimist')(process.argv.slice(2))

// Handle -c
var launchConf = conf.get('launcher', argv.c || 'me')
// Handle -n
launchConf.name = argv.n || launchConf.name
// Handle -p
launchConf.port = argv.p || launchConf.port

launchConf.links = launchConf.links || []

if (!launchConf.name) {
    throw Error("Name is missing from launch configuration. This is required (for now)")
}

var myMngr = mngr(launchConf)
