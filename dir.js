/* Module implementing a central directory of available manager instances on the network
 * Using autodiscovery the central (or distributed) directory is found and used to find available services and hook up to them 
 */


// TODO:
//   - rewrite into module, now just a copy of old polotest
//   - hook up into the bigger picture
//   - should check who is the active dir in the network and proxy to that?
//   - think and implement needed features
//   - maybe think into really creating a distributed solution?


var http = require('http');
var polo = require('polo');
var apps = polo();

var server = http.createServer(function(req, res) {
    if (req.url !== '/') {
        res.writeHead(404);
        res.end();
        return;
    }

    res.end('hello-http is available at http://'+apps.get('hello-http').address);
});

server.listen(0, function() {
    var port = server.address().port; // let's find out which port we binded to

    apps.put({
        name: 'hello-http',
        port: port
    });

    console.log('visit: http://localhost:'+port);
});
