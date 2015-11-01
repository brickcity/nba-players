var request = require('request');
var cheerio = require('cheerio');
var _ = require('lodash');
var fs=require('fs');
var http=require('http');
var async = require('async');
var playerIndexPage = "http://stats.nba.com/players/?ls=iref:nba:gnav"
// request(playerIndexPage, function (error, response, body) {
//   if (!error && response.statusCode == 200) {
//     console.log(body) // Show the HTML for the Google homepage.
//
//     //parse the body and get the players names and links to their profile pages
//     $ = cheerio.load(body);
//     var playerLinks = $('.player-list-column a');
//     playerLinks.each(function(ndx, el){
//       console.log($(el).text());
//       console.log($(el).attr('href'));
//       console.log();
//     })
//   }
// });

//http://stats.nba.com/stats/commonallplayers?IsOnlyCurrentSeason=0&LeagueID=00&Season=2015-16

var data = require('./2015-players.json');
var player = {};
var fieldnames = data.resultSets[0].headers;

var players = [];
var rowSets = data.resultSets[0].rowSet;

for(var i = 0; i < rowSets.length; i++) {
  players.push(_.zipObject(fieldnames, rowSets[i]));
}

var teams = _.uniq(_.pluck(players, 'TEAM_ABBREVIATION'));
async.map(teams, function(team, callback) {
  var path = __dirname + '/player_images/' + team;
  fs.mkdir(path, 0777, function(err) {
    if(err.code === 'EEXIST') {
      callback(null);
    } else {
      callback(err);
    }
  });
}, function(err, results) {
  if(err) {
    console.log('Error creating teams: ', err);
  }
});

/*
var knicks = _.filter(players, function(p) {
  return p.TEAM_ABBREVIATION === 'NYK';
});
*/

async.map(players, function(player) {

  var name = player.PLAYERCODE;
  var saveName = player.TEAM_ABBREVIATION + '/' + name;
  var imgSource = 'http://i.cdn.turner.com/nba/nba/.element/img/2.0/sect/statscube/players/large/' + name + '.png';

  http.get(imgSource, function(res){
    res.pipe(fs.createWriteStream('player_images/' + saveName + '.png'));
  });
}, function(err, results) {
  if(err) {
    console.log('error:', err);
  }

  console.log('Processed: ', results.length);
});
