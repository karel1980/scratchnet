/* Module implementing the central controller on localhost that manages
 *   the available services and active connections.
 */
'use strict';


var dir = require('../lib/dir'),
  conf = require('../lib/conf')(),
  comm = require('../lib/comm'),
  http = require('http'),
  expr = require('express'),
  path = require('path'),
  request = require('request')

var Manager = function(options, callback) {
    this.dir = dir({ includes: [ 'scratchnet' ] })

    // The http port for this manager, default 2000
    this.port = options.port || 2000

    this.name = options.name

    this.autoconnect = options.links || []

    // The initial services for this manager, default empty
    this.local_catalog = options.local_catalog || conf.getType('service');

    // start with an empty catalog
    this.catalog = {}

    this.links = {}

    this.app = expr()
    this.setupApp()

    this.invitations_in = {}
    this.invitations_out = {}
    this.notification_queue = []

    var self = this
    this.serviceListenCallback = function() {
        self.bind = server.address(); // register the port we're at
        console.log('Manager server started, registering %j', self.bind)
        var registration = self.dir.register(self.name, 'scratchnet', undefined, self.bind.port)
        self.id = registration.key
        self.polo_app = registration.app
        // we only register AFTER setting self.id
        self.dir.addListener(self)
        self.updateMasterId()
        // TODO: improvement: if we're master avoid the http call to self
        console.log('Point your browser to http://localhost:' + self.bind.port)
        self.advertise(self.local_catalog);

        if (callback) { callback(self.bind); }

        // Give it a second to process the catalog first
        setTimeout(function() {
          self.doAutoconnect();
        }, 1000)

    }
    var server = http.createServer(this.app);

    var names = [];
    for (var s in self.dir.services) {
      names.push(self.dir.services[s].name);
    }
    var baseName = self.name;
    var t = 1;
    while (names.indexOf(self.name) >= 0) {
      self.name = baseName + (t++)
    }
    server.listen(self.port, self.serviceListenCallback)
}

Manager.prototype.startAutoconnectDialog = function(spec, mngrInfo) {
    var otherId = this.dir.svcKey(mngrInfo)

    if (this.id <= this.otherId) {
      console.log("I will invite")
      this.invite(otherKey, spec.service)
    } else {
      console.log("The other will invite me")
    }

/*
    self.invite(bob.id, svc, function(invitation) {
    
        bob.accept(invitation.key, function(link) {
          //FIXME: improve this so the port numbers of the comms are shown as wel
          messages.push("Auto-connected "+link.from+" -- "+link.to+"--"+link.serv
        })
    });
*/
}

Manager.prototype.doAutoconnect = function() {
    // We loop through the array in reverse
    // order so we can delete from the array while looping
    // through it. 
    for (var i = this.autoconnect.length-1; i >= 0; i--) {
        var spec = this.autoconnect[i];
        for (var s in this.dir.services) {
            var svc = this.dir.services[s]
            if (svc.name == spec.to) {
                console.log("MATCH", svc, otherId, this.id)
                var otherId = this.dir.svcKey(svc)
                if (this.id <= otherId) {
                  console.log("I will invite", spec)
                  this.invite(otherId, spec.service)

                  // remove from autoconnect list so we don't try again every time
                  this.autoconnect.splice(i, 1)
                } else {
                  console.log("Waiting to be invited", spec)
                }
                break
            }
            //console.log("no candidate for autoconnect", spec)
        }
    }
}

// TODO: move this to a utility library?
// Input is an object and an optional function
// without a function the output is [ {key: key, value: value}, ... ]
// with a function the output is    [ {key: key, value: value, params: fn(key,value)}, ... ]
Manager.prototype.map2list = function(o, fn) {
  var a = Array()
  for (var p in o) {
    if (o.hasOwnProperty(p)) {
      var kv = {key:p, value: o[p]}
      if (fn) {
        kv.params = fn(p, o[p])
      }
      a.push(kv)
    }
  }
  return a;
}

