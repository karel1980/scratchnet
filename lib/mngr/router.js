'use strict';

var exports = module.exports = {
    create: function (mngr) {
        return {
            data: {
                instances: function(req, res) {
                    res.json(mngr.dir.services)
                }
            },
            index: function(req, res){
                res.render('index', {})
            },
            handleCatalog: function(req, res) {
                mngr.handleCatalog(req.body)
                res.send(mngr.catalog);
            },
            handleAdvertise: function(req, res){
                mngr.handleAdvertise(req.body);
                res.json(mngr.catalog);
            },
            handleInvitation: function(req, res) {
                mngr.handleInvitation(req.body)
                res.json({'ok':'ok'})
            },
            handleAcceptance: function(req, res) {
                mngr.handleAcceptance(req.param('key'), req.param('connect'))
                res.json({'ok':'I am staring a comm, I\'ll send you the connection params when it is ready'})
            },
            handleConnectNotification: function(req, res) {
                mngr.handleConnectNotification(req.param('key'), req.param('connect'))
            },

            // calls from web-ui
            doSendInvitation: function(req, res) {
                mngr.sendInvitation(req.param('other'), req.param('serviceId'))
                res.json({ 'ok': 'Invitation sent' })
            }
        }
    }
}


