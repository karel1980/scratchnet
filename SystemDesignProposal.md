# System Design / Component Breakdown

## Component Overview

The system should be split up in the following separate levels of respoinsibility

- [dir] Master Directory and Discovery (possibly in distributed implementation)
- [mngr] Service Connector & Enabler
- [editor] Service Editor & Provisioning
- [comm] Communication Service


## Contracts and responsibilities

The interplay of things is such

| client (asks) | service          | (to perform) actions |
| ------------- | ---------------- | ---------------------|
| mngr          | dir(@discovered) | retrieve a list of available (other) managers and their listed services / connection opportunities |
| mngr          | editor           | retrieve list of available service definitions |
| mngr          | mngr(@peer)      | exchange connection params (ip/ports) during connection setup leading to comm creation |
| mngr          | comm             | instantiation (not a real service call) |
| browser       | mngr             | deploy services (using service defintions) and connect to others |
| browser       | mngr             | download *.s2e definition file associated to established connection |
| browser       | editor           | create service definitions |
| browser       | comm             | debug and status-checks |
| comm          | comm(@peer)      | exchange messages & check connection health (heartbeat) |
| scratch2      | comm             | call messaging + poll en reset |

Building up the complete system from the bottom up.
Describing the service contracts each of these components should build up.


### [comm] Actual Communication Service Instance

Based on a config object describing:
* connection details of local ports and connection peer (ip/hostname + port)
* the messaging layout to support (messages, arguments, reported states)

.. it is the responsibility of this component to enable the actual communication and implement the extension hook towards scratch.

To this purpose this service will open 
* a communication channel to the actual assigned peer
* a separate local port on which it communicates through HTTP with 
    * the local user for debug/inspection purposes (/admin >> UI)
    * the local scratch instance for implementation of both 
        * the standard scratch contract (/poll /reset_all)
        * the actual configured messaging service

*Note - Security*
Since these last aspects can be shut off to only localhost - the protocol binding could be on 127.0.0.1 (disabling messages from outside)

However, that will force to use another communication mechanism (sockets) to actually receive/send the messages to/from the connected peer.

*Note - Dependency Mocking*
The config object will evemtually be passed down from the [mngr] (who got some of it from the [editor]) -  we can foresee a mock-hardwired file of these settings to get us started without those higher-level-functionality-beasts being ready.


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

if available: a link-back to the [mngr] (see further)

1. GET /admin/debug
returns HTML page that regularly (in auto mode) or upon request (in manual mode)  show the return of the /poll request

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


### [editor] Local Service Editor

Gerenal idea: a single page (browser-side) js-UI component that allows editing the essential elements of the actual communication-config elements + a REST API to persist and manage those.  (persistence as simple json on disk should suffice)

Have to give the content-model some further more thought, but seems to be that each service-config is a set of
* abstract service name --> recycle into filename for storage
* messages/signals to communicate and their arguments


#### REST Management Interface
1. GET /configs/   >> listing
1. PUT /configs/:configname
1. GET /configs/:configname
1. DELETE /configs/:configname

#### WebPage-Components
1. GET /configs-ui/index.html
1. GET /configs-ui/css/main.css
1. GET /configs-ui/js/ui.js

Together these provide a browser based client to the above REST API


### [mngr] Local Service Connector and Enabler

This service will allow to 
* be inspected: reporting and transferring its communication scheme
* select a service-scheme (from the editor) and publish it as an available service
* accept a communication peer (only one per service)
* instantiate/create the actual communication service instance
* link up to a communication peer and connect up to an available service
* heartbeat-check its connected peer(s)
* report its connection status (peer identification and heartbeat status)



### Centralised (or distributed) Directory and Discovery

Using polo we could build a central directory listing all available local node-isntances and the services they offer + are looking for connecting-peers?



