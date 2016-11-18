var express = require('express');
var cheerio = require('cheerio');
var request = require('request');
var NodeCache = require( "node-cache" );
var myCache = new NodeCache();

var app = express();
app.use(express.static('public'));

var isPlayerRight = function(overUnder, pythagWins, prediction) {
    if (prediction === 'over' || prediction === 'OVER') {
      return overUnder < pythagWins;
    }
    return overUnder > pythagWins;
  };

var translations  = {
    'OVER' : 'Over Lock',
    'UNDER' : 'Under Lock',
    'over' : 'Over',
    'under' : 'Under'
};

var predictions = {
    'Utah Jazz' : { Last: 40, OU: 47, Sam: 'under', Matt: 'under', Mal: 'under' },
    'New York Knicks' : { Last: 32, OU: 40.5, Sam: 'UNDER', Matt: 'over', Mal: 'over' },
    'Miami Heat' : { Last: 48, OU: 35, Sam: 'under', Matt: 'over', Mal: 'over' },
    'Minnesota Timberwolves' : { Last: 29, OU: 42.5, Sam: 'under', Matt: 'under', Mal: 'under' },
    'Chicago Bulls' : { Last: 42, OU: 40.5, Sam: 'under', Matt: 'under', Mal: 'over' },
    'New Orleans Pelicans' : { Last: 30, OU: 36.5, Sam: 'under', Matt: 'under', Mal: 'under' },
    'Toronto Raptors' : { Last: 56, OU: 50, Sam: 'over', Matt: 'over', Mal: 'OVER' },
    'Brooklyn Nets' : { Last: 21, OU: 21.5, Sam: 'over', Matt: 'under', Mal: 'over' },
    'Golden State Warriors' : { Last: 73, OU: 66.5, Sam: 'OVER', Matt: 'OVER', Mal: 'under' },
    'Washington Wizards' : { Last: 41, OU: 42.5, Sam: 'under', Matt: 'over', Mal: 'under' },
    'Oklahoma City Thunder' : { Last: 55, OU: 45, Sam: 'under', Matt: 'over', Mal: 'under' },
    'LA Clippers' : { Last: 53, OU: 54, Sam: 'over', Matt: 'over', Mal: 'over' },
    'Indiana Pacers' : { Last: 45, OU: 44.5, Sam: 'over', Matt: 'under', Mal: 'under' },
    'Philadelphia 76ers' : { Last: 10, OU: 25, Sam: 'under', Matt: 'UNDER', Mal: 'over' },
    'Portland Trail Blazers' : { Last: 44, OU: 45.5, Sam: 'over', Matt: 'over', Mal: 'under' },
    'Atlanta Hawks' : { Last: 48, OU: 43.5, Sam: 'over', Matt: 'under', Mal: 'under' },
    'Phoenix Suns' : { Last: 23, OU: 29, Sam: 'under', Matt: 'over', Mal: 'over' },
    'Orlando Magic' : { Last: 35, OU: 37, Sam: 'under', Matt: 'under', Mal: 'under' },
    'San Antonio Spurs' : { Last: 67, OU: 57, Sam: 'over', Matt: 'OVER', Mal: 'OVER' },
    'Los Angeles Lakers' : { Last: 17, OU: 25, Sam: 'over', Matt: 'over', Mal: 'OVER' },
    'Denver Nuggets' : { Last: 33, OU: 37, Sam: 'under', Matt: 'under', Mal: 'under' },
    'Milwaukee Bucks' : { Last: 33, OU: 36, Sam: 'under', Matt: 'over', Mal: 'over' },
    'Detroit Pistons' : { Last: 44, OU: 44.5, Sam: 'under', Matt: 'over', Mal: 'over' },
    'Cleveland Cavaliers' : { Last: 57, OU: 57.5, Sam: 'over', Matt: 'over', Mal: 'under' },
    'Dallas Mavericks' : { Last: 42, OU: 40, Sam: 'under', Matt: 'over', Mal: 'over' },
    'Sacramento Kings' : { Last: 33, OU: 32.5, Sam: 'over', Matt: 'over', Mal: 'under' },
    'Boston Celtics' : { Last: 48, OU: 52.5, Sam: 'over', Matt: 'over', Mal: 'over' },
    'Houston Rockets' : { Last: 41, OU: 44, Sam: 'under', Matt: 'over', Mal: 'over' },
    'Charlotte Hornets' : { Last: 48, OU: 40.5, Sam: 'under', Matt: 'under', Mal: 'over' },
    'Memphis Grizzlies' : { Last: 42, OU: 44, Sam: 'UNDER', Matt: 'under', Mal: 'under' }
    };

