var express = require('express');
var cheerio = require('cheerio');
var request = require('request');

var app = express();
app.use(express.static('public'));

var isPlayerRight = function(overUnder, pythagWins, prediction) {
    if (prediction === 'over' || prediction === 'OVER') {
      return overUnder < pythagWins;
    }
    return overUnder > pythagWins;
  };

var predictions = {
      'Golden State Warriors'  : { Last: 67,  OU: 59.5,  Sam: 'OVER', Matt:  'OVER' },
      'Los Angeles Clippers'  : { Last: 56,  OU: 57.5,  Sam: 'under', Matt:  'over' },
      'San Antonio Spurs'  : { Last: 55,  OU: 57.5,  Sam: 'under', Matt:  'under' },
      'Oklahoma City Thunder'  : { Last: 45,  OU: 57.5,  Sam: 'under', Matt:  'under' },
      'Cleveland Cavaliers'  : { Last: 53,  OU: 56.5,  Sam: 'under', Matt:  'OVER' },
      'Houston Rockets'  : { Last: 56,  OU: 56.6,  Sam: 'under', Matt:  'UNDER' },
      'Memphis Grizzlies'  : { Last: 55,  OU: 51.5,  Sam: 'under', Matt:  'over' },
      'Atlanta Hawks'  : { Last: 60,  OU: 50.5,  Sam: 'over', Matt:  'over' },
      'Chicago Bulls'  : { Last: 50,  OU: 49.5,  Sam: 'over', Matt:  'over' },
      'New Orleans Pelicans'  : { Last: 45,  OU: 48.5,  Sam: 'UNDER', Matt:  'UNDER' },
      'Miami Heat'  : { Last: 37,  OU: 47.5,  Sam: 'over', Matt:  'over' },
      'Washington Wizards'  : { Last: 46,  OU: 46.5,  Sam: 'over', Matt:  'under' },
      'Toronto Raptors'  : { Last: 49,  OU: 46.5,  Sam: 'under', Matt:  'over' },
      'Milwaukee Bucks'  : { Last: 41,  OU: 45.5,  Sam: 'UNDER', Matt:  'UNDER' },
      'Boston Celtics'  : { Last: 40,  OU: 44.5,  Sam: 'over', Matt:  'under' },
      'Utah Jazz'  : { Last: 38,  OU: 42.5,  Sam: 'under', Matt:  'under' },
      'Indiana Pacers'  : { Last: 38,  OU: 40.5,  Sam: 'under', Matt:  'under' },
      'Phoenix Suns'  : { Last: 39,  OU: 37.5,  Sam: 'over', Matt:  'under' },
      'Detroit Pistons'  : { Last: 32,  OU: 36.5,  Sam: 'under', Matt:  'over' },
      'Dallas Mavericks'  : { Last: 50,  OU: 36.5,  Sam: 'under', Matt:  'over' },
      'Sacramento Kings'  : { Last: 29,  OU: 35.5,  Sam: 'under', Matt:  'under' },
      'Orlando Magic'  : { Last: 25,  OU: 34.5,  Sam: 'over', Matt:  'under' },
      'Charlotte Hornets'  : { Last: 33,  OU: 33.5,  Sam: 'under', Matt:  'UNDER' },
      'New York Knicks'  : { Last: 17,  OU: 29.5,  Sam: 'over', Matt:  'under' },
      'Los Angeles Lakers'  : { Last: 21,  OU: 28.5,  Sam: 'under', Matt:  'under' },
      'Minnesota Timberwolves'  : { Last: 16,  OU: 28.5,  Sam: 'under', Matt:  'under' },
      'Brooklyn Nets'  : { Last: 38,  OU: 28.5,  Sam: 'under', Matt:  'under' },
      'Portland Trail Blazers'  : { Last: 51,  OU: 27.5,  Sam: 'over', Matt:  'under' },
      'Denver Nuggets'  : { Last: 30,  OU: 27.5,  Sam: 'over', Matt:  'over' },
      'Philadelphia 76ers'  : { Last: 18,  OU: 20.5,  Sam: 'over', Matt:  'over' }
    }

var calculatePythagoreanTotalWins = function(winPerc) {
  return Math.round(winPerc * 82, 2);
}

var calculatePythagoreanWinsSoFar = function(winPerc, gamesPlayed) {
  return Math.round(winPerc * gamesPlayed, 2)
}

var calculatePythagoreanWinPercentage = function(pointsFor, pointsAgainst) {
  var top = Math.pow(pointsFor, 16.5);
  var bottom = top + Math.pow(pointsAgainst, 16.5);
  return (top + 0.0)/ bottom;
}

app.get('/', function (req, res) {
  req.teams = "";
  var callback = (function(_this) {
    return function(data) {
      res.send(data);
    };
  })(this);

  request('http://espn.go.com/nba/standings', function (error, response, body) {
    var $ = cheerio.load(body);
    var teams = {};

    $('.standings-row').each(function () {
        var teamName = $(this).find('.team').find('.team-names').text();
        var pointsFor = $(this).children()[9].children[0].data;
        var pointsAgainst = $(this).children()[10].children[0].data;
        var winPerc = calculatePythagoreanWinPercentage(pointsFor, pointsAgainst)
        team = predictions[teamName];

        team['pythagTotalWins'] = calculatePythagoreanTotalWins(winPerc);
        team['actualWins'] = parseInt($(this).children()[1].children[0].data);
        team['losses'] = parseInt($(this).children()[2].children[0].data); 
        team['differential'] = $(this).children()[11].children[0].data;

        var gamesPlayed = team['actualWins'] + team['losses']
        team['pythagWinsSoFar'] = calculatePythagoreanWinsSoFar(winPerc, gamesPlayed);
        team['isMattRight'] = isPlayerRight(team['OU'], team['pythagTotalWins'], team['Matt']);
        team['isSamRight'] = isPlayerRight(team['OU'], team['pythagTotalWins'], team['Sam']);
        team['isUnderImpossible'] = team['actualWins'] > team['OU'];
        var gamesRemaining = 82-gamesPlayed;
        team['isOverImpossible'] = team['actualWins'] + gamesRemaining < team['OU'];
        teams[teamName] = team;

    });
    callback(JSON.stringify(teams));
  });

});
var port = process.env.PORT || 3000;
console.log("listening on port" + port);
app.listen(port);