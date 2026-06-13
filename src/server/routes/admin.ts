/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { dbService } from '../../db/db_service';
import { User, Wallet, MatchStatus } from '../../types';
import {
  generateStructuredAiContent,
  getOrGenerateLeaderboardCommentary,
  getOrGenerateMatchAnalysis,
  getOrGenerateMatchPrediction,
} from '../ai';
import { getRuntimeConfig } from '../config';
import {
  applyLifecycleUpdates,
  deriveOperationalStatus,
  deriveSettlementStatus,
} from '../operations';
import { syncFixturesForDateWindow, syncFixturesForDay, syncOddsForMatches } from '../sync';
import {
  createId,
  createAdminSession,
  requireAdmin,
  serializeUserForClient,
  serializeMatch,
  runScheduledMaintenance,
  ensureLifecycleForAllMatches,
  markMatchAiStale,
  markRoomLeaderboardAiStale,
  appendSyncLog,
  getIntegrationStatusPayload,
  getSystemStatusPayload,
  pickNearestMatchDay,
  getPinyinInitials,
} from '../helpers';
import { runBusinessTransaction } from '../services/transaction_guard';
import { settleMatchById } from '../services/settlement_service';
import { regeneratePostMatchReport } from '../services/post_match_report_service';
import { getSyncRuntimeState, getSyncPlan, getSyncHealthStatus } from '../services/sync_scheduler_service';
import { emitPointsAdjusted, emitUserJoined } from '../activity_service';
import { evaluateAllBadges, syncAllTitles } from '../badge_service';
import { initUserCardInventory, adjustUserCards, bootstrapAllCardInventories } from '../prediction_card_service';
import { createBackup, listBackups, restoreFromBackup } from '../backup';
import logger from '../logger';

const config = getRuntimeConfig();
const router = Router();

function generateUniqueLoginCode(existingCodes: Set<string>) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const width = attempt < 10 ? 4 : 6;
    const min = 10 ** (width - 1);
    const max = 10 ** width;
    const code = `WC${Math.floor(min + Math.random() * (max - min))}`;
    if (!existingCodes.has(code)) {
      existingCodes.add(code);
      return code;
    }
  }

  throw new Error('生成唯一登录码失败，请稍后重试。');
}

// 管理员登录

router.post('/api/admin/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!String(username || '').trim() || !String(password || '').trim()) {
    return res.status(400).json({ error: '请输入管理员账号和密码。' });
  }
  if (username !== config.adminUsername || password !== config.adminPassword) {
    return res.status(401).json({ error: '管理员账号或密码错误。' });
  }
  const token = createAdminSession();
  res.json({
    success: true,
    token,
    expiresAt: Date.now() + config.adminSessionTtlMs,
  });
});

// 鈹€鈹€鈹€ 绠＄悊闈㈡澘 鈹€鈹€鈹€

router.get('/api/admin/dashboard', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const db = dbService.getData();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartIso = todayStart.toISOString();

  res.json({
    usersCount: db.users.length,
    activeRooms: db.rooms.length,
    totalBetsCount: db.predictions.length,
    todayBetsCount: db.predictions.filter((p) => p.placedAt >= todayStartIso).length,
    matchesCount: db.matches.length,
    syncLogsCount: db.syncLogs.length,
    pendingSettlement: db.matches.filter((item) => deriveSettlementStatus(item) === 'WAITING_SETTLEMENT').length,
    lockingSoonMatches: db.matches.filter((item) => deriveOperationalStatus(item, Date.now(), config.predictionLockMinutes) === 'LOCKING_SOON').length,
    integrationStatus: getIntegrationStatusPayload(),
  });
});

// 鈹€鈹€鈹€ 闆嗘垚鐘舵€?鈹€鈹€鈹€

router.get('/api/admin/integrations/status', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  res.json(getIntegrationStatusPayload());
});

router.get('/api/admin/system/status', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  res.json(getSystemStatusPayload());
});

router.post('/api/admin/integrations/test-sync', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const db = dbService.getData();
  const date = String(req.body?.date || pickNearestMatchDay());
  const startedAt = new Date().toISOString();
  const fixtureResult = await syncFixturesForDay({
    apiKey: config.apiFootballKey,
    date,
    db,
  });
  appendSyncLog(fixtureResult.log);

  const sampleMatches = db.matches
    .filter((match) => match.startTimeUtc.slice(0, 10) === date)
    .slice(0, 3);

  const oddsResults = [];
  for (const match of sampleMatches) {
    const oddsResult = await syncOddsForMatches({
      apiKey: config.theOddsApiKey,
      db,
      targetMatchId: match.id,
    });
    appendSyncLog({
      ...oddsResult.log,
      targetMatchId: match.id,
    });
    oddsResults.push({
      matchId: match.id,
      homeTeam: db.teams.find((team) => team.id === match.homeTeamId)?.nameZh || match.homeTeamId,
      awayTeam: db.teams.find((team) => team.id === match.awayTeamId)?.nameZh || match.awayTeamId,
      synced: oddsResult.updatedMatchIds.includes(match.id),
      syncStatus: db.matchOdds[match.id]?.syncStatus || 'FAILED',
      source: db.matchOdds[match.id]?.source || 'MANUAL',
      lastSyncedAt: db.matchOdds[match.id]?.lastSyncedAt || null,
    });
  }

  dbService.save();
  res.json({
    startedAt,
    finishedAt: new Date().toISOString(),
    sampleDate: date,
    fixtures: {
      status: fixtureResult.log.status,
      updatedMatches: fixtureResult.updatedMatches.map((item) => item.id),
      responseSummary: fixtureResult.log.responseSummary,
      errorMessage: fixtureResult.log.errorMessage || null,
    },
    odds: oddsResults,
    integrationStatus: getIntegrationStatusPayload(),
  });
});

