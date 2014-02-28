
comm = require('../lib/comm.js')
svc_chat = require('./resources/config/service/chat-service.json')

var assert = require("assert")

function testComm(id, service, started) {
  return comm({
    id: id,
    bind: {},
    service: service
  }, started)   
}

describe('comm', function(){
    it('should add messages to its queue', function(done){
        var count = 0;
        var alice, bob;
        var started = function() {
            count++;
            if (count == 2) { // only now both are started.
            
                // connect them 
                alice.setConnect("localhost", bob.bind.port, "bob");
                bob.setConnect("localhost", alice.bind.port, "alice");
                
                // send a message            
                for (var i = 0; i < 5; i++) {
                    alice.sendMessage({'message': 'send', 'args': [ "hi bob " + i ]});
                    bob.sendMessage({'message': 'send', 'args': [ "hi alice " + i ]});
                }

                // send/receive is async, so just testing after a timeout
                setTimeout( function() {
                    // FIXME:
                    // Note: we're going under the hood here, actually we should verify the
                    // result by getting /poll. (OTOH, relative merits of writing a bug-compatible
                    // /poll response parser are debateable)
                    for (var i = 0; i < 5; i++) {
                        assert.equal("hi alice " + i, alice.queues['send'][String(i+1)]['msg']);
                        assert.equal("hi bob " + i, bob.queues['send'][String(i+1)]['msg']);
                    }
                    done();
                  }, 500);
            }
        };
        
        alice = testComm("alice", svc_chat, started);
        bob = testComm("bob", svc_chat, started);
    });
  
    it('should allow downloading the scratch extension spec', function (done){
        done();
    });
})
