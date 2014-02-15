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
  this.services = []

  var self = this;
  // up fires everytime some service joins
  this.apps.once('up', function(name, service) {
      self.services.push({ name: name, service: service})
  });
}

Dir.prototype.register = function(name, host, port) {
  this.apps.put({
    name: name,
    host: host,
    port: port
  })
}

module.exports.dir = function() {
  return new Dir();
}