// 鈹€鈹€鈹€ 鐢ㄦ埛绠＄悊 鈹€鈹€鈹€

router.get('/api/admin/users', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const db = dbService.getData();
  res.json(
    db.users.map((user) => {
      const wallet = db.wallets.find((item) => item.userId === user.id);
      const predictions = db.predictions.filter((item) => item.userId === user.id);
      const room = db.rooms.find((item) => item.id === user.groupId);
      const inv = (db as any).cardInventories?.find((i: any) => i.userId === user.id);
      return {
        ...serializeUserForClient(user),
        groupName: room?.name || '未分组',
        balance: wallet?.balance || 0,
        betsCount: predictions.length,
        cards: inv?.cards || {},
        hasPin: Boolean(user.pinHash),
      };
    }),
  );
});

router.post('/api/admin/users/bulk', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { names, roomId = dbService.getPrimaryRoomId() } = req.body;
  if (!names || !roomId) return res.status(400).json({ error: '缺少名字列表或房间 ID。' });

  const db = dbService.getData();
  const createdUsers: User[] = [];
  const existingCodes = new Set(db.users.map((item) => item.loginCode));
  const namesList = String(names)
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

  for (const name of namesList) {
    const userId = createId('user');
    const user: User = {
      id: userId,
      groupId: roomId,
      displayName: name,
      avatarUrl: ['⚽', '🏆', '🎯', '🔥', '🌟', '🎖️'][Math.floor(Math.random() * 6)],
      loginCode: generateUniqueLoginCode(existingCodes),
      pinHash: '1234',
      status: 'UNCLAIMED',
      createdAt: new Date().toISOString(),
    };
    const wallet: Wallet = {
      userId,
      balance: 10000,
      initialPoints: 10000,
    };
    db.users.push(user);
    db.wallets.push(wallet);
    db.transactions.push({
      id: createId('init'),
      userId,
      type: 'INITIAL_GRANT',
      amount: 10000,
      balanceBefore: 0,
      balanceAfter: 10000,
      note: '管理员批量预置账号',
      createdAt: new Date().toISOString(),
    });
    createdUsers.push(user);
    initUserCardInventory(userId);
  }

  dbService.save();
  res.json({ success: true, createdUsers });
});

router.put('/api/admin/users/:id', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const db = dbService.getData();
  const user = db.users.find((item) => item.id === req.params.id);
  if (!user) return res.status(404).json({ error: '用户不存在。' });

  const { displayName, status, pin } = req.body;
  if (displayName) user.displayName = displayName;
  if (status) user.status = status;
  if (pin) user.pinHash = String(pin).trim();
  dbService.save();
  res.json({ success: true, user });
});

// 鈹€鈹€鈹€ 鍗曚釜鍒涘缓璐﹀彿锛堥瀛楁瘝鐧诲綍锛?鈹€鈹€鈹€

router.post('/api/admin/users/create', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { displayName, loginCode, roomId, initialPoints } = req.body;
  if (!displayName || !displayName.trim()) {
    return res.status(400).json({ error: '请输入用户昵称。' });
  }
  if (!loginCode || !loginCode.trim()) {
    return res.status(400).json({ error: '请输入登录码。' });
  }

  const db = dbService.getData();
  const name = displayName.trim();
  const code = loginCode.trim().toUpperCase();

  // 妫€鏌ョ櫥褰曠爜鏄惁宸茶鍗犵敤
  const existingUser = db.users.find((u) => u.loginCode === code);
  if (existingUser) {
    return res.status(400).json({
      error: `登录码 "${code}" 已被用户 "${existingUser.displayName}" 占用，请更换。`,
    });
  }

  const userId = createId('user');
  const points = Number(initialPoints) || 10000;
  const user: User = {
    id: userId,
    groupId: roomId || dbService.getPrimaryRoomId(),
    displayName: name,
    avatarUrl: '', // 鍒濆涓虹┖锛岀鐞嗗憳鍚庣画涓婁紶
    loginCode: code,
    pinHash: '', // 绌?PIN锛屾敮鎸佹棤 PIN 鐧诲綍
    status: 'UNCLAIMED',
    createdAt: new Date().toISOString(),
  };
  const wallet: Wallet = {
    userId,
    balance: points,
    initialPoints: points,
  };
  db.users.push(user);
  db.wallets.push(wallet);
  db.transactions.push({
    id: createId('init'),
    userId,
    type: 'INITIAL_GRANT',
    amount: points,
    balanceBefore: 0,
    balanceAfter: points,
    note: '管理员创建账号',
    createdAt: new Date().toISOString(),
  });

  // 初始化卡牌库存
  initUserCardInventory(userId);

  dbService.save();
  logger.admin('[Admin] Created user', {
    displayName: name,
    loginCode: code,
    userId,
  });
  res.json({
    success: true,
    user: serializeUserForClient(user),
    loginCode: code,
    message: `璐﹀彿鍒涘缓鎴愬姛锛佺櫥褰曠爜: ${code}`,
  });
});

