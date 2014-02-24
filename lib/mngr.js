/* Module implementing the central controller on localhost that manages 
 *   the available services and active connections. 
 */


dir = require('../lib/dir')
http = require('http')
expr = require('express')
request = require('request')

var Manager = function(options) {
    this.dir = dir({ includes: [ "scratchnet" ] })
    // The http port for this manager, default 2000
    this.port = options.port || 2000
    // The initial services for this manager, default empty
    this.initial = options.initial || {}

    // start with an empty catalog
    this.catalog = {}

    this.app = expr()
    this.setupApp()

    var self = this
    this.serviceListenCallback = function() {
        self.bind = server.address(); // register the port we're at
        console.log("Manager server started, registering %j", self.bind)
        self.id = self.dir.register('scratchnet', undefined, self.bind.port)
        // we only register AFTER setting self.id
        self.dir.addListener(self)
        self.updateMasterId()
        // TODO: improvement: if we're master avoid the http call to self
        self.advertise(self.initial)
    }
    var server = http.createServer(this.app);
    server.listen(self.port, self.serviceListenCallback)

}

// TODO: move this to a utility library?
Manager.prototype.map2list = function(o, fn) {
  var a = Array()
  for (p in o) {
    if (o.hasOwnProperty(p)) {
      kv = {key:p, value: o[p]}
      if (fn) {
        kv['params'] = fn(p, o[p])
      }
      a.push(kv)
    }
  }
  return a;
}

Manager.prototype.setupApp = function() {
    var self = this;
    this.app.use(expr.bodyParser());
    this.app.use("/public", expr.static(__dirname + '/../public'));
    this.app.get('/', function(req, res){
        var svcList = self.map2list(self.dir.services,function(key, svc) {
            return {
              isMe: key == self.id,
              isMaster: key == self.masterId
            }
        });
        res.render('index', {
          'services': svcList 
        });
    });

    // When I become master the old master should send me this:
    this.app.put('/catalog', function(req, res){
        self.catalog = req.body;
        res.send(self.catalog);
    });

    // New managers checking in should report this to me (when I'm the master)
    this.app.post('/advertise', function(req, res){
        var advertised = req.body;
        var notifyPeers = false;
        for (key in advertised) {
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

    this.app.set('view engine', 'jade')    // use .html extension for templates
    this.app.set('layout', 'layout')       // use layout.html as the default layout
    //this.app.enable('view cache')
}

Manager.prototype.up = function(name, service) {
    this.updateMasterId()
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
    if (oldMaster && oldMaster == this.id && oldMaster != this.masterId) {
        this.sendCurrentCatalog(this.masterId)
    }
}
Manager.prototype.isMaster = function(){
    if (this.id == undefined) {
      return false
    }
    return this.id == this.masterId
}

Manager.prototype.sendCurrentCatalog = function(targetId) {
  var svc = this.dir.services[targetId]

  var uri = 'http://' + svc.host + ':' + svc.port + '/catalog'
  console.log("sending catalog to new master at", uri)
  request.put({ uri: uri, json: this.catalog})
}

Manager.prototype.distributeCatalog = function() {
    if (!this.isMaster()) {
      // just a safety check
      return;
    }
    for (id in this.dir.services) {
        if (id != this.svcId) {
            var svc = this.dir.services[id]
            var uri = "http://" + svc.host + ":" + svc.port + "/catalog"
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
    // console.log("Master responsed to advertisement with ", body)
  })
}

module.exports = function(options) {
  return new Manager(options || {});
}
