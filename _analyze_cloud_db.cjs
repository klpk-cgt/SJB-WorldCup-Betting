const fs = require('fs');

function extractTableRows(sqlPath, tableName) {
  const s = fs.readFileSync(sqlPath, 'utf8');
  const lines = s.split('\n');
  const marker = `INSERT INTO \`${tableName}\` VALUES`;
  let insertLine = '';
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trimStart().startsWith(marker)) {
      insertLine = lines[i];
      break;
    }
  }
  if (!insertLine) return [];
  const valIdx = insertLine.indexOf('VALUES');
  if (valIdx < 0) return [];
  const valuesPart = insertLine.substring(valIdx + 6).trim();
  const rows = [];
  let i = 0;
  while (i < valuesPart.length) {
    while (i < valuesPart.length && valuesPart[i] === ' ') i++;
    if (i >= valuesPart.length || valuesPart[i] !== '(') break;
    i++;
    let depth = 0, tuple = '', inString = false, escaped = false;
    while (i < valuesPart.length) {
      const ch = valuesPart[i];
      if (escaped) { tuple += ch; escaped = false; i++; continue; }
      if (ch === '\\') { tuple += ch; escaped = true; i++; continue; }
      if (ch === "'") { inString = !inString; tuple += ch; i++; continue; }
      if (inString) { tuple += ch; i++; continue; }
      if (ch === '(') { depth++; tuple += ch; }
      else if (ch === ')') {
        if (depth === 0) { i++; break; }
        depth--; tuple += ch;
      } else { tuple += ch; }
      i++;
    }
    rows.push(tuple);
    while (i < valuesPart.length && (valuesPart[i] === ' ' || valuesPart[i] === ',' || valuesPart[i] === ';')) i++;
  }
  return rows;
}

function parseValue(v) {
  v = v.trim();
  if (v === 'NULL' || v === 'null') return null;
  if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) return v.slice(1, -1);
  if (v === 'true' || v === '1') return true;
  if (v === 'false' || v === '0') return false;
  const n = Number(v);
  if (!isNaN(n) && v !== '') return n;
  return v;
}

function parseTuple(tuple) {
  const vals = [];
  let i = 0, current = '', inString = false, escaped = false, braceDepth = 0;
  while (i < tuple.length) {
    const ch = tuple[i];
    if (escaped) { current += ch; escaped = false; i++; continue; }
    if (ch === '\\') { current += ch; escaped = true; i++; continue; }
    if (ch === "'") { inString = !inString; current += ch; i++; continue; }
    if (inString) { current += ch; i++; continue; }
    if (ch === '{' || ch === '[') { braceDepth++; current += ch; i++; continue; }
    if (ch === '}' || ch === ']') { braceDepth--; current += ch; i++; continue; }
    if (braceDepth > 0) { current += ch; i++; continue; }
    if (ch === ',') { vals.push(parseValue(current.trim())); current = ''; i++; continue; }
    current += ch; i++;
  }
  if (current.trim()) vals.push(parseValue(current.trim()));
  return vals;
}

const predCols = ['id','userId','roomId','matchId','market','optionKey','optionLabel','stakePoints','oddsDecimal','potentialReturn','status','settledReturn','settledProfit','createdAt','settledAt','doubleDown','isLate'];
const txCols = ['id','userId','type','amount','balanceBefore','balanceAfter','relatedPredictionId','relatedMatchId','note','createdAt'];
const walletCols = ['userId','balance'];