// 鈹€鈹€鈹€ 鍒犻櫎璐﹀彿 鈹€鈹€鈹€

router.delete('/api/admin/users/:id', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const db = dbService.getData();
  const userId = req.params.id;

  const userIndex = db.users.findIndex((item) => item.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ error: '用户不存在。' });
  }

  const user = db.users[userIndex];

  // 鍒犻櫎鍏宠仈鏁版嵁
  const walletIndex = db.wallets.findIndex((item) => item.userId === userId);
  if (walletIndex !== -1) {
    db.wallets.splice(walletIndex, 1);
  }

  // 鍒犻櫎棰勬祴璁板綍
  db.predictions = db.predictions.filter((item) => item.userId !== userId);

  // 鍒犻櫎浜ゆ槗璁板綍
  db.transactions = db.transactions.filter((item) => item.userId !== userId);

  // 鍒犻櫎鐢ㄦ埛
  db.users.splice(userIndex, 1);

  dbService.save();
  logger.admin('[Admin] Deleted user', {
    displayName: user.displayName,
    loginCode: user.loginCode,
    userId,
  });
  res.json({
    success: true,
    message: `已删除用户 "${user.displayName}" 及其所有数据。`,
  });
});

// 鈹€鈹€鈹€ 涓婁紶澶村儚锛圔ase64 瀛樺偍锛?鈹€鈹€鈹€

router.put('/api/admin/users/:id/avatar', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { avatarUrl } = req.body;

  if (!avatarUrl || typeof avatarUrl !== 'string') {
    return res.status(400).json({ error: '请提供有效的头像数据（Base64 格式）。' });
  }

  // 楠岃瘉 Base64 鍥剧墖鏍煎紡
  if (!avatarUrl.startsWith('data:image/')) {
    return res.status(400).json({ error: '头像格式不正确，仅支持图片格式。' });
  }

  // 限制图片大小（Base64 编码后约 2MB）
  if (avatarUrl.length > 3 * 1024 * 1024) {
    return res.status(400).json({ error: '头像图片过大，请选择小于 2MB 的图片。' });
  }

  const db = dbService.getData();
  const user = db.users.find((item) => item.id === req.params.id);
  if (!user) return res.status(404).json({ error: '用户不存在。' });

  user.avatarUrl = avatarUrl;
  dbService.save();
  logger.admin('[Admin] Updated avatar', {
    displayName: user.displayName,
    userId: user.id,
  });
  res.json({
    success: true,
    message: '头像上传成功。',
    avatarUrl,
  });
});

router.post('/api/admin/users/:id/adjust-points', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount === 0) {
    return res.status(400).json({ error: '调整额度必须是非 0 数字。' });
  }

  const db = dbService.getData();
  const wallet = db.wallets.find((item) => item.userId === req.params.id);
  if (!wallet) return res.status(404).json({ error: '钱包不存在。' });

  const user = db.users.find((u) => u.id === req.params.id);

  const oldBalance = wallet.balance;
  wallet.balance = Math.max(0, wallet.balance + amount);
  const reason = req.body.reason || '管理员手动调整积分';
  db.transactions.push({
    id: createId('adj'),
    userId: req.params.id,
    type: 'ADMIN_ADJUST',
    amount,
    balanceBefore: oldBalance,
    balanceAfter: wallet.balance,
    note: reason,
    createdAt: new Date().toISOString(),
  });

  // 触发动态
  if (user) {
    try {
      emitPointsAdjusted({
        userId: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        amount,
        reason,
        balanceAfter: wallet.balance,
        groupId: user.groupId,
      });
    } catch (e) {
      logger.admin('[Admin] Failed to emit points adjustment activity', {
        error: e instanceof Error ? e.message : String(e),
        userId: user.id,
      });
    }
  }

  dbService.save();
  res.json({ success: true, balance: wallet.balance });
});

// 鈹€鈹€鈹€ 缁存姢锛氳瘎浼版墍鏈夊窘绔犱笌绉板彿 鈹€鈹€鈹€
router.post('/api/admin/badges/reevaluate', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const badgeResult = evaluateAllBadges();
  const titleResult = syncAllTitles();
  res.json({ success: true, ...badgeResult, ...titleResult });
});

