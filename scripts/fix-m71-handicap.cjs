/**
 * 修复 m-71（约旦 vs 阿根廷 1:3）让球结算错误
 *
 * 问题：
 * - matchOdds['m-71'].handicap 字段缺失（goalLine 默认 0）
 * - 实际让球数 = 2（阿根廷让 2 球，从 optionLabel "阿根廷(-2) 胜" 推断）
 * - 让球后比分：1+2=3 vs 3 → 平局
 * - 当前错误结算：HANDICAP draw LOST，HANDICAP away WON
 * - 正确结算：HANDICAP draw WON，HANDICAP away LOST
 *
 * 受影响下注：
 * 1. pred-9f20dd30 (user-55f4c47c) HANDICAP draw ¥2000 odds 3.9: LOST → WON (+¥7800)
 * 2. pred-308dc96d (user-52d9aa8c) HANDICAP draw ¥5000 odds 3.9: LOST → WON (+¥19500)
 * 3. pred-7ee47ecb (user-39d8ea17) HANDICAP away ¥3000 odds 1.99: WON → LOST (-¥5970)
 *
 * 用法：node scripts/fix-m71-handicap.cjs
 */

const fs = require('fs');
const { execSync } = require('child_process');

const TIMESTAMP = Date.now();
const AUDIT_LOG_ID = `sync-log-fix-m71-handicap-${TIMESTAMP}`;
const TEMP_FILE = `/tmp/fix-m71-handicap-${TIMESTAMP}.json`;
const MATCH_ID = 'm-71';
const GOAL_LINE = 2; // 约旦受让 2 球（阿根廷让 2 球）

