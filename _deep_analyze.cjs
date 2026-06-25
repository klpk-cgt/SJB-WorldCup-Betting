const fs = require('fs');
const s = fs.readFileSync('H:/世界杯娱乐项目/back/数据库/worldcup_app_2026-06-15_10-52-15_mysql_data_j076A.sql','utf8');

// Parse the extended INSERT for predictions
const predMatch = s.match(/INSERT INTO `predictions` VALUES ([^;]*);/);
const predRaw = predMatch ? predMatch[1] : '';

// Split into individual rows
const rows = [];
let depth = 0, start = 0;
for (let i = 0; i < predRaw.length; i++) {
  if (predRaw[i] === '(') { if (depth === 0) start = i; depth++; }
  else if (predRaw[i] === ')') { depth--; if (depth === 0) rows.push(predRaw.substring(start, i + 1)); }
}

function parseRow(row) {
  // Handle the complex parsing including nested JSON
  const vals = [];
  let i = 1; // skip opening (
  while (i < row.length - 1) {
    if (row[i] === "'") {
      let str = '';
      i++;
      while (i < row.length && row[i] !== "'") {
        if (row[i] === '\\') { str += row[i+1]; i += 2; }
        else { str += row[i]; i++; }
      }
      vals.push(str);
      i++; // skip closing quote
      if (row[i] === ',') i++;
    } else if (row[i] === 'N' && row.substring(i, i+4) === 'NULL') {
      vals.push(null);
      i += 4;
      if (row[i] === ',') i++;
    } else {
      // number
      let num = '';
      while (i < row.length && row[i] !== ',' && row[i] !== ')') { num += row[i]; i++; }
      const n = parseFloat(num);
      vals.push(isNaN(n) ? num : n);
      if (row[i] === ',') i++;
    }
  }
  return vals;
}

console.log('=== 所有 m-9 预测详情 ===');
for (const row of rows) {
  const vals = parseRow(row);
  if (vals[3] === 'm-9') {
    console.log(`\nID: ${vals[0]}`);
    console.log(`  userId: ${vals[1]}`);
    console.log(`  market: ${vals[4]}, optionKey: ${vals[5]}, optionLabel: ${vals[6]}`);
    console.log(`  stakePoints: ${vals[7]}, odds: ${vals[8]}, expectedReturn: ${vals[9]}`);
    console.log(`  status: ${vals[10]}`);
    console.log(`  settledReturn: ${vals[11]}, settledProfit: ${vals[12]}`);
    console.log(`  placedAt: ${vals[13]}`);
    console.log(`  settledAt: ${vals[14]}`);
    console.log(`  usedCard: ${vals[17]}`);
  }
}

// Check all PENDING predictions
console.log('\n=== 所有 PENDING 状态的预测 ===');
let pendingCount = 0;
for (const row of rows) {
  const vals = parseRow(row);
  if (vals[10] === 'PENDING') {
    pendingCount++;
    console.log(`${vals[0]} | matchId:${vals[3]} | ${vals[6]} | stake:${vals[7]} | placed:${vals[13]}`);
  }
}
console.log(`总共 ${pendingCount} 条 PENDING`);

// Check m-9 transactions
const txMatch = s.match(/INSERT INTO `transactions` VALUES ([^;]*);/);
if (txMatch) {
  const txRaw = txMatch[1];
  console.log('\n=== m-9 相关交易记录 ===');
  let count = 0;
  const r = /\([^)]*'m-9'[^)]*\)/g;
  let m;
  while ((m = r.exec(txRaw)) !== null && count < 20) {
    console.log(m[0].substring(0, 300));
    count++;
  }
  console.log(`找到 ${count} 条`);
}

// Check all WON predictions for wonProfit calculation
console.log('\n=== 所有 WON 预测 (用于收益榜) ===');
const userProfit = {};
for (const row of rows) {
  const vals = parseRow(row);
  if (vals[10] === 'WON') {
    const profit = vals[12] || 0;
    const uid = vals[1];
    if (!userProfit[uid]) userProfit[uid] = { total: 0, count: 0, preds: [] };
    userProfit[uid].total += profit;
    userProfit[uid].count++;
    userProfit[uid].preds.push({ id: vals[0], matchId: vals[3], profit, label: vals[6] });
  }
}
const sorted = Object.entries(userProfit).sort((a,b) => b[1].total - a[1].total);
for (const [uid, data] of sorted) {
  console.log(`\nuserId: ${uid}, totalWonProfit: ${data.total}, wonCount: ${data.count}`);
  for (const p of data.preds) {
    console.log(`  ${p.id} | ${p.matchId} | ${p.label} | profit: ${p.profit}`);
  }
}