// 鈹€鈹€鈹€ 鍗＄墝绠＄悊锛氱粰鐢ㄦ埛澧炲噺鍗＄墝 鈹€鈹€鈹€
router.post('/api/admin/users/:id/cards/adjust', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const cardId = String(req.body.cardId || '');
  const delta = Number(req.body.delta);
  const VALID = ['NO_LOSS', 'DOUBLE', 'REGRET', 'FLOOR'];
  if (!VALID.includes(cardId)) {
    return res.status(400).json({ error: '不支持的卡牌类型。' });
  }
  if (!Number.isFinite(delta) || delta === 0) {
    return res.status(400).json({ error: '调整数量必须是非 0 整数。' });
  }
  const inv = adjustUserCards(req.params.id, cardId as any, Math.trunc(delta));
  dbService.save();
  res.json({ success: true, cards: inv.cards, updatedAt: inv.updatedAt });
});

// 鈹€鈹€鈹€ 鍗＄墝绠＄悊锛氱粰鎵€鏈夌敤鎴疯ˉ榻愬垵濮嬪崱鐗?鈹€鈹€鈹€
router.post('/api/admin/cards/bootstrap', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const result = bootstrapAllCardInventories();
  res.json({ success: true, ...result });
});

// 鈹€鈹€鈹€ 鍗＄墝绠＄悊锛氭煡鐪嬪崱鐗屼娇鐢ㄦ儏鍐电粺璁?鈹€鈹€鈹€
router.get('/api/admin/cards/stats', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const db = dbService.getData();
  const inventories = (db as any).cardInventories || [];

  // 各卡牌总库存
  const totalStock: Record<string, number> = { NO_LOSS: 0, DOUBLE: 0, REGRET: 0, FLOOR: 0 };
  // 鍚勫崱鐗屽凡浣跨敤娆℃暟
  const usedCount: Record<string, number> = { NO_LOSS: 0, DOUBLE: 0, REGRET: 0, FLOOR: 0 };

  for (const inv of inventories) {
    for (const k of Object.keys(totalStock)) {
      totalStock[k] += inv.cards?.[k] || 0;
    }
  }
  for (const p of db.predictions) {
    if (p.usedCard && usedCount[p.usedCard] !== undefined) {
      usedCount[p.usedCard] += 1;
    }
  }

  // 浣跨敤璁板綍锛堟渶杩?50 鏉★級
  const recentUses = db.predictions
    .filter((p) => p.usedCard)
    .sort((a, b) => (b.placedAt || '').localeCompare(a.placedAt || ''))
    .slice(0, 50)
    .map((p) => {
      const u = db.users.find((x) => x.id === p.userId);
      const m = db.matches.find((x) => x.id === p.matchId);
      return {
        predictionId: p.id,
        cardId: p.usedCard,
        cardNote: p.cardEffectNotes,
        userName: u?.displayName || '鍖垮悕',
        userLoginCode: u?.loginCode,
        matchLabel: m ? `${m.homeTeam?.name || ''} vs ${m.awayTeam?.name || ''}`.trim() : p.matchId,
        placedAt: p.placedAt,
        status: p.status,
      };
    });

  res.json({
    totalStock,
    usedCount,
    totalUsers: db.users.length,
    inventoriedUsers: inventories.length,
    recentUses,
  });
});

// 鈹€鈹€鈹€ 姣旇禌绠＄悊 鈹€鈹€鈹€

router.put('/api/admin/matches/:id', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const db = dbService.getData();
  const match = db.matches.find((item) => item.id === req.params.id);
  if (!match) return res.status(404).json({ error: '比赛不存在。' });

  const { homeScore, awayScore, status, isOddsFrozen, isPredictionLocked, winnerTeamId, resetToNS } = req.body;
  if (status) match.status = status as MatchStatus;
  if (homeScore !== undefined) {
    const n = Number(homeScore);
    match.homeScore = Number.isNaN(n) ? undefined : n;
  }
  if (awayScore !== undefined) {
    const n = Number(awayScore);
    match.awayScore = Number.isNaN(n) ? undefined : n;
  }
  if (winnerTeamId !== undefined) match.winnerTeamId = winnerTeamId || undefined;
  if (isOddsFrozen !== undefined) {
    match.isOddsFrozen = Boolean(isOddsFrozen);
    match.oddsFrozenAt = match.isOddsFrozen ? new Date().toISOString() : undefined;
  }
  if (isPredictionLocked !== undefined) {
    match.isPredictionLocked = Boolean(isPredictionLocked);
    match.predictionLockedAt = match.isPredictionLocked ? new Date().toISOString() : undefined;
  }
  // 完整重置为未开赛状态
  if (resetToNS) {
    match.status = MatchStatus.NS;
    match.isSettled = false;
    match.settlementStatus = 'PENDING';
    match.isOddsFrozen = false;
    match.isPredictionLocked = false;
    match.oddsFrozenAt = undefined;
    match.predictionLockedAt = undefined;
    match.settledAt = undefined;
    match.homeScore = undefined;
    match.awayScore = undefined;
    match.winnerTeamId = undefined;
    // 回滚该比赛关联的已结算预测
    const matchPredictions = db.predictions.filter((p) => p.matchId === match.id);
    for (const pred of matchPredictions) {
      if (pred.status === 'WON' || pred.status === 'LOST') {
        // 回退钱包：扣除已发放的中奖金额
        if (pred.status === 'WON' && pred.settledReturn) {
          const wallet = db.wallets.find((w) => w.userId === pred.userId);
          if (wallet) {
            wallet.balance -= pred.settledReturn;
            if (wallet.balance < 0) wallet.balance = 0;
          }
        }
        pred.status = 'PENDING';
        pred.settledReturn = undefined;
        pred.settledProfit = undefined;
        pred.settledAt = undefined;
      }
    }
  }
  applyLifecycleUpdates(match, config.predictionLockMinutes);
  dbService.refreshBracketState();
  markMatchAiStale(match.id);
  markRoomLeaderboardAiStale(dbService.getPrimaryRoomId());
  dbService.save();
  res.json({ success: true, match: serializeMatch(match) });
});

