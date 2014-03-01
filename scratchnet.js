mngr = require('./lib/mngr')

var util = require('util');
// A bit silly to use an option parser since we ended up taking only regular args
var argv = require('optimist')
  .usage("Usage: $0 [port ...] [ port1:port2:service ] ...\n"+
      "When started without ports we just start a single empty instance on port 2000\n"+
      "When started with multiple ports we start multiple instances\n"+
      "When started with autoconnect specs (port1:port2:service) we will do just that.")
  .argv

var ports = {}
var autos = []

argv._.forEach(function(arg) {
  var fields = arg.split(":")

  if (fields.length == 1) {
    var port = Number(fields[0]) = true
    ports[Number(fields[0])] = true
  } else if (fields.length == 3) {
    var from = Number(fields[0])
    var to = Number(fields[1])
    var svc = fields[2]
    ports[from] = true
    ports[to] = true
    autos.push({
      from: from,
      to: to,
      svc: svc
    })
  } else {
    throw new Exception("argument has invalid format:", arg)
  }
})

if (Object.keys(ports).length == 0) {
  ports[2000] = true
}

for (p in ports) {
  if (ports.hasOwnProperty(p)) {
    ports[p] = mngr({ port: p})
  }
}

var messages = []
Object.keys(ports).forEach(function(p) {
    messages.push("Manager running on http://localhost:"+p)
})

autos.forEach(function(auto) {
 
  var dialog = function(alice,bob,svc) {
    console.log("connecting",alice.id,bob.id,svc)
    alice.invite(bob.id, svc, function(invitation) {
      bob.accept(invitation.key, function(link) {
        //FIXME: improve this so the port numbers of the comms are shown as well
        messages.push("Auto-connected "+link.from+" -- "+link.to+"--"+link.service.id)
      })
    })
  };
  
  // Delay the autoconnect dialog a bit so the auto-discovery has finished
  setTimeout(function() {
    dialog(ports[auto.from],ports[auto.to],auto.svc)
  }, 500)
  
})

// Added timeout so the output appears at the end (TODO: use manager callbacks and count down instead of timeout)
setTimeout(function() {
  messages.forEach(function(msg){
    console.log(msg)
  })
}, 1000)
