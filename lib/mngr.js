/* Module implementing the central controller on localhost that manages 
 *   the available services and active connections. 
 */


dir = require('../lib/dir')
http = require('http')
expr = require('express')

var Manager = function(port) {
    this.dir = dir()
    this.services = {}
    this.port = port

    this.app = expr()
    this.setupApp()

}

// TODO: is there a better way in mustache?
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
    this.app.get('/', function(req, res){
        var masterId = self.getMasterId()
        var svcList = self.map2list(self.dir.services,function(key, svc) {
            return {
              isMe: key == self.svcId,
              isMaster: key == masterId
            }
        });
        res.render('index', {
          'services': svcList 
        });
    });

    this.app.set('view engine', 'mustache')    // use .html extension for templates
    this.app.set('layout', 'layout')       // use layout.html as the default layout
    //this.app.enable('view cache')
    this.app.engine('mustache', require('hogan-express'))

    var server = http.createServer(this.app);
    server.listen(self.port, function() {
        self.bind = server.address(); // register the port we're at
        console.log("Manager server started, registering %j", self.bind);
        self.svcId = self.dir.register('scratchnet', undefined, self.bind.port)
    });    
}

/**
 * FIXME masterId should be a property of mngr which is
 * updated whenever a polo event occurs
 *
 * TODO: when master changes, everybody advertises his services to the master
 */
Manager.prototype.getMasterId = function() {
  return Object.keys(this.dir.services).sort()[0]
}

/**
 * Send a list of communication configs to the master,
 * Used to advertise our own configured services (from json on disk)
 *
 * In response we'll get an updated list
 */
Manager.prototype.advertise = function(configs) {
  //TODO: send a POST to /advertise on master
  //
  //TODO: implement app.post('/advertise')
  //This method will redistribute the complete catalog to all peers
  //by using a PUT on /catalog (optimisation: only when necessary)
}

module.exports = function(port) {
  return new Manager(port);
}
