
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
    var comm1 = testComm("alice", 3333, 3334, svc_chat)
    var comm2 = testComm("bob", 3334, 3333, svc_chat)

    for (var i = 0; i < 5; i++) {
      comm1.sendMessage({'message': 'send', 'args': [ "value" + i ]})
    }

    setTimeout( // comm2 receives in another thread, so using timeout
      function() {
        // FIXME:
        // Note: we're going under the hood here, actually we should verify the
        // result by getting /poll. (OTOH, relative merits of writing a bug-compatible
        // /poll response parser are debateable)
        for (var i = 0; i < 5; i++) {
          assert.equal("value" + i, comm2.queues['send'][String(i+1)]['msg'])
        }
        done()
      },
      500
    )

  })
})
