var request = require('request');
var cheerio = require('cheerio');

function parse(url, callback) {
    request(url, function (error, response, body) {
        console.log("parsing");
        var
            $ = cheerio.load(body);
        var teams = {};

        $('.standings-row').each(function () {
            var teamName = $(this).find('.team').find('.team-names').text();
            var pointsFor = $(this).children()[9].children[0].data;
            var pointsAgainst = $(this).children()[10].children[0].data;
            var top = Math.pow(pointsFor, 16.5);
            var bottom = top + Math.pow(pointsAgainst, 16.5);
            var winPerc = (top + 0.0)/ bottom;
            var wins = Math.round(winPerc * 82, 2);
            teams[teamName] = wins;
        });
        callback(JSON.stringify(teams))
    })
}

function startServer() {
  var http = require("http");
  console.log("starting Server");

  http.createServer(function (request, response) {
     console.log("creating server");
     // Send the HTTP header 
     // HTTP Status: 200 : OK
     // Content Type: text/plain
    response.writeHead(200, {'Content-Type': 'text/plain'});

    parse('http://espn.go.com/nba/standings', (function(_this) {
      console.log("starting callback");
      return function(data) {
        console.log("returning response");
        return response.end(data);
      };
    })(this));
  }).listen(8081);

  // Console will print the message
  console.log('Server running at http://127.0.0.1:8081/');
}

startServer();
