var Scraper;
var scoreCard;
Scraper = (function() {
  function Scraper() {
    this.scoreCard = {
      OVER: [-3, 3, 0],
      UNDER: [-3, 3, 0],
      over: [0, 1, 0],
      under: [0, 1, 0]
    };
    this.teams$ = ko.observable();
    $.ajax('/scrape', {
      success: (function(_this) {
        return function(result, status, xhr) {
          return _this.teams$(JSON.parse(result));
        };
      })(this)
    });
    this.playerScoreList = ko.computed((function(_this) {
      return function() {
        var results, team;
        results = [];
        if(teams$()) {
          for (teamName in teams$()) {
            team = teams$()[teamName];
            results.push([team.Matt, team.Sam, team.Mal, team.isMattRight, team.isSamRight, team.isMalRight]);
          }
        }
        return results;
      };
    })(this));
    this.samScore$ = ko.computed((function(_this) {
      return function() {
            var x = 0;
            return _.reduce(_this.playerScoreList(), (function(memo, playerScore) {
                if(playerScore != undefined) {
                    return memo + this.scoreCard[playerScore[1]][+playerScore[4]];
                }
                return memo;
            }), 0);
      };
    })(this));
    this.mattScore$ = ko.computed((function(_this) {
      return function() {
        return _.reduce(_this.playerScoreList(), (function(memo, playerScore) {
          return memo + this.scoreCard[playerScore[0]][+playerScore[3]];
        }), 0);
      };
    })(this));
    this.malScore$ = ko.computed((function(_this) {
      return function() {
          return _.reduce(_this.playerScoreList(), (function(memo, playerScore) {
              return memo + this.scoreCard[playerScore[2]][+playerScore[5]];
          }), 0);
      };
    })(this));
  }

  Scraper.prototype.score = function(prediction, correct) {
    return scoreCard[prediction][+correct];
  };
  return Scraper;

})();

ko.applyBindings(Scraper);