router.put('/api/admin/matches/:id/odds', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const db = dbService.getData();
  const existing = db.matchOdds[req.params.id] || {
    matchId: req.params.id,
    h2h: { homeWin: 2, draw: 3, awayWin: 3 },
    correctScore: [{ score: '1-0', odds: 6 }, { score: '1-1', odds: 5.5 }],
    totalGoals: { over25: 1.9, under25: 1.9 },
    lastUpdated: new Date().toISOString(),
    source: 'MANUAL' as const,
  };

  existing.h2h.homeWin = Number(req.body.homeWin ?? existing.h2h.homeWin);
  existing.h2h.draw = Number(req.body.draw ?? existing.h2h.draw);
  existing.h2h.awayWin = Number(req.body.awayWin ?? existing.h2h.awayWin);
  existing.totalGoals.over25 = Number(req.body.over25 ?? existing.totalGoals.over25);
  existing.totalGoals.under25 = Number(req.body.under25 ?? existing.totalGoals.under25);
  existing.lastUpdated = new Date().toISOString();
  existing.source = 'MANUAL';

  db.matchOdds[req.params.id] = existing;
  markMatchAiStale(req.params.id);
  dbService.save();
  res.json({ success: true, odds: existing });
});

router.post('/api/admin/matches/:id/settle', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const db = dbService.getData();
  const match = db.matches.find((item) => item.id === req.params.id);
  if (!match) return res.status(404).json({ error: '比赛不存在。' });

  try {
    const rawForce = req.body?.forceResettle ?? req.query.forceResettle;
    const forceResettle = rawForce === true || rawForce === 'true' || rawForce === 1 || rawForce === '1';
    const result = await runBusinessTransaction('adminSettleMatch', async () => {
      return await settleMatchById({
        matchId: match.id,
        source: 'ADMIN',
        adminUser: 'admin',
        forceResettle,
      });
    });
    res.json({ success: true, count: result.settledPredictions, forceResettle });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : '结算失败。' });
  }
});

// 鈹€鈹€鈹€ 鍚屾绠＄悊 鈹€鈹€鈹€

router.post('/api/admin/sync/fixtures', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const db = dbService.getData();
  const date = req.body?.date as string | undefined;
  const result = date
    ? await syncFixturesForDay({
        apiKey: config.apiFootballKey,
        date,
        db,
      })
    : await syncFixturesForDateWindow({
        apiKey: config.apiFootballKey,
        db,
      });
  appendSyncLog(result.log);
  ensureLifecycleForAllMatches();
  [...result.updatedMatches, ...result.createdMatches].forEach((item) => markMatchAiStale(item.id));
  dbService.refreshBracketState();
  dbService.save();
  res.json({
    success: result.log.status !== 'FAILED',
    updatedMatches: result.updatedMatches.map((item) => item.id),
    createdMatches: result.createdMatches.map((item) => item.id),
    log: result.log,
  });
});

router.post('/api/admin/sync/window', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const db = dbService.getData();
  const result = await syncFixturesForDateWindow({
    apiKey: config.apiFootballKey,
    db,
    anchorDate: req.body?.anchorDate ? String(req.body.anchorDate) : undefined,
    pastDays: Number.isFinite(Number(req.body?.pastDays)) ? Number(req.body.pastDays) : undefined,
    futureDays: Number.isFinite(Number(req.body?.futureDays)) ? Number(req.body.futureDays) : undefined,
  });

  appendSyncLog(result.log);
  ensureLifecycleForAllMatches();
  [...result.updatedMatches, ...result.createdMatches].forEach((item) => markMatchAiStale(item.id));
  dbService.refreshBracketState();
  dbService.save();

  res.json({
    success: result.log.status !== 'FAILED',
    dates: result.dates,
    updatedMatches: result.updatedMatches.map((item) => item.id),
    createdMatches: result.createdMatches.map((item) => item.id),
    log: result.log,
  });
});

router.post('/api/admin/sync/today', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const db = dbService.getData();
  const fixturesResult = await syncFixturesForDateWindow({
    apiKey: config.apiFootballKey,
    db,
  });
  const oddsResult = await syncOddsForMatches({
    apiKey: config.theOddsApiKey,
    db,
  });
  appendSyncLog(fixturesResult.log);
  appendSyncLog(oddsResult.log);
  ensureLifecycleForAllMatches();
  [...fixturesResult.updatedMatches, ...fixturesResult.createdMatches].forEach((item) => markMatchAiStale(item.id));
  oddsResult.updatedMatchIds.forEach((item) => markMatchAiStale(item));
  dbService.refreshBracketState();
  dbService.save();
  res.json({
    success: fixturesResult.log.status !== 'FAILED' || oddsResult.log.status !== 'FAILED',
    fixturesUpdated: fixturesResult.updatedMatches.map((item) => item.id),
    fixturesCreated: fixturesResult.createdMatches.map((item) => item.id),
    oddsUpdated: oddsResult.updatedMatchIds,
  });
});

