/* Module implementing the central controller on localhost that manages 
 *   the available services and active connections. 
 */


dir = require('../lib/dir')

var Manager = function() {
    this.dir = dir()
    this.services = {};
}

/**
 * Registers the given service with a dir, and starts looking for potential matches.
 * When a match is found it is reported to the service.
 */
Manager.prototype.link = function(svc) {
    //TODO
}

module.exports = function() {
  return new Manager();
}
