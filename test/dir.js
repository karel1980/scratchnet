

dir = require('../lib/dir.js')
var assert = require("assert")

var dir1 = dir()
var dir2 = dir()

dir1.register('foo', 'localhost', 9001);
dir2.register('bar', 'localhost', 9002);

describe('dir', function(){
  it('boths dirs should contain both services', function(){
    assert.equal(2, dir1.num);
    assert.equal(2, dir2.num);
  })
})
