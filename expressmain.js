var express = require('express');
var cheerio = require('cheerio');
var request = require('request');
var NodeCache = require( "node-cache" );
var myCache = new NodeCache();

var app = express();
app.use(express.static('public'));

var isPlayerRight = function(overUnder, pythagWins, prediction) {

    if(overUnder == pythagWins) {
        return 2;
    }
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
    'Sacramento Kings': {winsLastYear: 37, overUnder: 25.5},
    'Phoenix Suns': {winsLastYear: 21, overUnder: 29.5},
    'Los Angeles Lakers': {winsLastYear: 35, overUnder: 48.5},
    'Dallas Mavericks': {winsLastYear: 24, overUnder: 34.5},
    'Memphis Grizzlies': {winsLastYear: 22, overUnder: 33.5},
    'New Orleans Pelicans': {winsLastYear: 48, overUnder: 45.5},
    'Utah Jazz': {winsLastYear: 48, overUnder: 49.5},
    'Portland Trail Blazers': {winsLastYear: 49, overUnder: 42.5},
    'LA Clippers': {winsLastYear: 42, overUnder: 36.5},
    'Denver Nuggets': {winsLastYear: 46, overUnder: 47.5},
    'Minnesota Timberwolves': {winsLastYear: 47, overUnder: 41.5},
    'Oklahoma City Thunder': {winsLastYear: 48, overUnder: 48.5},
    'San Antonio Spurs': {winsLastYear: 47, overUnder: 43.5},
    'Houston Rockets': {winsLastYear: 65, overUnder: 55.5},
    'Golden State Warriors': {winsLastYear: 58, overUnder: 63.5},
    'Chicago Bulls': {winsLastYear: 27, overUnder: 29.5},
    'Atlanta Hawks': {winsLastYear: 24, overUnder: 23.5},
    'Brooklyn Nets': {winsLastYear: 28, overUnder: 31.5},
    'New York Knicks': {winsLastYear: 29, overUnder: 29.5},
    'Indiana Pacers': {winsLastYear: 48, overUnder: 47.5},
    'Orlando Magic': {winsLastYear: 25, overUnder: 31.5},
    'Detroit Pistons': {winsLastYear: 39, overUnder: 38.5},
    'Philadelphia 76ers': {winsLastYear: 52, overUnder: 53.5},
    'Charlotte Hornets': {winsLastYear: 36, overUnder: 35.5},
    'Miami Heat': {winsLastYear: 44, overUnder: 43.5},
    'Milwaukee Bucks': {winsLastYear: 44, overUnder: 48.5},
    'Washington Wizards': {winsLastYear: 43, overUnder: 44.5},
    'Toronto Raptors': {winsLastYear: 59, overUnder: 55.5},
    'Cleveland Cavaliers': {winsLastYear: 50, overUnder: 30.5},
    'Boston Celtics': {winsLastYear: 55, overUnder: 58.5}
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

    console.log("Do this!");
    $('.full_table').each(function () {
        var teamName = $(this).children()[0].children[0].children[0].data;
        if(teamName === 'Los Angeles Clippers') {
            teamName = 'LA Clippers';
        }

        var pointsFor = $(this).children()[5].children[0].data;
        var pointsAgainst = $(this).children()[6].children[0].data;
        var winPerc = calculatePythagoreanWinPercentage(pointsFor, pointsAgainst);
        var team = predictions[teamName];
        team['wins'] = parseInt($(this).children()[1].children[0].data);
        team['losses'] = parseInt($(this).children()[2].children[0].data);
        team['differential'] = (pointsFor-pointsAgainst).toFixed(3);
        var gamesPlayed = team['wins'] + team['losses'];

        team['winPercentage'] = (Math.round((team['wins']/gamesPlayed)*1000) / 1000.0).toFixed(3);
        team['projectedWinTotal'] = calculatePythagoreanTotalWins(winPerc, gamesPlayed, team['wins']);
        team['isUnderImpossible'] = team['wins'] > team['overUnder'];
        var gamesRemaining = 82-gamesPlayed;
        team['isOverImpossible'] = team['wins'] + gamesRemaining < team['overUnder'];
        var lossesLastYear = 82 - team['winsLastYear'];
        team['lastYearsRecord'] = team['winsLastYear'] + "-" + lossesLastYear;
        var isOver = team['projectedWinTotal'] > team['overUnder'];

        teams[teamName] = team;

    });

    return teams;
};

var processResults = function (req, res) {
    res.setHeader("Content-Type", "application/json");
    console.log(req.params);

    var year = req.params.year;
    var month = req.params.month;
    var day = req.params.day;

    var url = 'https://www.basketball-reference.com/boxscores/';

    if(req.params.year && req.params.month && req.params.day) {
        url = url + "?year=" + year + "&month=" + month + "&day=" + day;
    }
    console.log(url);

    var teams = myCache.get('teams' + year + month + day);
    if(!teams) {
        request(url, function (error, response, body) {
            var teams = scrapeEspn(body);
            myCache.set('teams' + year + month + day, teams, 3600);
            res.send(JSON.stringify(teams))
        });
    } else {
        res.send(JSON.stringify({ values: teams}));
    }
};

app.get('/scrape/year/:year/month/:month/day/:day', processResults);
app.get('/scrape', processResults);


app.get('/', function(req, res) { 
  res.sendFile(__dirname+
    '/public/scraper.html');
});

var port = process.env.PORT || 3008;
console.log("listening on port" + port);
app.listen(port);