router.post('/api/admin/sync/matches/:id', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const db = dbService.getData();
  const match = db.matches.find((item) => item.id === req.params.id);
  if (!match) return res.status(404).json({ error: '比赛不存在。' });

  const date = match.startTimeUtc.slice(0, 10);
  const fixturesResult = await syncFixturesForDay({
    apiKey: config.apiFootballKey,
    date,
    db,
  });
  const oddsResult = await syncOddsForMatches({
    apiKey: config.theOddsApiKey,
    db,
    targetMatchId: match.id,
  });
  appendSyncLog({
    ...fixturesResult.log,
    targetMatchId: match.id,
  });
  appendSyncLog({
    ...oddsResult.log,
    targetMatchId: match.id,
  });
  ensureLifecycleForAllMatches();
  [...fixturesResult.updatedMatches, ...fixturesResult.createdMatches].forEach((item) => markMatchAiStale(item.id));
  oddsResult.updatedMatchIds.forEach((item) => markMatchAiStale(item));
  dbService.refreshBracketState();
  dbService.save();
  res.json({
    success: true,
    updatedMatch: serializeMatch(match),
    fixturesCreated: fixturesResult.createdMatches.map((item) => item.id),
    oddsUpdated: oddsResult.updatedMatchIds.includes(match.id),
  });
});

// 鈹€鈹€鈹€ AI 绠＄悊 鈹€鈹€鈹€

router.post('/api/admin/ai/match/:id/pre', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const db = dbService.getData();
  const match = db.matches.find((item) => item.id === req.params.id);
  if (!match) return res.status(404).json({ error: '比赛不存在。' });

  const home = db.teams.find((team) => team.id === match.homeTeamId)?.nameZh || '涓婚槦';
  const away = db.teams.find((team) => team.id === match.awayTeamId)?.nameZh || '瀹㈤槦';
  const odds = db.matchOdds[match.id];
  const prompt = `请为 ${home} vs ${away} 生成一张赛前速览卡。要求：先给结论，再给 2 到 3 条简短要点，最后补一句风险提醒。可参考信息：阶段 ${match.stage}，地点 ${match.venueCity || '待定'}，胜平负指数 ${odds ? `${odds.h2h.homeWin}/${odds.h2h.draw}/${odds.h2h.awayWin}` : '暂无'}。`;

  const aiContent = await generateStructuredAiContent({
    type: 'PRE_MATCH_ANALYSIS',
    title: `AI 赛前速览：${home} vs ${away}`,
    prompt,
    fallbackBody: `${home} 和 ${away} 这场比赛适合先看首发和临场变化，再决定娱乐积分怎么分配。`,
    deepSeekApiKey: config.deepSeekApiKey,
    geminiApiKey: config.geminiApiKey,
  });
  aiContent.matchId = match.id;

  const existingIndex = db.aiContents.findIndex((item) => item.type === 'PRE_MATCH_ANALYSIS' && item.matchId === match.id);
  if (existingIndex >= 0) {
    db.aiContents[existingIndex] = aiContent;
  } else {
    db.aiContents.unshift(aiContent);
  }
  appendSyncLog({
    id: createId('sync'),
    source: aiContent.provider || 'Local',
    action: 'Generate pre-match AI brief',
    syncType: 'ai',
    status: 'SUCCESS',
    requestSummary: `Generate AI pre-match brief for ${match.id}`,
    responseSummary: `${aiContent.provider || aiContent.model} produced a structured match brief.`,
    targetMatchId: match.id,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });
  dbService.save();
  res.json({ success: true, aiContent });
});

router.post('/api/admin/ai/match/:id/regenerate', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const db = dbService.getData();
  try {
    const [prediction, analysis] = await Promise.all([
      getOrGenerateMatchPrediction({ db, config, matchId: req.params.id, enhancementMode: 'off', forceRefresh: true }),
      getOrGenerateMatchAnalysis({ db, config, matchId: req.params.id, enhancementMode: 'off', forceRefresh: true }),
    ]);
    appendSyncLog({
      id: createId('sync'),
      source: analysis.provider || 'Local',
      action: 'Regenerate official AI content',
      syncType: 'ai',
      status: 'SUCCESS',
      requestSummary: `Regenerate prediction + analysis for ${req.params.id}`,
      responseSummary: `${analysis.provider || 'Local'} regenerated official AI content.`,
      targetMatchId: req.params.id,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    dbService.save();
    res.json({ success: true, prediction, analysis });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'AI regenerate failed.' });
  }
});

