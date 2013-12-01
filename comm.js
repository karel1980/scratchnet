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
var queue = [];
var nextLine;

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
  if (count < queue.length) {
    count++;
  }
  if (count >= queue.length) {
    nextLine = undefined;
  }
  
  res.send('ok');
});

app.get('/poll', function(req, res){
  if (nextLine != undefined) {
    res.send('line ' + nextLine);
  }
});

//
// called by other
//
app.get('/receive/:msg', function(req, res){
  console.log("received " + req.param('msg'));
  queue.push(req.param('msg'));
  res.send('ok');
});

app.listen(port);