var calculatePythagoreanTotalWins = function(winPerc, gamesPlayed, winsSoFar) {
  return Math.round(winPerc * (82-gamesPlayed), 2) + winsSoFar ;
};

var calculatePythagoreanWinsSoFar = function(winPerc, gamesPlayed) {
  return Math.round(winPerc * gamesPlayed, 2)
};

var calculatePythagoreanWinPercentage = function(pointsFor, pointsAgainst) {
  var top = Math.pow(pointsFor, 16.5);
  var bottom = top + Math.pow(pointsAgainst, 16.5);
  return (top + 0.0)/ bottom;
};

var scrapeEspn = function(body) {
    var $ = cheerio.load(body);
    var teams = {};

    $('.standings-row').each(function () {
        var teamName = $(this).find('.team').find('.team-names').text();
        var pointsFor = $(this).children()[9].children[0].data;
        var pointsAgainst = $(this).children()[10].children[0].data;
        var winPerc = calculatePythagoreanWinPercentage(pointsFor, pointsAgainst);
        var team = predictions[teamName];

        team['actualWins'] = parseInt($(this).children()[1].children[0].data);
        team['losses'] = parseInt($(this).children()[2].children[0].data);
        team['differential'] = $(this).children()[11].children[0].data;
        var gamesPlayed = team['actualWins'] + team['losses'];

        team['winPerc'] = (Math.round((team['actualWins']/gamesPlayed)*1000) / 1000.0).toFixed(3);
        team['pythagTotalWins'] = calculatePythagoreanTotalWins(winPerc, gamesPlayed, team['actualWins']);
        team['pythagWinsSoFar'] = calculatePythagoreanWinsSoFar(winPerc, gamesPlayed);
        team['isMattRight'] = isPlayerRight(team['OU'], team['pythagTotalWins'], team['Matt']);
        team['isSamRight'] = isPlayerRight(team['OU'], team['pythagTotalWins'], team['Sam']);
        team['isMalRight'] = isPlayerRight(team['OU'], team['pythagTotalWins'], team['Mal']);
        team['isUnderImpossible'] = team['actualWins'] > team['OU'];
        team['samDisplay'] = translations[team['Sam']];
        team['mattDisplay'] = translations[team['Matt']];
        team['malDisplay'] = translations[team['Mal']];
        var gamesRemaining = 82-gamesPlayed;
        team['isOverImpossible'] = team['actualWins'] + gamesRemaining < team['OU'];
        var lossesLastYear = 82 - team['Last'];
        team['lastYearsRecord'] = team['Last'] + "-" + lossesLastYear;
        teams[teamName] = team;

    });
    return teams;
};

app.get('/scrape', function (req, res) {
  var teams = myCache.get('teams');
  if(!teams) {
    request('http://espn.go.com/nba/standings/_/group/league', function (error, response, body) {
      var teams = scrapeEspn(body);
      myCache.set('teams', teams, 21600);
      res.send(JSON.stringify(teams))
    });  
  } else {
    res.send(JSON.stringify(teams));  
  }
});

app.get('/', function(req, res) { 
  res.sendFile(__dirname+
    '/public/scraper.html');
});

var port = process.env.PORT || 3000;
console.log("listening on port" + port);
app.listen(port);