router.post('/api/admin/ai/match/:id/enhance-search', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const db = dbService.getData();
  try {
    const analysis = await getOrGenerateMatchAnalysis({
      db,
      config,
      matchId: req.params.id,
      enhancementMode: 'search',
      forceRefresh: true,
    });
    appendSyncLog({
      id: createId('sync'),
      source: analysis.provider || 'Local',
      action: 'Regenerate search-enhanced AI content',
      syncType: 'ai',
      status: 'SUCCESS',
      requestSummary: `Search-enhanced analysis for ${req.params.id}`,
      responseSummary: `${analysis.provider || 'Local'} generated search-enhanced analysis.`,
      targetMatchId: req.params.id,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    dbService.save();
    res.json({ success: true, analysis });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Search enhancement failed.' });
  }
});

router.post('/api/admin/ai/match/:id/enhance-multimodal', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const db = dbService.getData();
  try {
    const sourceImageUrls = Array.isArray(req.body?.sourceImageUrls)
      ? req.body.sourceImageUrls.map((item: unknown) => String(item))
      : [];
    const analysis = await getOrGenerateMatchAnalysis({
      db,
      config,
      matchId: req.params.id,
      enhancementMode: sourceImageUrls.length > 0 ? 'search_multimodal' : 'multimodal',
      forceRefresh: true,
      sourceImageUrls,
    });
    appendSyncLog({
      id: createId('sync'),
      source: analysis.provider || 'Local',
      action: 'Regenerate multimodal AI content',
      syncType: 'ai',
      status: 'SUCCESS',
      requestSummary: `Multimodal analysis for ${req.params.id}`,
      responseSummary: `${analysis.provider || 'Local'} generated multimodal analysis.`,
      targetMatchId: req.params.id,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    dbService.save();
    res.json({ success: true, analysis });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Multimodal enhancement failed.' });
  }
});

router.post('/api/admin/ai/leaderboard/:roomId/regenerate', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const db = dbService.getData();
  try {
    const aiContent = await getOrGenerateLeaderboardCommentary({
      db,
      config,
      roomId: req.params.roomId,
      enhancementMode: 'off',
      forceRefresh: true,
    });
    appendSyncLog({
      id: createId('sync'),
      source: aiContent.provider || 'Local',
      action: 'Regenerate leaderboard commentary',
      syncType: 'ai',
      status: 'SUCCESS',
      requestSummary: `Regenerate leaderboard commentary for ${req.params.roomId}`,
      responseSummary: `${aiContent.provider || aiContent.model} regenerated leaderboard commentary.`,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    dbService.save();
    res.json({ success: true, aiContent });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Leaderboard regenerate failed.' });
  }
});

// 鈹€鈹€鈹€ 鍚屾鏃ュ織 鈹€鈹€鈹€

router.get('/api/admin/sync-logs', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const status = req.query.status as string | undefined;
  const type = req.query.type as string | undefined;
  const matchId = req.query.matchId as string | undefined;

  const logs = dbService.getSyncLogs().filter((log) => {
    if (status && log.status !== status) return false;
    if (type && log.syncType !== type) return false;
    if (matchId && log.targetMatchId !== matchId) return false;
    return true;
  });
  res.json(logs);
});

// ─── 备份管理 ───

// 列出所有备份
router.get('/api/admin/backups', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const backups = listBackups();
  res.json({ backups });
});

// 手动创建备份
router.post('/api/admin/backups', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const reason = String(req.body?.reason || 'admin-manual');
  const result = createBackup(reason);
  res.json(result);
});

// 从备份恢复（支持全量恢复和精确恢复单个用户）
router.post('/api/admin/backups/restore', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { backupFileName, mode, targetUserId } = req.body;

  if (!backupFileName) {
    return res.status(400).json({ error: '请指定备份文件名。' });
  }
  if (!mode || !['full', 'user'].includes(mode)) {
    return res.status(400).json({ error: '模式必须是 "full"（全量恢复）或 "user"（恢复单个用户）。' });
  }
  if (mode === 'user' && !targetUserId) {
    return res.status(400).json({ error: '恢复单个用户时必须提供 targetUserId。' });
  }

  // 全量恢复前先创建当前数据库的备份
  if (mode === 'full') {
    const preRestoreBackup = createBackup('pre-restore-safety');
    if (!preRestoreBackup.ok) {
      return res.status(500).json({ error: '恢复前自动备份失败，中止操作。' });
    }
  }

  const result = restoreFromBackup(backupFileName, { mode, targetUserId } as any);

  if (result.ok) {
    logger.admin('[Admin] Backup restored', {
      backupFileName,
      mode,
      targetUserId,
      result,
    });
  }

  res.json(result);
});

// 从备份中列出可恢复的用户（用于前端选择）
router.get('/api/admin/backups/:fileName/users', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const fs = require('fs');
    const path = require('path');
    const backupDir = process.env.APP_DATA_DIR
      ? path.resolve(process.cwd(), process.env.APP_DATA_DIR)
      : process.cwd();
    const backupPath = path.join(backupDir, 'backups', req.params.fileName);
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: '备份文件不存在。' });
    }
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    const users = (backupData.users || []).map((u: any) => {
      const wallet = (backupData.wallets || []).find((w: any) => w.userId === u.id);
      const predictionCount = (backupData.predictions || []).filter((p: any) => p.userId === u.id).length;
      return {
        id: u.id,
        displayName: u.displayName,
        loginCode: u.loginCode,
        status: u.status,
        balance: wallet?.balance ?? 0,
        predictionCount,
      };
    });
    res.json({ users, totalUsers: users.length });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : '读取备份失败。' });
  }
});

