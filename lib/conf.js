
path = require('path')

module.exports = function() {
  return new Configuration()
}

var Configuration = function() {
  this.conf = {}
}

Configuration.prototype.get = function(type, id) {
  if (!this.conf[type] || !this.conf[type][id]) {
    var c = this._loadConf(type, id);
    if (!this.conf[type]) {
      this.conf[type] = {}
    }
    this.conf[type][id] = c;
  }
  return this.conf[type][id];
}

/** 
 * convenience method to load json-config locally stored per type.
 */
Configuration.prototype._loadConf = function(type, id) {
    var file = path.join(__dirname, '..', 'config', type, id + '.json');
    return require(file);
}

