

dir = require('../lib/dir.js')
var assert = require("assert")

var dir1 = dir.dir()
var dir2 = dir.dir()

dir1.register('foo', 'localhost', 9001);
dir2.register('bar', 'localhost', 9002);

describe('dir', function(){
  describe('#register()', function(){
    it('should contain both services', function(done){
      assert.equal(2, dir1.services.length);
      assert.equal(2, dir2.services.length);
      setTimeout(2000, done);
    })
  })
})