Manager.prototype.setupApp = function() {
    var self = this;
    this.app.use(expr.bodyParser());
    this.app.use('/public', expr.static(path.join(__dirname, '..', 'public')));
    this.app.get('/data/services', function(req, res) {
        var svcList = self.map2list(self.dir.services,function(key, svc) {
            return {
              isMe: key === self.id,
              isMaster: key === self.masterId
            }
        });
        res.json(svcList)
    })
    this.app.get('/', function(req, res){
        var svcList = self.map2list(self.dir.services,function(key, svc) {
            return {
              isMe: key === self.id,
              isMaster: key === self.masterId
            }
        });
        res.render('index', {
          'services': svcList,
          'catalog': self.catalog
        });
    });

    // called by other manager
    // When I become master the old master should send me this:
    this.app.put('/catalog', function(req, res){
        self.catalog = req.body;
        res.send(self.catalog);
    });

    // called by other manager
    // New managers checking in should report this to me (when I'm the master)
    this.app.post('/advertise', function(req, res){

        var advertised = req.body;
        var notifyPeers = false;
        for (var key in advertised) {
           if (advertised.hasOwnProperty(key)) {
               if (!(key in self.catalog)) {
                   self.catalog[key] = advertised[key]
                   notifyPeers = true;
               }
           }
        }
        res.json(self.catalog);

        if (notifyPeers) {
           self.distributeCatalog();
        }
    });

    // called by other manager
    // Used to receive invitations from other instances
    this.app.post('/invite', function(req, res) {
      var invitation = req.body

      var invitor = self.dir.services[invitation.from]

      self.invitations_in[invitation.key] = invitation
      // TODO: Create ajax setup to poll for notifications
      self.notification_queue.push({ type: 'invitation', key: invitation.key})
      res.json({'ok':'ok'})
      
      //Figure out if we have an autoconnect for this invitation
      for (var i = self.autoconnect.length - 1; i >= 0; i--) {
        var auto = self.autoconnect[i];
        if (invitor.name === auto.to && invitation.service.id === auto.service) {
          console.log("auto-accepting invitation", auto, invitation.key)
          self.accept(invitation.key) // TODO: add callback?
          self.autoconnect.splice(i, 1)
        }
      }

    })

    // called by other manager
    // A call here means someone accepted our invitation
    this.app.post('/accepted', function(req, res) {
      var key = req.param('key')
      var bind = req.param('connect')
      var invite = self.invitations_out[key]

      // Since we're the initiator of this invitation we'll need
      // to start our comm and notify the other of the connection parameters
      invite.comm = self.createComm(invite.key, invite.service, function(connect) {
        self.links[key] = invite
        request.post({
          uri: self.uriFor(invite.to, '/notify-connect'),
          json: { key:invite.key, connect: connect }
        })
      })
      res.json({'ok':'I am staring a comm, I\'ll send you the connection params when it is ready'})
      //OK to do this in the callback above?
      //TODO TEST
    })

    // called by other manager
    // A call here means we receive the connection info which is the peer for our comm
    this.app.post('/notify-connect', function(req,res) {
      var key = req.param('key')
      var connect = req.param('connect')

      // TODO: @mpo what is the purpose of the id in setConnect?
      self.links[key].comm.setConnect(connect.host, connect.port, key)
    })

    // called by user (webui)
    // User wants to invite someone
    this.app.post('/do_invite', function(req,res){
      var other = req.param('other')
      var svcId = req.param('serviceId')
      self.invite(other, serviceId)
      request.post({
        uri: 'http://' + other + '/invite',
        json: { key: key }
      })

      res.json({ 'ok': 'Invitation sent' })
    })

    this.app.set('view engine', 'jade')
    this.app.set('layout', 'layout')
    //this.app.enable('view cache')
}

Manager.prototype.up = function(name, service) {
    this.updateMasterId()
    this.doAutoconnect()
}
Manager.prototype.down = function(name, service) {
    this.updateMasterId()
}
/**
 * when master changes, the old master sends the catalog to the new master
 * TODO: in case the old master died the new master gets no notification.
 * We can solve this by having everyone advertise to the new master
 * - if advertise comes before the sendCatalog it will be overwritten anyway
 * - if advertise comes after sendCatalog it will be ignored (if the catalog already contains the service)
 */
