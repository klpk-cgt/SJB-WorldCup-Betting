/**
 * The Odds API 异常赔率纠正脚本
 *
 * 功能：
 * 1. 清理14条 The Odds API matchOdds（source→MANUAL, correctScoreSource→MANUAL, syncStatus→SYNCED）
 * 2. 重新结算 pred-f424c06b（odds 33.51→9.25，回滚 ¥24,260）
 * 3. 更新所有 The Odds API 来源 predictions 的 oddsSnapshot.source → MANUAL
 * 4. 重新生成 m-71 的 postMatchReport
 * 5. 添加审计日志
 *
 * 用法：node scripts/correct-theodds-api.cjs
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const TIMESTAMP = Date.now();
const AUDIT_LOG_ID = `sync-log-correct-theodds-api-${TIMESTAMP}`;
const TEMP_FILE = `/tmp/correct-theodds-api-${TIMESTAMP}.json`;

// 14条 The Odds API matchOdds 的 matchId
const THE_ODDS_MATCH_IDS = [
  'm-53', 'm-54', 'm-55', 'm-56',
  'm-63', 'm-64', 'm-65', 'm-66', 'm-67', 'm-68', 'm-69', 'm-70', 'm-71', 'm-72'
];

// 需要重新结算的 prediction
const RESETTLE_PREDICTION = {
  id: 'pred-f424c06b',
  matchId: 'm-71',
  userId: 'user-52d9aa8c',
  market: 'CORRECT_SCORE',
  optionKey: 'correctScore_1_3',
  oldOdds: 33.51,      // The Odds API 异常赔率
  newOdds: 9.25,       // 同场 Sporttery 参考赔率
  stakePoints: 1000,
};

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
  console.log('=== The Odds API 异常赔率纠正脚本 ===');
  console.log('时间:', new Date().toISOString());
  console.log('');

  // 加载数据库
  const db = loadData();
  console.log('=== 数据库加载完成 ===');
  console.log('users:', db.users?.length);
  console.log('predictions:', db.predictions?.length);
  console.log('matchOdds keys:', Object.keys(db.matchOdds || {}).length);
  console.log('');

  // ========== 步骤1: 清理14条 The Odds API matchOdds ==========
  console.log('=== 步骤1: 清理14条 The Odds API matchOdds ===');
  let cleanedOdds = 0;
  for (const matchId of THE_ODDS_MATCH_IDS) {
    const key = matchId;
    const odds = db.matchOdds?.[key];
    if (odds && odds.source === 'The Odds API') {
      const oldSource = odds.source;
      const oldCorrectScoreSource = odds.correctScoreSource;
      const oldSyncStatus = odds.syncStatus;

      db.matchOdds[key] = {
        ...odds,
        source: 'MANUAL',
        correctScoreSource: 'MANUAL',
        syncStatus: 'SYNCED',
        lastSyncedAt: new Date().toISOString(),
      };

      console.log(`✓ ${key}: source ${oldSource}→MANUAL, correctScoreSource ${oldCorrectScoreSource}→MANUAL, syncStatus ${oldSyncStatus}→SYNCED`);
      cleanedOdds += 1;
    } else {
      console.log(`⚠ ${key}: 未找到 The Odds API 记录（可能已清理或key格式不一致）`);
    }
  }
  console.log(`清理完成: ${cleanedOdds} 条 matchOdds`);
  console.log('');

  // ========== 步骤2: 重新结算 pred-f424c06b ==========
  console.log('=== 步骤2: 重新结算 pred-f424c06b ===');
  const prediction = db.predictions.find((p) => p.id === RESETTLE_PREDICTION.id);
  if (!prediction) {
    throw new Error(`预测 ${RESETTLE_PREDICTION.id} 未找到`);
  }

  const oldReturn = prediction.settledReturn;
  const oldProfit = prediction.settledProfit;
  const oldOdds = prediction.oddsDecimal;

  // 计算新的结算金额
  const newReturn = Math.round(RESETTLE_PREDICTION.stakePoints * RESETTLE_PREDICTION.newOdds);
  const newProfit = newReturn - RESETTLE_PREDICTION.stakePoints;
  const rollbackAmount = oldReturn - newReturn;

  console.log(`预测ID: ${prediction.id}`);
  console.log(`用户: ${prediction.userId}`);
  console.log(`比赛: ${prediction.matchId} (${RESETTLE_PREDICTION.market} ${RESETTLE_PREDICTION.optionKey})`);
  console.log(`赔率: ${oldOdds} → ${RESETTLE_PREDICTION.newOdds}`);
  console.log(`结算返回: ¥${oldReturn} → ¥${newReturn}`);
  console.log(`结算利润: ¥${oldProfit} → ¥${newProfit}`);
  console.log(`需要回滚: ¥${rollbackAmount}`);
  console.log('');

  // 更新 prediction
  prediction.oddsDecimal = RESETTLE_PREDICTION.newOdds;
  prediction.settledReturn = newReturn;
  prediction.settledProfit = newProfit;
  prediction.oddsSnapshot = {
    ...prediction.oddsSnapshot,
    source: 'Sporttery',
    odds: RESETTLE_PREDICTION.newOdds,
    correctedAt: new Date().toISOString(),
    correctedFrom: 'The Odds API',
  };

  // 更新钱包：回滚多发的奖金
  const wallet = db.wallets.find((w) => w.userId === prediction.userId);
  if (!wallet) {
    throw new Error(`钱包 ${prediction.userId} 未找到`);
  }

  const oldBalance = wallet.balance;
  wallet.balance = oldBalance - rollbackAmount;
  console.log(`钱包 ${prediction.userId}: ¥${oldBalance} → ¥${wallet.balance}（回滚 ¥${rollbackAmount}）`);
  console.log('');

  // 添加回滚交易记录
  const rollbackTx = {
    id: `tx-rollback-${TIMESTAMP}`,
    userId: prediction.userId,
    type: 'PREDICTION_LOSE',
    amount: -rollbackAmount,
    balanceBefore: oldBalance,
    balanceAfter: wallet.balance,
    note: `赔率纠正回滚：${prediction.matchId} ${RESETTLE_PREDICTION.market}（异常赔率${oldOdds}→正常赔率${RESETTLE_PREDICTION.newOdds}）`,
    relatedPredictionId: prediction.id,
    relatedMatchId: prediction.matchId,
    createdAt: new Date().toISOString(),
  };
  db.transactions.push(rollbackTx);
  console.log(`✓ 添加回滚交易记录: ${rollbackTx.id}`);
  console.log('');

  // ========== 步骤3: 更新所有 The Odds API 来源 predictions 的 oddsSnapshot.source ==========
  console.log('=== 步骤3: 更新所有 The Odds API 来源 predictions 的 oddsSnapshot.source ===');
  let updatedPreds = 0;
  for (const pred of db.predictions) {
    if (pred.oddsSnapshot?.source === 'The Odds API') {
      pred.oddsSnapshot = {
        ...pred.oddsSnapshot,
        source: 'MANUAL',
      };
      updatedPreds += 1;
    }
  }
  console.log(`✓ 更新 ${updatedPreds} 条 predictions 的 oddsSnapshot.source: The Odds API → MANUAL`);
  console.log('');

  // ========== 步骤4: 重新生成 m-71 的 postMatchReport ==========
  console.log('=== 步骤4: 重新生成 m-71 的 postMatchReport ===');
  const oldReports = (db.aiContents || []).filter(
    (c) => c.type === 'POST_MATCH_RECAP' && c.matchId === 'm-71'
  );
  console.log(`删除 ${oldReports.length} 条旧的 m-71 postMatchReport`);
  db.aiContents = (db.aiContents || []).filter(
    (c) => !(c.type === 'POST_MATCH_RECAP' && c.matchId === 'm-71')
  );

  const match = db.matches.find((m) => m.id === 'm-71');
  if (match) {
    const homeTeam = db.teams?.find((t) => t.id === match.homeTeamId);
    const awayTeam = db.teams?.find((t) => t.id === match.awayTeamId);
    const homeName = homeTeam?.nameZh || '主队';
    const awayName = awayTeam?.nameZh || '客队';

    const m71Preds = db.predictions.filter((p) => p.matchId === 'm-71' && p.status !== 'CANCELLED');
    const wonCount = m71Preds.filter((p) => p.status === 'WON').length;
    const lostCount = m71Preds.filter((p) => p.status === 'LOST').length;
    const totalStake = m71Preds.reduce((s, p) => s + (p.stakePoints || 0), 0);
    const totalReturn = m71Preds.reduce((s, p) => s + (p.settledReturn || 0), 0);

    const newReport = {
      id: `ai-recap-m-71-${TIMESTAMP}`,
      type: 'POST_MATCH_RECAP',
      matchId: 'm-71',
      title: `赛后速览：${homeName} vs ${awayName}`,
      content: `${homeName} 与 ${awayName} 的比赛已经结束，最终比分 ${match.homeScore} : ${match.awayScore}。本场竞猜已经自动结算完成。`,
      summary: `比分定格在 ${match.homeScore} : ${match.awayScore}，本场竞猜已完成结算。共 ${m71Preds.length} 条竞猜（${wonCount} 命中，${lostCount} 未命中），总下注 ¥${totalStake}，总派奖 ¥${totalReturn}。`,
      bullets: [
        '结算已写入钱包',
        '重结时会先回滚再重算',
        '榜单会随着结算自动刷新',
      ],
      riskWarning: '若赛果官方修订，后台可以触发重结。',
      createdAt: new Date().toISOString(),
      model: 'manual-correction',
    };
    db.aiContents.unshift(newReport);
    console.log(`✓ 生成新的 m-71 postMatchReport: ${newReport.id}`);
  }
  console.log('');

  // ========== 步骤5: 添加审计日志（严格符合Prisma syncLogs schema） ==========
  console.log('=== 步骤5: 添加审计日志 ===');
  const now = new Date().toISOString();
  const auditLog = {
    id: AUDIT_LOG_ID,
    source: 'MANUAL',
    action: '纠正The Odds API异常赔率',
    status: 'SUCCESS',
    requestSummary: `The Odds API 异常赔率纠正：清理 ${cleanedOdds} 条 matchOdds，重新结算 ${RESETTLE_PREDICTION.id}（回滚 ¥${rollbackAmount}），更新 ${updatedPreds} 条 predictions 来源`,
    responseSummary: `成功: cleanedOdds=${cleanedOdds}, rollbackAmount=${rollbackAmount}, updatedPreds=${updatedPreds}, resettledPrediction=${RESETTLE_PREDICTION.id}（odds ${RESETTLE_PREDICTION.oldOdds}→${RESETTLE_PREDICTION.newOdds}, return ¥${oldReturn}→¥${newReturn}）`,
    errorMessage: null,
    createdAt: now,
    syncType: 'correct-theodds-api',
    targetMatchId: null,
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
  // 重新加载数据库验证
  const verifyDb = loadData();

  const residualTheOdds = Object.values(verifyDb.matchOdds || {}).filter(
    (o) => o.source === 'The Odds API'
  );
  console.log(`The Odds API matchOdds 残留: ${residualTheOdds.length} 条`);

  const residualTheOddsPreds = (verifyDb.predictions || []).filter(
    (p) => p.oddsSnapshot?.source === 'The Odds API'
  );
  console.log(`The Odds API predictions 残留: ${residualTheOddsPreds.length} 条`);

  const verifyPred = verifyDb.predictions.find((p) => p.id === RESETTLE_PREDICTION.id);
  if (verifyPred) {
    console.log(`pred-f424c06b: odds=${verifyPred.oddsDecimal}, return=¥${verifyPred.settledReturn}, profit=¥${verifyPred.settledProfit}, source=${verifyPred.oddsSnapshot?.source}`);
  }

  const verifyWallet = verifyDb.wallets.find((w) => w.userId === 'user-52d9aa8c');
  if (verifyWallet) {
    console.log(`user-52d9aa8c 余额: ¥${verifyWallet.balance}`);
  }

  const verifyLog = verifyDb.syncLogs?.find((l) => l.id === AUDIT_LOG_ID);
  console.log(`审计日志: ${verifyLog ? '已保存' : '未找到'}`);

  console.log('');
  console.log('=== 纠正完成 ===');
  console.log(`清理 matchOdds: ${cleanedOdds} 条`);
  console.log(`重新结算 predictions: 1 条（pred-f424c06b）`);
  console.log(`回滚金额: ¥${rollbackAmount}`);
  console.log(`更新 predictions 来源: ${updatedPreds} 条`);

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
