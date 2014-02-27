
var assert = require("assert")
var mngr = require('../lib/mngr.js')
var _ = require('underscore')

describe('mngr', function(){

  var mngr1 = mngr({ port: 2010, initial: { 'fruit': 'apple' }})
  var mngr2 = mngr({ port: 2011, initial: { 'animal': 'dog' }})
  var mngr3;

  it('should have the right master', function(done){
    setTimeout(function() {
      assert(mngr1.isMaster())
      assert(!mngr2.isMaster())
      mngr3 = mngr({ port: 2009, initial: { 'car': 'toyota' }})
      done()
    }, 500);
  })

  it('all managers should have a complete catalog', function(done){
    setTimeout(function() {
      assert(!mngr1.isMaster())
      assert(!mngr2.isMaster())
      assert(mngr3.isMaster())

      var keys = Object.keys({fruit:1,animal:1,car:1})
      _.isEqual(keys, Object.keys(mngr1.catalog))
      _.isEqual(keys, Object.keys(mngr2.catalog))
      _.isEqual(keys, Object.keys(mngr3.catalog))
      done()
    }, 1000)

  })

  it('should handle invitations like a boss', function(done){
    assert(false, "TODO: implement invitation tests")
  })

})
