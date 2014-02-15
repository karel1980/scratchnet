/* Module implementing a central directory of available manager instances on the network
 * Using autodiscovery the central (or distributed) directory is found and used to find available services and hook up to them 
 */


// TODO:
//   - hook up into the bigger picture
//   - should check who is the active dir in the network and proxy to that?

var http = require('http')
var polo = require('polo')

var Dir = function() {
  this.apps = polo()
  this.services = {}
  this.num = 0;

  var self = this;
  //
  // up fires everytime some service joins
  this.apps.on('up', function(name, service) {
      var key = service.name + "#" + service.host + "#" + service.port;
      console.log("Service joined: ", key)
      self.services[key] = service;
      self.num++;
      console.log(" # services: " + self.num)
  });

  // down fires everytime some service leaves
  this.apps.on('down', function(name, service) {
      var key = service.name + "#" + service.host + "#" + service.port;
      console.log("Service left: ", key)
      self.services[key] = service;
      self.num++;
      console.log(" # services: " + self.num)
  });
}

Dir.prototype.register = function(name, host, port) {
  this.apps.put({
    name: name,
    host: host,
    port: port
  })
}

module.exports = function() {
  return new Dir();
}
