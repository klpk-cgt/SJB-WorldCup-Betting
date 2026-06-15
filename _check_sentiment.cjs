var http = require('http');
http.get('http://localhost:3000/api/matches/m-9', function(res) {
  var d = '';
  res.on('data', function(c) { d += c; });
  res.on('end', function() {
    var m = JSON.parse(d);
    console.log('Match:', m.homeTeam.nameZh, 'vs', m.awayTeam.nameZh);
    console.log('Sentiment:', JSON.stringify(m.sentiment));
  });
});
