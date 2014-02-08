/* Module handling the actual communication between connected peers
 * as well as obey the contract towards scratch
 */

// TODO: 
//  - rewrite to fit the module structure
//  - rewrite to get config passed in (rather then use CLI args)
//  - investigate into other connection then http between peers
//  - then close down port to only localhost (ensuring scratch only calls)
//  - investigate in more scratch features
//  - look into fitting in with the other aspects of the bigger picture

var http=require('http');
var express=require('express');

var port = Number(process.argv[2]);
var otherhost = process.argv[3];
var otherport = Number(process.argv[4]);

/*
fs = require('fs');
fs.readFile('extension.json', 'utf-8', function(err,data) {
  var ext = JSON.parse(data);
  var port = ext.extensionPort;
});
*/


var app = express();
var count = 0;
var nextLine = '-stil-';

//
// called by scratch 
//
app.get('/send/:msg', function(req, res){
  console.log("sending " + req.param('msg'));
  var options = {
    host: otherhost,
    port: otherport,
    path: '/receive/' + req.param('msg')
  };

  callback = function(response) {
    var str = '';
    //another chunk of data has been recieved, so append it to `str`
    response.on('data', function (chunk) {
      str += chunk;
    });
    //the whole response has been recieved, so we just print it out here
    response.on('end', function () {
      console.log("completed sending");
      console.log("response was " + str);
      // we don't really care about the response
    });
  }

  http.request(options, callback).end();
  res.send('ok');
});

app.get('/nextLine', function(req, res){
  res.send('ok');
});

app.get('/poll', function(req, res){
  res.send('line ' + nextLine);
});

//
// called by other
//
app.get('/receive/:msg', function(req, res){
  console.log("received " + req.param('msg'));
  nextLine = req.param('msg');
  res.send('ok');
});

app.listen(port);
