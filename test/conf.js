var conf = require('../lib/conf.js')();
var assert = require("assert");
var fs = require("fs");


describe('conf', function(){
    it('should load single config files', function(done){
        var serv = conf.get("service", "chat-service");
        console.log("loaded %j", serv);
        assert.ok(serv != null, "service not loaded/returned");
        assert.equal(serv.id, "chat-1.0", "expected different id" );
        done();
    });
  
    it('should load all service config files in service directory', function (done){
        var services = conf.getType("service");
        console.log("loaded %d services", Object.keys(services).length);
        assert.ok(services != null, "services not loaded/returned");
        var files = fs.readdirSync(conf.absPath("service"));
        assert.equal(Object.keys(services).length, files.length, "not all files were loaded?");
        done();
    });
})
