
var assert = require('assert')
var mngr = require('../lib/mngr.js')
var _ = require('underscore')

describe('mngr', function(){

  var mngr1 = mngr({ port: 2010 })
  var mngr2 = mngr({ port: 2011 })
  var mngr3;
  var defaultCatalogSize = 0

  it('should have the right master', function(done){
    setTimeout(function() {
      assert(mngr1.isMaster())
      assert(!mngr2.isMaster())
      defaultCatalogSize = Object.keys(mngr1.catalog).length;
      
      mngr3 = mngr({ port: 2009, local_catalog: { 'car': 'toyota' }})
      done()
    }, 500);
  })

  it('all managers should have a complete catalog', function(done){
    
    setTimeout(function() {
      assert(!mngr1.isMaster())
      assert(!mngr2.isMaster())
      assert(mngr3.isMaster())

      console.log('catalog-keys = %j', Object.keys(mngr1.catalog) );
      console.log('catalog-size = %d', Object.keys(mngr1.catalog).length );
      assert.equal(Object.keys(mngr1.catalog).length, defaultCatalogSize + 1);
      var keys = Object.keys(mngr1.catalog).join();
      assert.ok(new RegExp('chat').test(keys));

      assert.equal(keys, Object.keys(mngr2.catalog).join());
      assert.equal(keys, Object.keys(mngr3.catalog).join());
      
      done()
    }, 1000)
  })

  it('should handle invitations like a boss', function(done){
    setTimeout(function() {
      assert.equal(0, Object.keys(mngr1.getLinks()).length)
      mngr1.invite(mngr2.id, 'chat', function(invitation) {
        mngr2.accept(invitation.key, function() {
          // the comms should now be started and linked
          assert.equal(1, Object.keys(mngr1.getLinks()).length)
          assert.equal(1, Object.keys(mngr2.getLinks()).length)

          // Would be nice to test the basic chat functionality here just to
          // make sure everything is wired together as it should be
          done()
        })
      })
    }, 500)
  })

})
