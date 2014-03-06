

dir = require('../lib/dir.js')
var assert = require('assert')

var dir1 = dir({ includes: ['foo','bar'] })
var dir2 = dir({ includes: ['foo','bar'] })

dir1.register('testdir1', 'foo', 'localhost', 9001);
dir2.register('testdir2', 'bar', 'localhost', 9002);

describe('dir', function(){
  it('boths dirs should contain both services', function(){
    assert.equal(2, dir1.num);
    assert.equal(2, dir2.num);
  })
})
