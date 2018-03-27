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
    'Sacramento Kings': {Last: 32, OU: 27.5},
    'Phoenix Suns': {Last: 24, OU: 29},
    'Los Angeles Lakers': {Last: 26, OU: 33.5},
    'Dallas Mavericks': {Last: 33, OU: 35.5},
    'Memphis Grizzlies': {Last: 43, OU: 37.5},
    'New Orleans Pelicans': {Last: 34, OU: 39.5},
    'Utah Jazz': {Last: 51, OU: 41},
    'Portland Trail Blazers': {Last: 41, OU: 42.5},
    'LA Clippers': {Last: 51, OU: 43.5},
    'Denver Nuggets': {Last: 40, OU: 45.5},
    'Minnesota Timberwolves': {Last: 31, OU: 48.5},
    'Oklahoma City Thunder': {Last: 47, OU: 50.5},
    'San Antonio Spurs': {Last: 61, OU: 54.5},
    'Houston Rockets': {Last: 55, OU: 55.5},
    'Golden State Warriors': {Last: 67, OU: 67.5},
    'Chicago Bulls': {Last: 41, OU: 22},
    'Atlanta Hawks': {Last: 43, OU: 25.5},
    'Brooklyn Nets': {Last: 20, OU: 27.5},
    'New York Knicks': {Last: 31, OU: 30.5},
    'Indiana Pacers': {Last: 42, OU: 31.5},
    'Orlando Magic': {Last: 29, OU: 33.5},
    'Detroit Pistons': {Last: 37, OU: 38.5},
    'Philadelphia 76ers': {Last: 28, OU: 41.5},
    'Charlotte Hornets': {Last: 36, OU: 42.5},
    'Miami Heat': {Last: 41, OU: 43.5},
    'Milwaukee Bucks': {Last: 42, OU: 47.5},
    'Washington Wizards': {Last: 49, OU: 48},
    'Toronto Raptors': {Last: 51, OU: 48.5},
    'Cleveland Cavaliers': {Last: 51, OU: 53.5},
    'Boston Celtics': {Last: 53, OU: 55.5}
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
        teams[teamName] = team;

    });

    return teams;
};

var processResults = function (req, res) {
    res.setHeader("Content-Type", "application/json");
    console.log(req.params);

    var url = 'https://www.basketball-reference.com/boxscores/';

    if(req.params.year && req.params.month && req.params.day) {
        url = url + "?year=" + req.params.year + "&month=" + req.params.month + "&day=" + req.params.day;
    }

    var teams = myCache.get('teams');
    if(!teams) {
        request(url, function (error, response, body) {
            var teams = scrapeEspn(body);
            myCache.set('teams', teams, 3600);
            res.send(JSON.stringify(teams))
        });
    } else {
        res.send(JSON.stringify({ values: teams}));
    }
}

app.get('/scrape/year/:year/month/:month/day/:day', processResults);
app.get('/scrape', processResults);


app.get('/', function(req, res) { 
  res.sendFile(__dirname+
    '/public/scraper.html');
});

var port = process.env.PORT || 3000;
console.log("listening on port" + port);
app.listen(port);