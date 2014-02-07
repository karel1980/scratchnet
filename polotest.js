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
