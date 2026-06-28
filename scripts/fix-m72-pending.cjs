/**
 * 修复 m-72 (阿尔及利亚 vs 奥地利 3-3) 的8条PENDING predictions
 * 手动结算时只处理了1条，剩余8条需结算为LOST
 *
 * 所有8条都应LOST（无下注3-3平局或H2H draw）：
 * - H2H away/home (3-3平局，非away/home胜) → LOST
 * - CORRECT_SCORE 2-0/2-1/0-0/1-0/1-1 (实际3-3) → LOST
 */
const fs = require('fs');
const { execSync } = require('child_process');

const TIMESTAMP = Date.now();
const TEMP_FILE = `/tmp/fix-m72-${TIMESTAMP}.json`;
const AUDIT_LOG_ID = `sync-log-fix-m72-pending-${TIMESTAMP}`;

function loadData() {
  console.log('加载数据库...');
  execSync(`node scripts/db-storage.mjs load > ${TEMP_FILE}`, {
    cwd: '/www/wwwroot/SJB-WorldCup-Betting',
    stdio: 'inherit',
  });
  const raw = fs.readFileSync(TEMP_FILE, 'utf8').replace(/^\uFEFF/, '').trim();
  return JSON.parse(raw);
}

async function saveData(snapshot) {
  console.log('保存数据库...');
  fs.writeFileSync(TEMP_FILE, JSON.stringify(snapshot, null, 2));
  execSync(`node scripts/db-storage.mjs save ${TEMP_FILE}`, {
    cwd: '/www/wwwroot/SJB-WorldCup-Betting',
    stdio: 'inherit',
  });
}

async function main() {
  console.log('=== m-72 PENDING predictions 修复脚本 ===');
  console.log('时间:', new Date().toISOString());
  console.log('');

  const db = loadData();
  console.log('=== 数据库加载完成 ===');
  console.log('predictions:', db.predictions?.length);
  console.log('');

  // 找到m-72的所有PENDING predictions
  const pendingPreds = (db.predictions || []).filter(
    (p) => p.matchId === 'm-72' && p.status === 'PENDING'
  );
  console.log('=== m-72 PENDING predictions ===');
  console.log('数量:', pendingPreds.length);
  console.log('');

  const now = new Date().toISOString();
  let fixedCount = 0;

  for (const pred of pendingPreds) {
    const oldStatus = pred.status;
    const stake = pred.stakePoints || 0;

    pred.status = 'LOST';
    pred.settledReturn = 0;
    pred.settledProfit = -stake;
    pred.settledAt = now;

    console.log(`✓ ${pred.id}: ${oldStatus}→LOST | stake¥${stake} | profit¥${-stake} | ${pred.market} ${pred.optionKey}`);
    fixedCount += 1;
  }
  console.log('');
  console.log(`修复完成: ${fixedCount} 条 predictions`);
  console.log('');

  // 添加审计日志
  console.log('=== 添加审计日志 ===');
  const auditLog = {
    id: AUDIT_LOG_ID,
    source: 'MANUAL',
    action: '修复m-72手动结算遗漏的PENDING predictions',
    status: 'SUCCESS',
    requestSummary: `m-72(阿尔及利亚vs奥地利 3-3)手动结算时遗漏${fixedCount}条PENDING predictions，全部结算为LOST`,
    responseSummary: `成功: fixedCount=${fixedCount}, matchId=m-72, allSettledAs=LOST, noWalletChangesNeeded`,
    errorMessage: null,
    createdAt: now,
    syncType: 'fix-m72-pending',
    targetMatchId: 'm-72',
    targetDate: null,
    startedAt: now,
    finishedAt: now,
  };
  db.syncLogs = db.syncLogs || [];
  db.syncLogs.push(auditLog);
  console.log(`✓ 添加审计日志: ${AUDIT_LOG_ID}`);
  console.log('');

  // 保存数据库
  console.log('=== 保存数据库 ===');
  await saveData(db);
  console.log('✓ 数据库已保存');
  console.log('');

  // 验证
  console.log('=== 验证 ===');
  const verifyDb = loadData();
  const m72Preds = (verifyDb.predictions || []).filter((p) => p.matchId === 'm-72');
  const pendingAfter = m72Preds.filter((p) => p.status === 'PENDING');
  const lostAfter = m72Preds.filter((p) => p.status === 'LOST');
  const wonAfter = m72Preds.filter((p) => p.status === 'WON');
  console.log(`m-72 predictions: ${m72Preds.length}条 (WON:${wonAfter.length} LOST:${lostAfter.length} PENDING:${pendingAfter.length})`);

  if (pendingAfter.length === 0) {
    console.log('✓ 所有PENDING已结算');
  } else {
    console.log('⚠ 仍有PENDING未结算:', pendingAfter.length);
  }

  // 清理临时文件
  try {
    fs.unlinkSync(TEMP_FILE);
    console.log('临时文件已清理');
  } catch {}
  console.log('');
  console.log('=== 修复完成 ===');
}

main().catch((err) => {
  console.error('脚本执行失败:', err);
  process.exit(1);
});