function analyze(label, sqlPath) {
  const predRows = extractTableRows(sqlPath, 'predictions');
  const txRows = extractTableRows(sqlPath, 'transactions');
  const walletRows = extractTableRows(sqlPath, 'wallets');
  
  const m9Preds = [];
  for (const row of predRows) {
    const vals = parseTuple(row);
    const obj = {};
    predCols.forEach((c, i) => obj[c] = vals[i]);
    if (obj.matchId === 'm-9') m9Preds.push(obj);
  }
  
  const m9Txs = [];
  for (const row of txRows) {
    const vals = parseTuple(row);
    const obj = {};
    txCols.forEach((c, i) => obj[c] = vals[i]);
    if (obj.relatedMatchId === 'm-9') m9Txs.push(obj);
  }
  
  const m9UserIds = [...new Set(m9Preds.map(p => p.userId))];
  const wallets = {};
  for (const row of walletRows) {
    const vals = parseTuple(row);
    const obj = {};
    walletCols.forEach((c, i) => obj[c] = vals[i]);
    if (m9UserIds.includes(obj.userId)) wallets[obj.userId] = obj.balance;
  }
  
  // Count by status
  const statusCount = {};
  let totalSettledReturn = 0;
  let totalSettledProfit = 0;
  m9Preds.forEach(p => {
    statusCount[p.status] = (statusCount[p.status] || 0) + 1;
    totalSettledReturn += (Number(p.settledReturn) || 0);
    totalSettledProfit += (Number(p.settledProfit) || 0);
  });
  
  // Count tx by type (only WON/LOST relevant ones)
  const txTypeCount = {};
  let totalTxAmount = 0;
  m9Txs.forEach(t => {
    const cleanType = t.type?.replace(/'/g,'');
    txTypeCount[cleanType] = (txTypeCount[cleanType] || 0) + 1;
    totalTxAmount += (Number(t.amount) || 0);
  });
  
  // Per-user analysis: sum up PREDICTION_WIN tx amounts
  const userWinTxMap = {};
  const userStakeTxMap = {};
  m9Txs.forEach(t => {
    const cleanType = t.type?.replace(/'/g,'');
    if (cleanType === 'PREDICTION_WIN' || cleanType === 'CARD_EFFECT') {
      userWinTxMap[t.userId] = (userWinTxMap[t.userId] || 0) + (Number(t.amount) || 0);
    }
    if (cleanType === 'PREDICTION_STAKE') {
      userStakeTxMap[t.userId] = (userStakeTxMap[t.userId] || 0) + Math.abs(Number(t.amount) || 0);
    }
  });
  
  return { label, m9Preds, m9Txs, wallets, statusCount, txTypeCount, totalSettledReturn, totalSettledProfit, totalTxAmount, userWinTxMap, userStakeTxMap };
}

const before = analyze('10:52 (forceResettle前)', 'H:/世界杯娱乐项目/back/数据库/worldcup_app_2026-06-15_10-52-15_mysql_data_j076A.sql');
const after = analyze('11:22 (forceResettle后)', 'H:/世界杯娱乐项目/back/数据库/worldcup_app_2026-06-15_11-22-04_mysql_data_uPRhP.sql');

const out = [];

out.push('='.repeat(70));
out.push('  m-9 德国 vs 库拉索 (7-1) - forceResettle 前后对比');
out.push('='.repeat(70));

for (const data of [before, after]) {
  out.push(`\n>>> ${data.label}`);
  out.push(`  预测总数: ${data.m9Preds.length}`);
  out.push(`  状态分布: ${JSON.stringify(data.statusCount)}`);
  out.push(`  总settledReturn: ${data.totalSettledReturn}`);
  out.push(`  总settledProfit: ${data.totalSettledProfit}`);
  out.push(`  交易总数: ${data.m9Txs.length}`);
  out.push(`  交易类型分布: ${JSON.stringify(data.txTypeCount)}`);
  out.push(`  交易总amount: ${data.totalTxAmount}`);
  
  out.push(`\n  预测明细:`);
  data.m9Preds.forEach(p => {
    const ret = Number(p.settledReturn) || 0;
    const prof = Number(p.settledProfit) || 0;
    const uid = (p.userId || '').substring(0,12);
    out.push(`    ${p.id} | ${p.market} ${p.optionKey} | stake=${p.stakePoints} odds=${p.oddsDecimal} | status=${p.status} | ret=${ret} profit=${prof} | uid=${uid}`);
  });
  
  out.push(`\n  用户收益汇总:`);
  const userProfits = {};
  data.m9Preds.forEach(p => {
    const prof = Number(p.settledProfit) || 0;
    userProfits[p.userId] = (userProfits[p.userId] || 0) + prof;
  });
  for (const [uid, prof] of Object.entries(userProfits)) {
    const stake = data.userStakeTxMap[uid] || 0;
    const win = data.userWinTxMap[uid] || 0;
    const balance = data.wallets[uid];
    out.push(`    uid=${uid.substring(0,12)} | profit=${prof} | totalStaked=${stake} | totalWon=${win} | wallet=${balance}`);
  }
}

// DIFF analysis
out.push(`\n\n${'='.repeat(70)}`);
out.push('  DIFF 分析 - 重复发放积分检测');
out.push('='.repeat(70));

const beforeUserWin = {};
const beforeUserLose = {};
before.m9Txs.forEach(t => {
  const cleanType = t.type?.replace(/'/g,'');
  if (cleanType === 'PREDICTION_WIN' || cleanType === 'CARD_EFFECT') {
    beforeUserWin[t.userId] = (beforeUserWin[t.userId] || 0) + (Number(t.amount) || 0);
  }
  if (cleanType === 'PREDICTION_LOSE') {
    beforeUserLose[t.userId] = (beforeUserLose[t.userId] || 0) + 1;
  }
});

const afterUserWin = {};
const afterUserLose = {};
after.m9Txs.forEach(t => {
  const cleanType = t.type?.replace(/'/g,'');
  if (cleanType === 'PREDICTION_WIN' || cleanType === 'CARD_EFFECT') {
    afterUserWin[t.userId] = (afterUserWin[t.userId] || 0) + (Number(t.amount) || 0);
  }
  if (cleanType === 'PREDICTION_LOSE') {
    afterUserLose[t.userId] = (afterUserLose[t.userId] || 0) + 1;
  }
});

const allUserIds = [...new Set([...Object.keys(beforeUserWin), ...Object.keys(afterUserWin)])];
allUserIds.forEach(uid => {
  const bw = beforeUserWin[uid] || 0;
  const aw = afterUserWin[uid] || 0;
  const bl = beforeUserLose[uid] || 0;
  const al = afterUserLose[uid] || 0;
  const diff = aw - bw;
  if (diff > 0 || al > bl) {
    out.push(`  ⚠️  uid=${uid.substring(0,12)} | WON: ${bw}→${aw} (+${diff}) | LOSE tx count: ${bl}→${al} (+${al-bl}) | wallet: ${before.wallets[uid]}→${after.wallets[uid]}`);
  }
});

// Also show pred status changes
out.push(`\n\n预测状态变化:`);
const predStatusBefore = {};
before.m9Preds.forEach(p => predStatusBefore[p.id] = p.status);
after.m9Preds.forEach(p => {
  const beforeStatus = predStatusBefore[p.id];
  if (beforeStatus !== p.status) {
    out.push(`  ${p.id}: ${beforeStatus} → ${p.status} | ret=${p.settledReturn} profit=${p.settledProfit}`);
  }
});

fs.writeFileSync('h:/世界杯娱乐项目/back/klpk-cgt-s-Org v2/_srv_out.txt', out.join('\n'), 'utf8');
console.log('Done. Output written to _srv_out.txt');
