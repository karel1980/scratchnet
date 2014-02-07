Component Overview
==================

- Master Directory and Discovery (possibly in distributed implementation)
- Service Connector & Enabler
- Service Editor & Provisioning
- Communication Service

## Contracts and responsibilities

Building up the complete system from the bottom up.
Describing the service contracts each of these components should build up.


### Actual Communication Service Instance

Based on a config file describing:
* connection details of local ports and connectin peer (ip/hostname + port)
* the messaging layout to support (messages, arguments, reported states)

.. it is the responsibility of this component to enable the actual communication and implement the extension hook towards scratch.

To this purpose this service will open 
* a communication channel to the actual assigned peer
* a separate local port on which it communicates through HTTP with 
    * the local user for debug/inspection purposes (/admin >> UI)
    * the local scratch instance for implementation of both 
        * the standard scratch contract (/poll /reset_all)
        * the actual configured messaging service

Since these last aspects can be shut off to only localhost - the protocol binding could be on 127.0.0.1 (disabling messages from outside)

However, that will force to use another communication mechanism (sockets) to actually receive/send the messages to/from the connected peer.


#### Communication Interface
1. Assuming HTTP
POST /receive/:msg 

? should sender provide sequence-number for extra check
? TODO solve space-sending issue

1. Assuming socket/different mechanism
TODO: decide, describe...


#### Admin Interface
1. GET /admin 
returns HTML service-home page with links to following:

if available: a link-back to the service-enabler-service (see further)

1. GET /admin/debug
retruns HTML page that regularly (in auto mode) or upon request (in manual mode)  show the return of the /poll request

1. POST /admin/reset
trigger scratch reset message

1. POST /admin/disconnect
closes down the service

1. GET /admin/extension-{name}.json
produces the generated scratch-extension-service.json


#### Scrath Interface

1. GET /poll

TODO: body describing state vars, wait ids, communication vars, erros,...


1. GET /reset_all



1. GET /{signal_xyz}/:{arg0}/:{arg1}/...


### Local Service Editor

TODO: flesh out some more

Gerenal idea: a single page js-UI component that allows editing the essential elements of the actual communication-config elements.

Have to give it some more thought, but seems to be set of
* abstract service name
* messages/signals to communicate and their arguments


### Local Service Connector and Enabler

This service will allow to 
* be inspected: reporting and transferring its communication scheme
* accept a communication peer (only one)
* instantiate/create the actual communication service instance
* heartbeat-check its connected peer
* report its connection status (peer identification and heartbeat status)



### Centralised (or distributed) Directory and Discovery

Using polo we could build a central directory listing all available local node-isntances and the services they offer + are looking for connecting-peers?