// 受影响的 3 条下注
const FIX_PREDICTIONS = [
  {
    id: 'pred-9f20dd30',
    userId: 'user-55f4c47c',
    optionKey: 'draw',
    stake: 2000,
    odds: 3.9,
    oldStatus: 'LOST',
    oldReturn: 0,
    oldProfit: -2000,
    newStatus: 'WON',
    newReturn: Math.round(2000 * 3.9), // 7800
    newProfit: Math.round(2000 * 3.9) - 2000, // 5800
    delta: Math.round(2000 * 3.9) - 0, // +7800
  },
  {
    id: 'pred-308dc96d',
    userId: 'user-52d9aa8c',
    optionKey: 'draw',
    stake: 5000,
    odds: 3.9,
    oldStatus: 'LOST',
    oldReturn: 0,
    oldProfit: -5000,
    newStatus: 'WON',
    newReturn: Math.round(5000 * 3.9), // 19500
    newProfit: Math.round(5000 * 3.9) - 5000, // 14500
    delta: Math.round(5000 * 3.9) - 0, // +19500
  },
  {
    id: 'pred-7ee47ecb',
    userId: 'user-39d8ea17',
    optionKey: 'away',
    stake: 3000,
    odds: 1.99,
    oldStatus: 'WON',
    oldReturn: 5970,
    oldProfit: 2970,
    newStatus: 'LOST',
    newReturn: 0,
    newProfit: -3000,
    delta: 0 - 5970, // -5970
  },
];

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
  console.log('=== m-71 让球结算错误修复脚本 ===');
  console.log('时间:', new Date().toISOString());
  console.log('比赛: JOR 1-3 ARG, 让球数:', GOAL_LINE, '(阿根廷让2球)');
  console.log('让球后比分: 1+2=3 vs 3 → 平局');
  console.log('');

  const db = loadData();
  console.log('=== 数据库加载完成 ===');
  console.log('predictions:', db.predictions?.length);
  console.log('');

  // ========== 步骤1: 补齐 matchOdds['m-71'].handicap 字段 ==========
  console.log('=== 步骤1: 补齐 matchOdds[m-71].handicap 字段 ===');
  const odds = db.matchOdds?.[MATCH_ID];
  if (!odds) {
    throw new Error(`matchOdds[${MATCH_ID}] 未找到`);
  }
  console.log('修复前 handicap:', odds.handicap || '(缺失)');
  // 从下注记录推断赔率：draw=3.9, away=1.99, homeWin 用合理值
  odds.handicap = {
    goalLine: GOAL_LINE,
    homeWin: 15, // 约旦受让2球后胜的赔率（无下注，用合理参考值）
    draw: 3.9, // 从 pred-9f20dd30 / pred-308dc96d 的 oddsSnapshot
    awayWin: 1.99, // 从 pred-7ee47ecb 的 oddsSnapshot
  };
  console.log('修复后 handicap:', JSON.stringify(odds.handicap));
  console.log('');

  // ========== 步骤2: 重新结算 3 条 HANDICAP 下注 ==========
  console.log('=== 步骤2: 重新结算 3 条 HANDICAP 下注 ===');
  const now = new Date().toISOString();
  const txRecords = [];
  let totalDelta = 0;

  for (const fix of FIX_PREDICTIONS) {
    const pred = db.predictions.find((p) => p.id === fix.id);
    if (!pred) {
      throw new Error(`prediction ${fix.id} 未找到`);
    }

    const wallet = db.wallets.find((w) => w.userId === fix.userId);
    if (!wallet) {
      throw new Error(`wallet ${fix.userId} 未找到`);
    }

    console.log(`--- ${fix.id} (user ${fix.userId}) ---`);
    console.log(`  选项: HANDICAP ${fix.optionKey}, 下注: ¥${fix.stake}, 赔率: ${fix.odds}`);
    console.log(`  状态: ${fix.oldStatus} → ${fix.newStatus}`);
    console.log(`  返还: ¥${fix.oldReturn} → ¥${fix.newReturn}`);
    console.log(`  利润: ¥${fix.oldProfit} → ¥${fix.newProfit}`);
    console.log(`  钱包调整: ${fix.delta > 0 ? '+' : ''}¥${fix.delta}`);

    // 更新 prediction
    pred.status = fix.newStatus;
    pred.settledReturn = fix.newReturn;
    pred.settledProfit = fix.newProfit;
    pred.settledAt = now;
    pred.oddsSnapshot = {
      ...pred.oddsSnapshot,
      source: 'MANUAL',
      correctedAt: now,
      correctedFrom: 'handicap-goalLine-missing',
      goalLine: GOAL_LINE,
    };

    // 更新钱包
    const oldBalance = wallet.balance;
    wallet.balance = oldBalance + fix.delta;
    console.log(`  钱包: ¥${oldBalance} → ¥${wallet.balance}`);
    totalDelta += fix.delta;

    // 添加交易记录
    const txType = fix.delta > 0 ? 'PREDICTION_WIN' : 'PREDICTION_LOSE';
    const tx = {
      id: `tx-fix-m71-handicap-${TIMESTAMP}-${fix.id}`,
      userId: fix.userId,
      type: txType,
      amount: fix.delta,
      balanceBefore: oldBalance,
      balanceAfter: wallet.balance,
      note: `让球结算纠正：m-71 HANDICAP ${fix.optionKey}（让球数缺失导致默认0球结算，实际让${GOAL_LINE}球后平局）`,
      relatedPredictionId: fix.id,
      relatedMatchId: MATCH_ID,
      createdAt: now,
    };
    db.transactions.push(tx);
    txRecords.push(tx);
    console.log(`  ✓ 交易记录: ${tx.id}`);
    console.log('');
  }

  console.log(`钱包调整合计: ${totalDelta > 0 ? '+' : ''}¥${totalDelta}`);
  console.log('');

  // ========== 步骤3: 重新生成 m-71 postMatchReport ==========
  console.log('=== 步骤3: 重新生成 m-71 postMatchReport ===');
  const oldReports = (db.aiContents || []).filter(
    (c) => c.type === 'POST_MATCH_RECAP' && c.matchId === MATCH_ID
  );
  console.log(`删除 ${oldReports.length} 条旧的 m-71 postMatchReport`);
  db.aiContents = (db.aiContents || []).filter(
    (c) => !(c.type === 'POST_MATCH_RECAP' && c.matchId === MATCH_ID)
  );

  const match = db.matches.find((m) => m.id === MATCH_ID);
  const homeTeam = db.teams?.find((t) => t.id === match.homeTeamId);
  const awayTeam = db.teams?.find((t) => t.id === match.awayTeamId);
  const homeName = homeTeam?.nameZh || '主队';
  const awayName = awayTeam?.nameZh || '客队';

  const m71Preds = db.predictions.filter((p) => p.matchId === MATCH_ID && p.status !== 'CANCELLED');
  const wonCount = m71Preds.filter((p) => p.status === 'WON').length;
  const lostCount = m71Preds.filter((p) => p.status === 'LOST').length;
  const totalStake = m71Preds.reduce((s, p) => s + (p.stakePoints || 0), 0);
  const totalReturn = m71Preds.reduce((s, p) => s + (p.settledReturn || 0), 0);

  const newReport = {
    id: `ai-recap-m-71-${TIMESTAMP}`,
    type: 'POST_MATCH_RECAP',
    matchId: MATCH_ID,
    title: `赛后速览：${homeName} vs ${awayName}`,
    content: `${homeName} 与 ${awayName} 的比赛已经结束，最终比分 ${match.homeScore} : ${match.awayScore}。本场竞猜已经自动结算完成。`,
    summary: `比分定格在 ${match.homeScore} : ${match.awayScore}，让球数 ${GOAL_LINE}（${awayName} 让 ${GOAL_LINE} 球）。本场共 ${m71Preds.length} 条竞猜（${wonCount} 命中，${lostCount} 未命中），总下注 ¥${totalStake}，总派奖 ¥${totalReturn}。`,
    bullets: [
      '让球结算已修正',
      '让球平按平局结算',
      '让球客胜按客负结算',
    ],
    riskWarning: '若赛果官方修订，后台可以触发重结。',
    createdAt: now,
    model: 'manual-correction-handicap',
  };
  db.aiContents.unshift(newReport);
  console.log(`✓ 生成新的 m-71 postMatchReport: ${newReport.id}`);
  console.log('');

  // ========== 步骤4: 添加审计日志（符合 Prisma syncLogs schema） ==========
  console.log('=== 步骤4: 添加审计日志 ===');
  const auditLog = {
    id: AUDIT_LOG_ID,
    source: 'MANUAL',
    action: '修复m-71让球结算错误',
    status: 'SUCCESS',
    requestSummary: `m-71（JOR 1-3 ARG）让球结算纠正：补齐 handicap.goalLine=${GOAL_LINE}，重新结算 ${FIX_PREDICTIONS.length} 条 HANDICAP 下注（让球后平局：draw→WON, away→LOST）`,
    responseSummary: `成功: 修正 ${FIX_PREDICTIONS.length} 条 predictions，钱包调整合计 ${totalDelta > 0 ? '+' : ''}${totalDelta}（draw+¥${7800 + 19500}, away-¥5970）`,
    errorMessage: null,
    createdAt: now,
    syncType: 'fix-m71-handicap',
    targetMatchId: MATCH_ID,
    targetDate: null,
    startedAt: now,
    finishedAt: now,
  };
  db.syncLogs = db.syncLogs || [];
  db.syncLogs.push(auditLog);
  console.log(`✓ 添加审计日志: ${AUDIT_LOG_ID}`);
  console.log('');

  // ========== 保存数据库 ==========
  console.log('=== 保存数据库 ===');
  await saveData(db);
  console.log('✓ 数据库已保存');
  console.log('');

  // ========== 最终验证 ==========
  console.log('=== 最终验证 ===');
  const verifyDb = loadData();

  // 验证 handicap 字段
  const verifyOdds = verifyDb.matchOdds?.[MATCH_ID];
  console.log(`m-71 handicap.goalLine: ${verifyOdds?.handicap?.goalLine}`);

  // 验证 3 条 predictions
  for (const fix of FIX_PREDICTIONS) {
    const pred = verifyDb.predictions.find((p) => p.id === fix.id);
    const wallet = verifyDb.wallets.find((w) => w.userId === fix.userId);
    console.log(
      `  ${fix.id}: status=${pred?.status}, return=¥${pred?.settledReturn}, ` +
        `profit=¥${pred?.settledProfit}, wallet=¥${wallet?.balance}`
    );
  }

  // 验证审计日志
  const verifyLog = verifyDb.syncLogs?.find((l) => l.id === AUDIT_LOG_ID);
  console.log(`审计日志: ${verifyLog ? '已保存' : '未找到'}`);

  // 验证 m-71 所有 predictions 状态
  const verifyM71Preds = (verifyDb.predictions || []).filter((p) => p.matchId === MATCH_ID);
  const byStatus = {};
  for (const p of verifyM71Preds) byStatus[p.status] = (byStatus[p.status] || 0) + 1;
  console.log(`m-71 predictions 状态分布: ${JSON.stringify(byStatus)}`);

  console.log('');
  console.log('=== 修复完成 ===');
  console.log(`补齐 handicap 字段: goalLine=${GOAL_LINE}`);
  console.log(`重新结算 predictions: ${FIX_PREDICTIONS.length} 条`);
  console.log(`钱包调整合计: ${totalDelta > 0 ? '+' : ''}¥${totalDelta}`);
  console.log(`新增交易记录: ${txRecords.length} 条`);
  console.log(`新增审计日志: 1 条`);

  // 清理临时文件
  try {
    fs.unlinkSync(TEMP_FILE);
    console.log('临时文件已清理');
  } catch {}
}

main().catch((err) => {
  console.error('脚本执行失败:', err);
  process.exit(1);
});
