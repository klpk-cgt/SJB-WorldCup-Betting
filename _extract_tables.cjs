const fs = require('fs');
const s = fs.readFileSync('H:/世界杯娱乐项目/back/数据库/worldcup_app_2026-06-15_10-52-15_mysql_data_j076A.sql','utf8');
const lines = s.split('\n');

// Find lines with INSERT INTO
for (let i = 0; i < lines.length; i++) {
  const l = lines[i].trim();
  if (l.startsWith('INSERT INTO')) {
    const tableName = l.match(/INSERT INTO `(\w+)`/)?.[1] || 'unknown';
    console.log('=== TABLE:', tableName, 'at line', i, '===');
    console.log(l.substring(0, 300));
    
    if (tableName === 'predictions' || tableName === 'matches' || tableName === 'wallets' || tableName === 'transactions') {
      console.log('  FULL LINE LENGTH:', l.length);
      // Print first 1000 chars and last 200 chars
      console.log('  FIRST 1000:', l.substring(0, 1000));
      console.log('  ......');
      console.log('  LAST 300:', l.substring(Math.max(0, l.length - 300)));
    }
    console.log('');
  }
}
