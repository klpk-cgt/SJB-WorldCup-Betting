const fs = require('fs');

function grepMatch(sqlPath, keyword) {
  const s = fs.readFileSync(sqlPath, 'utf8');
  const lines = s.split('\n');
  const results = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(keyword)) {
      results.push({ line: i, content: lines[i].substring(0, 300) });
    }
  }
  return results;
}

const paths = [
  { name: '10:52 (before)', path: 'H:/世界杯娱乐项目/back/数据库/worldcup_app_2026-06-15_10-52-15_mysql_data_j076A.sql' },
  { name: '11:22 (after)', path: 'H:/世界杯娱乐项目/back/数据库/worldcup_app_2026-06-15_11-22-04_mysql_data_uPRhP.sql' },
];

for (const { name, path } of paths) {
  console.log(`\n========== ${name} ==========`);
  
  // 1. Predictions for m-9
  console.log('\n--- predictions m-9 ---');
  const predLines = grepMatch(path, "'m-9'");
  predLines.forEach(r => {
    // extract relevant fields
    const c = r.content;
    // try to parse the values
    const m = c.match(/VALUES\s*\((.*)\)/);
    if (m) {
      const vals = m[1];
      // find id, userId, matchId, market, optionKey, status, settledReturn, settledProfit
      console.log(`  ${vals.substring(0, 200)}`);
    } else {
      console.log(`  ${c.substring(0, 200)}`);
    }
  });
  
  // 2. Transactions for m-9
  console.log('\n--- transactions m-9 ---');
  const txLines = grepMatch(path, "'m-9'");
  txLines.forEach(r => {
    const c = r.content;
    if (c.includes('transactions')) {
      console.log(`  ${c.substring(0, 300)}`);
    }
  });
  
  // 3. Match m-9
  console.log('\n--- match m-9 ---');
  const matchLines = grepMatch(path, "'m-9'");
  matchLines.forEach(r => {
    const c = r.content;
    if (c.includes('matches')) {
      console.log(`  ${c.substring(0, 300)}`);
    }
  });
}

// Count total predictions
for (const { name, path } of paths) {
  let count = 0;
  const s = fs.readFileSync(path, 'utf8');
  const lines = s.split('\n');
  for (const l of lines) {
    if (l.includes('INSERT INTO') && l.includes('predictions')) count++;
  }
  console.log(`\n${name}: total predictions = ${count}`);
}

// Count total transactions
for (const { name, path } of paths) {
  let count = 0;
  const s = fs.readFileSync(path, 'utf8');
  const lines = s.split('\n');
  for (const l of lines) {
    if (l.includes('INSERT INTO') && l.includes('transactions')) count++;
  }
  console.log(`${name}: total transactions = ${count}`);
}
