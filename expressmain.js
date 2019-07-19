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
    'Sacramento Kings':         {overUnder: 25.5},
    'Phoenix Suns':             {overUnder: 29.5},
    'Los Angeles Lakers':       {overUnder: 48.5},
    'Dallas Mavericks':         {overUnder: 34.5},
    'Memphis Grizzlies':        {overUnder: 33.5},
    'New Orleans Pelicans':     {overUnder: 45.5},
    'Utah Jazz':                {overUnder: 49.5},
    'Portland Trail Blazers':   {overUnder: 42.5},
    'LA Clippers':              {overUnder: 36.5},
    'Denver Nuggets':           {overUnder: 47.5},
    'Minnesota Timberwolves':   {overUnder: 41.5},
    'Oklahoma City Thunder':    {overUnder: 48.5},
    'San Antonio Spurs':        {overUnder: 43.5},
    'Houston Rockets':          {overUnder: 55.5},
    'Golden State Warriors':    {overUnder: 63.5},
    'Chicago Bulls':            {overUnder: 29.5},
    'Atlanta Hawks':            {overUnder: 23.5},
    'Brooklyn Nets':            {overUnder: 31.5},
    'New York Knicks':          {overUnder: 29.5},
    'Indiana Pacers':           {overUnder: 47.5},
    'Orlando Magic':            {overUnder: 31.5},
    'Detroit Pistons':          {overUnder: 38.5},
    'Philadelphia 76ers':       {overUnder: 53.5},
    'Charlotte Hornets':        {overUnder: 35.5},
    'Miami Heat':               {overUnder: 43.5},
    'Milwaukee Bucks':          {overUnder: 48.5},
    'Washington Wizards':       {overUnder: 44.5},
    'Toronto Raptors':          {overUnder: 55.5},
    'Cleveland Cavaliers':      {overUnder: 30.5},
    'Boston Celtics':           {overUnder: 58.5}
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
        team['differential'] = Math.round((pointsFor-pointsAgainst) * 1000) / 1000;
        var gamesPlayed = team['wins'] + team['losses'];

        team['winPercentage'] = (Math.round((team['wins']/gamesPlayed) * 1000) / 1000.0);
        team['projectedWinTotal'] = calculatePythagoreanTotalWins(winPerc, gamesPlayed, team['wins']);
        team['isUnderImpossible'] = team['wins'] > team['overUnder'];
        var gamesRemaining = 82-gamesPlayed;
        team['isOverImpossible'] = team['wins'] + gamesRemaining < team['overUnder'];

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

app.get('/year/:year/month/:month/day/:day', processResults);
app.get('/', processResults);

var port = process.env.PORT || 3008;
console.log("listening on port" + port);
app.listen(port);