Manager.prototype.updateMasterId = function() {
    var oldMaster = this.masterId
    this.masterId = Object.keys(this.dir.services).sort()[0]

    // if I used to be the master and now I'm not anymore,
    // then send the catalog to the new master
    if (oldMaster && oldMaster === this.id && oldMaster !== this.masterId) {
        this.sendCurrentCatalog(this.masterId)
    }
}
Manager.prototype.isMaster = function(){
    if (this.id === undefined) {
      return false
    }
    return this.id === this.masterId
}

Manager.prototype.sendCurrentCatalog = function(targetId) {
  var svc = this.dir.services[targetId]

  var uri = 'http://' + svc.host + ':' + svc.port + '/catalog'
  console.log('sending catalog to new master at', uri)
  request.put({ uri: uri, json: this.catalog})
}

Manager.prototype.distributeCatalog = function() {
    if (!this.isMaster()) {
      // just a safety check
      return;
    }
    for (var id in this.dir.services) {
        if (id !== this.svcId) {
            var svc = this.dir.services[id]
            var uri = 'http://' + svc.host + ':' + svc.port + '/catalog'
            request.put({ uri: uri, json: this.catalog})
        }
    }
}

/**
 * Send our own services (from json on disk) to the master
 * In response we'll get a complete list (called the catalog)
 */
Manager.prototype.advertise = function(services) {
  var master = this.dir.services[this.masterId]
  // FIXME: get services from disk at startup, use here
  var uri = 'http://' + master.host + ':' + master.port + '/advertise'

  request.post({ uri:uri, json: services }, function(err, res, body) {
  })
}

/**
 * Sends out an invitation.
 * The callback is sent out once we're sure that the invitation was sent
 */
Manager.prototype.invite = function(otherId, serviceId, callback) {
    var self = this;
    console.log('Creating and sending invitation to ', otherId, 'for', serviceId)
    // TODO: add a random bit?
    var key = self.id + '--' + otherId + '--' + serviceId

    var invitation = {
      key: key,
      from: self.id,
      to: otherId,
      service: self.catalog[serviceId]
    }

    self.invitations_out[key] = invitation

    var uri = self.uriFor(otherId, '/invite')
    request.post({
      uri:uri,
      json: invitation
    }, function() {
      if (callback) {
        callback(invitation)
      }
    })
    return invitation;
}

/**
 * Utility function for constructing a uri to call on another manager
 */
Manager.prototype.uriFor = function(otherId, path) {
    var fields = otherId.split('#')
    var host = fields[1]
    var port = fields[2]

    return 'http://' + host + ':' + port + path
}

/**
 * Starts a comm and notifies other manager of acceptance
 */
Manager.prototype.accept = function(key, callback) {
   var invite = this.invitations_in[key]
   var uri = this.uriFor(invite.from, '/accepted')

   var self = this;

   // we accept an invitation. This means starting a comm, notifying
   // the initiator (post to /accepted/:key), and then setting the peer to whatever the
   // initial replies
   invite.comm = this.createComm(invite.key, invite.service, function(connect) {
     self.links[key] = invite;
     request.post({
       uri: uri,
       json: { key: key, connect: connect }
     }, function(err,incoming,res) {
       if (callback) {
         callback(invite)
       }
     })
   })

}

Manager.prototype.createComm = function(key, service, callback) {
  var comm_conf = {
    id: key,
    bind: undefined,
    connect: undefined,
    service: service
  }
  var self = this;
  var mycomm = comm(comm_conf, function(bind) {
    var connect = { host: self.polo_app.host, port: bind.port };
    if (callback) {
      callback(connect);
    }
  })
  return mycomm;
}

Manager.prototype.getLinks = function() {
  return this.links;
}

/**
 * Send back our link
 */

module.exports = function(options) {
  return new Manager(options || {});
}