// ─── 同步运行状态 ───

router.get('/api/admin/sync-state', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const state = getSyncRuntimeState();
  const plan = getSyncPlan();
  const health = getSyncHealthStatus();
  res.json({ state, plan, health });
});

// ─── 同步健康检查（无需管理员认证，供监控系统使用） ───

router.get('/api/health/sync', (_req: Request, res: Response) => {
  const health = getSyncHealthStatus();
  const isHealthy = health.fixtures.isHealthy && health.odds.isHealthy && health.liveScore.isHealthy;
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    ...health,
  });
});

// 鈹€鈹€鈹€ 绔炵寽璁板綍鏌ヨ 鈹€鈹€鈹€

router.get('/api/admin/predictions', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const db = dbService.getData();
  const userId = String(req.query.userId || '');
  const matchId = String(req.query.matchId || '');
  const status = String(req.query.status || '');
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));

  let result = [...db.predictions];
  if (userId) result = result.filter((p) => p.userId === userId);
  if (matchId) result = result.filter((p) => p.matchId === matchId);
  if (status) result = result.filter((p) => p.status === status);

  result.sort((a, b) => (b.placedAt || '').localeCompare(a.placedAt || ''));

  const total = result.length;
  const items = result.slice((page - 1) * pageSize, page * pageSize).map((p) => {
    const user = db.users.find((u) => u.id === p.userId);
    const match = db.matches.find((m) => m.id === p.matchId);
    return {
      id: p.id,
      userId: p.userId,
      userName: user?.displayName || '鏈煡',
      userLoginCode: user?.loginCode,
      matchId: p.matchId,
      matchLabel: match ? `${match.homeTeam?.nameZh || ''} vs ${match.awayTeam?.nameZh || ''}` : p.matchId,
      market: p.market,
      optionLabel: p.optionLabel,
      oddsDecimal: p.oddsDecimal,
      stakePoints: p.stakePoints,
      potentialReturn: p.potentialReturn,
      status: p.status,
      usedCard: p.usedCard || null,
      placedAt: p.placedAt,
      settledAt: p.settledAt || null,
    };
  });

  res.json({ total, page, pageSize, items });
});

// 鈹€鈹€鈹€ 绉垎娴佹按鏌ョ湅 鈹€鈹€鈹€

router.get('/api/admin/transactions', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const db = dbService.getData();
  const userId = String(req.query.userId || '');
  const type = String(req.query.type || '');
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));

  let result = [...db.transactions];
  if (userId) result = result.filter((t) => t.userId === userId);
  if (type) result = result.filter((t) => t.type === type);

  result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const total = result.length;
  const items = result.slice((page - 1) * pageSize, page * pageSize).map((t) => {
    const user = db.users.find((u) => u.id === t.userId);
    return {
      id: t.id,
      userId: t.userId,
      userName: user?.displayName || '鏈煡',
      type: t.type,
      amount: t.amount,
      balanceBefore: t.balanceBefore,
      balanceAfter: t.balanceAfter,
      note: t.note,
      createdAt: t.createdAt,
    };
  });

  res.json({ total, page, pageSize, items });
});

// 鈹€鈹€鈹€ AI 鍐呭閲嶆柊鐢熸垚 鈹€鈹€鈹€

router.post('/api/admin/ai/regenerate/:id', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const db = dbService.getData();
  const aiContent = db.aiContents.find((item) => item.id === req.params.id);
  if (!aiContent) {
    return res.status(404).json({ error: 'AI 内容不存在。' });
  }

  try {
    const newContent = await generateStructuredAiContent({
      config,
      type: aiContent.type,
      title: aiContent.title,
      prompt: `璇烽噸鏂扮敓鎴愪互涓嬪唴瀹圭殑鏇存柊鐗堟湰锛?{aiContent.title}`,
      fallbackBody: aiContent.content || aiContent.summary || 'AI 鍐呭閲嶆柊鐢熸垚涓?..',
      matchId: aiContent.matchId,
    });

    // 替换旧内容
    const idx = db.aiContents.findIndex((item) => item.id === req.params.id);
    if (idx >= 0) {
      db.aiContents[idx] = newContent;
    }

    appendSyncLog({
      id: createId('sync'),
      source: newContent.provider || 'Local',
      action: 'Regenerate AI content',
      syncType: 'ai',
      status: 'SUCCESS',
      requestSummary: `Regenerate ${aiContent.type} content`,
      responseSummary: `${newContent.provider || 'Local'} / ${newContent.model}`,
      targetMatchId: aiContent.matchId,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    dbService.save();
    res.json({ success: true, aiContent: newContent });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'AI 内容重新生成失败。' });
  }
});

router.post('/api/admin/matches/:id/post-report/regenerate', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    const report = regeneratePostMatchReport(req.params.id);
    dbService.save();
    res.json({ success: true, report });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : '战报重新生成失败。' });
  }
});

export default router;
