var http = require('http');
var util = require('util');
var comm = require('../lib/comm.js')
var services = {};
services.chat = require('./resources/config/service/chat-service.json')

var assert = require('assert')

function createTestComm(id, service, started) {
  return comm({ id: id, service: service }, started);
}

function getRequest(port, path, done) {
    http.request({host: 'localhost', port: port, path: path}, function (response){
        var content = '';
        response.on('data', function (chunk) {
            content += chunk;
        });
        response.on('end', function () {
            if (done) {
                done(response, content);
            }
        });
        response.on('error', function(err){
            console.log('  !! there was an error communicating to peer..: %s', err.message);
        })
    }).on('error', function(err){
        console.log('  !! there was an error communicating to peer..: %s', err.message);
    }).end();
}


describe('comm', function(){
    it('should add messages to its queue', function(done){
        var count = 0;
        var alice, bob;
        var started = function() {
            count++;
            if (count == 2) { // only when both are started.
            
                // connect them up
                alice.setConnect('localhost', bob.bind.port, bob.id);
                bob.setConnect('localhost', alice.bind.port, alice.id);
                
                function sendHiFrom(comm, i) {
                    var msg = encodeURI(util.format('hi %s %d', comm.connect.id, i));
                    getRequest(comm.bind.port, '/send/' + msg);
                }
                
                // send messages hence and forth           
                for (var i = 0; i < 5; i++) {
                    sendHiFrom(alice, i);
                    sendHiFrom(bob, i);
                }

                function assertHiAt(comm, i) {
                    var expectMsg = util.format('hi_%s_%d', comm.id, i);
                    getRequest(comm.bind.port, '/poll', function(resp, data){
                        var lines = data.split('/n');
                        for (var i=0; i<lines.length; i++) {
                            var line = lines[i].split(' ');
                            if (line[0] == 'send-msg-crnt') {
                                assert.equal(expectMsg, line[1]);
                            }
                        }
                    });
                    getRequest(comm.bind.port, '/send-ack');
                }
                
                // send/receive is async, so just testing after a timeout
                setTimeout( function() {
                    for (var i = 0; i < 5; i++) {
                        assertHiAt(alice, i);
                        assertHiAt(bob, i);
                    };
                    done();
                }, 500);
            }
        };
        
        alice = createTestComm('alice', services.chat, started);
        bob   = createTestComm('bob', services.chat, started);
    });
  
    it('should allow downloading the scratch extension spec', function (done){
        var me = createTestComm( 'me', services.chat, function() {
            var port = me.bind.port;
            me.setConnect('localhost', port, me.id); // only connected service returns extension
            getRequest(port, '/extension', function(resp, data) {
                console.log('data == %s', data);
                console.log('resp.headers == %j', resp.headers);
                
                assert.equal('application/json', resp.headers['content-type']);
                var cdh = resp.headers['content-disposition']
                assert('extension uri uses content-disposition', cdh && cdh.match(/attachment; filename=.*\.s2e/));
                
                assert('extension spec received', data != null && data.length);
                var spec = JSON.parse(data);
                assert('extension spec is parseable object', spec && Object.keys(spec).length);

                assert('spec has extensionName', spec.extensionName && spec.extensionName.length);
                assert.equal(port, spec.extensionPort);
                assert('spec has blockSpecs', spec.blockSpecs && spec.blockSpecs.length);
                
                done();
            });
        });
    });
})
