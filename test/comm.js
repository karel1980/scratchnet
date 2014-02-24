
comm = require('../lib/comm.js')
svc_chat = require('./resources/config/service/chat-service.json')

var assert = require("assert")

function testComm(id, port1, port2, service) {
  return comm({
    id: "alice",
    bind: "localhost:" + port1,
    connect: "localhost:" + port2,
    service: service
  })   
}

describe('comm', function(){
  it('should add messages to its queue', function(done){
    var alice = testComm("alice", 3333, 3334, svc_chat)
    var bob = testComm("bob", 3334, 3333, svc_chat)

    for (var i = 0; i < 5; i++) {
      alice.sendMessage({'message': 'send', 'args': [ "hi bob " + i ]})
      bob.sendMessage({'message': 'send', 'args': [ "hi alice " + i ]})
    }

    setTimeout( // send/receive is async, so just testing after a timeout
      function() {
        // FIXME:
        // Note: we're going under the hood here, actually we should verify the
        // result by getting /poll. (OTOH, relative merits of writing a bug-compatible
        // /poll response parser are debateable)
        for (var i = 0; i < 5; i++) {
          assert.equal("hi alice " + i, alice.queues['send'][String(i+1)]['msg'])
          assert.equal("hi bob " + i, bob.queues['send'][String(i+1)]['msg'])
        }
        done()
      },
      500
    )

  })
})
