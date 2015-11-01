var _ = require('lodash');
var fs=require('fs');
var http=require('http');
var async = require('async');
var nbaDataEndpoint = 'http://stats.nba.com/stats/commonallplayers?IsOnlyCurrentSeason=1&LeagueID=00&Season=2015-16';

var rawData;
var players;
var teams;

function getNBAData(callback) {
  http.get(nbaDataEndpoint, function(res) {
    if(res.statusCode !== 200) {
      callback(new Error('Could not retrieve NBA data.'));
      return;
    }

    var body = '';
    res.on('data', function(d) { body += d; });
    res.on('end', function() {
      rawData = JSON.parse(body); //todo: cache in a file
      callback(null, rawData);
    });
  });
}

function transformRawData(data, callback) {
  if(!data) {
    callback(new Error('No data to transform.'));
    return;
  }

  var fieldnames = data.resultSets[0].headers;

  players = [];
  var rowSets = data.resultSets[0].rowSet;

  for(var i = 0; i < rowSets.length; i++) {
    players.push(_.zipObject(fieldnames, rowSets[i]));
  }

  callback();
}

function prepareTeamDirectories(callback) {
  teams = _.uniq(_.pluck(players, 'TEAM_ABBREVIATION'));
  async.each(teams, function(team, cb) {
    var path = __dirname + '/teams/' + team;
    fs.mkdir(path, 0777, function(err) {
      if(!err || err.code === 'EEXIST') {
        cb();
      } else {
        cb(err);
      }
    });
  }, function(err) {
    if(err) {
      callback(err);
      return;
    }

    callback();
  });
}

function savePlayerImages(callback) {
  async.each(players, function(player) {
    var name = player.PLAYERCODE;
    var saveName = player.TEAM_ABBREVIATION + '/' + name;
    var imgSource = 'http://i.cdn.turner.com/nba/nba/.element/img/2.0/sect/statscube/players/large/' + name + '.png';

    http.get(imgSource, function(res){
      res.pipe(fs.createWriteStream('teams/' + saveName + '.png'));
    });
  }, function(err) {
    if(err) {
      callback(err);
      return;
    }
  });
}
async.waterfall([getNBAData, transformRawData, prepareTeamDirectories, savePlayerImages], function(err, result) {
  if(err) {
    console.log('Error:', err);
  }

  console.log(players.length, ' players processed from ', teams.length, 'teams');
});
