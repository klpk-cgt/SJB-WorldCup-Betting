const fs = require('fs');
const s = fs.readFileSync('H:/世界杯娱乐项目/back/数据库/worldcup_app_2026-06-15_10-52-15_mysql_data_j076A.sql','utf8');

// Find predictions INSERT
const predMatch = s.match(/INSERT INTO `predictions`[^;]*;/);
if (predMatch) {
  const predSQL = predMatch[0];
  console.log('=== predictions raw (first 5000 chars) ===');
  console.log(predSQL.substring(0, 5000));
  console.log('...');
  console.log('=== predictions raw (last 1000 chars) ===');
  console.log(predSQL.substring(Math.max(0, predSQL.length - 1000)));
}

// Find matches INSERT
const matchMatch = s.match(/INSERT INTO `matches`[^;]*;/);
if (matchMatch) {
  console.log('\n=== matches: finding GER vs CUR ===');
  const idx = matchMatch[0].indexOf("'GER','CUR'");
  if (idx > 0) {
    console.log('GER match found at pos', idx);
    console.log(matchMatch[0].substring(idx - 50, idx + 300));
  } else {
    console.log('GER vs CUR NOT found in matches');
  }
}
