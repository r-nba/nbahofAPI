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
    'Sacramento Kings': {Last: 37, OU: 25.5},
    'Phoenix Suns': {Last: 21, OU: 29.5},
    'Los Angeles Lakers': {Last: 35, OU: 48.5},
    'Dallas Mavericks': {Last: 24, OU: 34.5},
    'Memphis Grizzlies': {Last: 22, OU: 33.5},
    'New Orleans Pelicans': {Last: 48, OU: 45.5},
    'Utah Jazz': {Last: 48, OU: 49.5},
    'Portland Trail Blazers': {Last: 49, OU: 42.5},
    'LA Clippers': {Last: 42, OU: 36.5},
    'Denver Nuggets': {Last: 46, OU: 47.5},
    'Minnesota Timberwolves': {Last: 47, OU: 41.5},
    'Oklahoma City Thunder': {Last: 48, OU: 48.5},
    'San Antonio Spurs': {Last: 47, OU: 43.5},
    'Houston Rockets': {Last: 65, OU: 55.5},
    'Golden State Warriors': {Last: 58, OU: 63.5},
    'Chicago Bulls': {Last: 27, OU: 29.5},
    'Atlanta Hawks': {Last: 24, OU: 23.5},
    'Brooklyn Nets': {Last: 28, OU: 31.5},
    'New York Knicks': {Last: 29, OU: 29.5},
    'Indiana Pacers': {Last: 48, OU: 47.5},
    'Orlando Magic': {Last: 25, OU: 31.5},
    'Detroit Pistons': {Last: 39, OU: 38.5},
    'Philadelphia 76ers': {Last: 52, OU: 53.5},
    'Charlotte Hornets': {Last: 36, OU: 35.5},
    'Miami Heat': {Last: 44, OU: 43.5},
    'Milwaukee Bucks': {Last: 44, OU: 48.5},
    'Washington Wizards': {Last: 43, OU: 44.5},
    'Toronto Raptors': {Last: 59, OU: 55.5},
    'Cleveland Cavaliers': {Last: 50, OU: 30.5},
    'Boston Celtics': {Last: 55, OU: 58.5}
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
        team['actualWins'] = parseInt($(this).children()[1].children[0].data);
        team['losses'] = parseInt($(this).children()[2].children[0].data);
        team['differential'] = (pointsFor-pointsAgainst).toFixed(3);
        var gamesPlayed = team['actualWins'] + team['losses'];

        team['winPerc'] = (Math.round((team['actualWins']/gamesPlayed)*1000) / 1000.0).toFixed(3);
        team['pythagTotalWins'] = calculatePythagoreanTotalWins(winPerc, gamesPlayed, team['actualWins']);
        team['pythagWinsSoFar'] = calculatePythagoreanWinsSoFar(winPerc, gamesPlayed);
        team['isUnderImpossible'] = team['actualWins'] > team['OU'];
        var gamesRemaining = 82-gamesPlayed;
        team['isOverImpossible'] = team['actualWins'] + gamesRemaining < team['OU'];
        var lossesLastYear = 82 - team['Last'];
        team['lastYearsRecord'] = team['Last'] + "-" + lossesLastYear;
        var isOver = team['pythagTotalWins'] > team['OU'];
        team['overScore'] = (isOver ? 5 : -5) + team['pythagTotalWins'] - team['OU'];
        team['underScore'] = (isOver ? -5 : 5) + team['OU'] - team['pythagTotalWins'];
        team['overLockScore'] = 2 * team['overScore'];
        team['underLockScore'] = 2 * team['underScore'];

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

var port = process.env.PORT || 3000;
console.log("listening on port" + port);
app.listen(port);
