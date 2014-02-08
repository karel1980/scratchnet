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

function createCommunication (conf) {
    return new Communication(conf);
}

function parseIpPort(ipport) {
  var parts = ipport.split(":")
  if (parts.length == 1) {
    parts[1] = parts[0];
    parts[0] = "127.0.0.1";
  }
  return {host: parts[0], port: parts[1]};
}

function makeProtoStrategy(proto){
    // TODO 
    // - actually make strategy object to handle communication based on type
    // - and allow for more complicated message-layouts (more arguments)
    // - consider posting json over HTTP (in the body) or using socket.io
    return proto;
}

function makeServiceStrategy(srv) {
    // TODO 
    return srv;
}

function Communication( conf, express) {
    this.bind    = parseIpPort(conf.bind);
    this.connect = parseIpPort(conf.connect);
    this.protocol = makeProtoStrategy(conf.protocol);
    this.service = makeServiceStrategy(conf.service);
    
    this.app = expr();

    this.init();
    this.start();
}

Communication.prototype.init = function() {
    console.log("bind     - " + this.bind.host +    " : " + this.bind.port);
    console.log("connect  - " + this.connect.host + " : " + this.connect.port);
    
    var connect = this.connect;
    
    
    function sendToPeer(msg) {
        console.log("sending " + msg);
        
        //TODO use protocol-strategy in stead.
        var options = {
            path: '/receive/' + encodeURIComponent(msg)
        };
        utils.merge(options, connect);
        
        callback = function(response) {
            var str = '';
            //another chunk of data has been recieved, so append it to `str`
            response.on('data', function (chunk) {
                str += chunk;
            });
            //the whole response has been recieved, so we just print it out here
            response.on('end', function () {
                console.log("completed sending");
                console.log("response was " + str);
                // we don't really care about the response
            });
            //what if there is an error?
            response.on('error', function(err){
                console.log("there was an error communicating to peer..: " + err.message);
            })
        }

        var req = http.request(options, callback)
        req.on('error', function(err){
            console.log("there was an error communicating to peer..: " + err.message);
        })
        req.end();
    }
    
    var queue = {};
    var top = 0;
    var ptr = 0;
    var last = "";
    var line = "";
    
    //
    // called by scratch 
    //
    this.app.get('/send/:msg', function(req, res){
        var msg = req.param('msg');
        sendToPeer(msg);
        res.setHeader('content-type', 'text/plain');
        res.send('ok');
    });

    this.app.get('/next', function(req, res){
        if (ptr < top) {
            delete queue[ptr];
            ptr++; 
            line = queue[ptr];
            console.log('next-line = ' + line);
        }
        res.setHeader('content-type', 'text/plain');
        res.send('ok');
    });

    this.app.get('/poll', function(req, res){
        var poll = '';
        poll += 'line ' + line + '\n';
        poll += 'last ' + last + '\n';
        poll += 'ptr '  + ptr  + '\n';
        poll += 'top '  + top  + '\n';
        //poll += 'hasNext '  + (top != ptr)  + '\n';
        
        res.setHeader('content-type', 'text/plain');
        res.send(poll);
    });


    //
    // called by other
    //
    this.app.get('/receive/:msg', function(req, res){
        var msg = req.param('msg')
        console.log("received " + msg);
        last = msg;
        top++;
        queue[top] = msg;

        res.setHeader('content-type', 'text/plain');
        res.send('ok');
    });

}

Communication.prototype.start = function(app) {
    this.app.listen(this.bind.port);    
}



