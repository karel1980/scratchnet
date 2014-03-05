var path = require('path');
var fs = require('fs');

module.exports = function() {
    return new Configuration();
}

var Configuration = function() {
    this.conf = {};
    this.absPath = Configuration.absPath;
}


Configuration.absPath = function(rel) {
    return path.join(__dirname, '..', 'config', rel);
}

Configuration.loadFile = function(name) {
    return require(Configuration.absPath(name));
}

Configuration.loadConf = function(type, id) {
    return Configuration.loadFile(path.join(type, id + '.json'));
}

Configuration.loadType = function(type) {
    var typeFiles = fs.readdirSync(Configuration.absPath(type));
    var confType = {};
    for (var i=0; i<typeFiles.length; i++) {
        var file = typeFiles[i];
        var absFile = Configuration.absPath(path.join(type,file));
        if (fs.statSync(absFile).isFile()) { //only files
            var id = file.replace(/\.json$/,"");
            confType[id] = Configuration.loadConf(type, id);
        }
    }
    return confType;
}

Configuration.prototype.getType = function(type) {
    this.conf[type] = Configuration.loadType(type);
    return this.conf[type];
}

Configuration.prototype.get = function(type, id) {
    if (!this.conf[type] || !this.conf[type][id]) {
        var c = Configuration.loadConf(type, id);
        if (!this.conf[type]) {
            this.conf[type] = {};
        }
        this.conf[type][id] = c;
    }
    return this.conf[type][id];
}
