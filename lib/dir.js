/* Module implementing a central directory of available manager instances on the network
 * Using autodiscovery the central (or distributed) directory is found and used to find available services and hook up to them
 */


// TODO:
//   - hook up into the bigger picture
//   - should check who is the active dir in the network and proxy to that?
//
'use strict';

var http = require('http')
var polo = require('polo')

var Dir = function(options) {
  options = options || {}
  this.apps = polo()
  this.services = {}
  this.num = 0
  this.includes = options.includes
  this.listeners = options.listeners || []

  var self = this;
  //
  // up fires everytime some service joins
  this.apps.on('up', function(name, service) {
      if (self.includes && self.includes.indexOf(name) < 0) {
          return
      }
      var key = self.svcKey(service)
      self.services[key] = service;
      self.num++;
      for (var l in self.listeners) {
          self.listeners[l].up(name, service)
      }
  });

  // down fires everytime some service leaves
  this.apps.on('down', function(name, service) {
      if (self.includes && self.includes.indexOf(name) < 0) {
          return
      }
      var key = service.name + '#' + service.host + '#' + service.port;
      //console.log('Service left: ', key)
      self.services[key] = service;
      self.num++;
      for (var l in self.listeners) {
          self.listeners[l].down(name, service)
      }
  });

  this.apps.on('error', function() {
        console.log('error in network discovery lib - is there any network interface active?');
  });
}

Dir.prototype.svcKey = function(svc) {
  return [svc.name, svc.host, svc.port].join('#')
}

Dir.prototype.addListener = function(listener) {
  this.listeners.push(listener)
}

Dir.prototype.register = function(name, host, port) {
  var params = {
    name: name,
    port: port
  };
  if (host !== undefined) {
    params.host = host;
  }
  var app = this.apps.put(params)
  return {key:this.svcKey(app), app:app}
}

module.exports = function(options) {
  return new Dir(options);
}
