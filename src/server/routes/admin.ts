/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { dbService } from '../../db/db_service';
import { User, Wallet } from '../../types';
import {
  generateStructuredAiContent,
  getOrGenerateLeaderboardCommentary,
  getOrGenerateMatchAnalysis,
  getOrGenerateMatchPrediction,
} from '../ai';
import { getRuntimeConfig, summarizeProviderConfig } from '../config';
import {
  applyLifecycleUpdates,
  deriveOperationalStatus,
  deriveSettlementStatus,
} from '../operations';
import { syncFixturesForDay, syncOddsForMatches, ensureDefaultOdds } from '../sync';
import {
  createId,
  createAdminSession,
  requireAdmin,
  serializeUserForClient,
  serializeMatch,
  settleMatch,
  runScheduledMaintenance,
  ensureLifecycleForAllMatches,
  markMatchAiStale,
  markRoomLeaderboardAiStale,
  appendSyncLog,
  getIntegrationStatusPayload,
  pickNearestMatchDay,
  getPinyinInitials,
} from '../helpers';

const config = getRuntimeConfig();
const router = Router();

// ─── 管理员登录 ───

router.post('/api/admin/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
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

// ─── 管理面板 ───

router.get('/api/admin/dashboard', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const db = dbService.getData();
  res.json({
    usersCount: db.users.length,
    activeRooms: db.rooms.length,
    totalBetsCount: db.predictions.length,
    matchesCount: db.matches.length,
    syncLogsCount: db.syncLogs.length,
    pendingSettlement: db.matches.filter((item) => deriveSettlementStatus(item) === 'WAITING_SETTLEMENT').length,
    lockingSoonMatches: db.matches.filter((item) => deriveOperationalStatus(item, Date.now(), config.predictionLockMinutes) === 'LOCKING_SOON').length,
  });
});

// ─── 集成状态 ───

router.get('/api/admin/integrations/status', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  res.json(getIntegrationStatusPayload());
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

// ─── 用户管理 ───

router.get('/api/admin/users', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const db = dbService.getData();
  res.json(
    db.users.map((user) => {
      const wallet = db.wallets.find((item) => item.userId === user.id);
      const predictions = db.predictions.filter((item) => item.userId === user.id);
      const room = db.rooms.find((item) => item.id === user.groupId);
      return {
        ...serializeUserForClient(user),
        groupName: room?.name || '未分组',
        balance: wallet?.balance || 0,
        betsCount: predictions.length,
        hasPin: Boolean(user.pinHash),
      };
    }),
  );
});

router.post('/api/admin/users/bulk', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { names, roomId } = req.body;
  if (!names || !roomId) return res.status(400).json({ error: '缺少名字列表或房间 ID。' });

  const db = dbService.getData();
  const createdUsers: User[] = [];
  const namesList = String(names)
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

  for (const name of namesList) {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const userId = createId('user');
    const user: User = {
      id: userId,
      groupId: roomId,
      displayName: name,
      avatarUrl: ['⚽', '🏆', '🥅', '🔥', '🎯', '🎉'][Math.floor(Math.random() * 6)],
      loginCode: `WC${suffix}`,
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

// ─── 单个创建账号（首字母登录） ───

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

  // 检查登录码是否已被占用
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
    groupId: roomId || 'room-1',
    displayName: name,
    avatarUrl: '', // 初始为空，管理员后续上传
    loginCode: code,
    pinHash: '', // 空 PIN，支持无 PIN 登录
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

  dbService.save();
  console.log(`[Admin] 创建账号: ${name} (登录码: ${code})`);
  res.json({
    success: true,
    user: serializeUserForClient(user),
    loginCode: code,
    message: `账号创建成功！登录码: ${code}`,
  });
});

// ─── 删除账号 ───

router.delete('/api/admin/users/:id', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const db = dbService.getData();
  const userId = req.params.id;

  const userIndex = db.users.findIndex((item) => item.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ error: '用户不存在。' });
  }

  const user = db.users[userIndex];

  // 删除关联数据
  const walletIndex = db.wallets.findIndex((item) => item.userId === userId);
  if (walletIndex !== -1) {
    db.wallets.splice(walletIndex, 1);
  }

  // 删除预测记录
  db.predictions = db.predictions.filter((item) => item.userId !== userId);

  // 删除交易记录
  db.transactions = db.transactions.filter((item) => item.userId !== userId);

  // 删除用户
  db.users.splice(userIndex, 1);

  dbService.save();
  console.log(`[Admin] 删除账号: ${user.displayName} (${user.loginCode})`);
  res.json({
    success: true,
    message: `已删除用户 "${user.displayName}" 及其所有数据。`,
  });
});

// ─── 上传头像（Base64 存储） ───

router.put('/api/admin/users/:id/avatar', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { avatarUrl } = req.body;

  if (!avatarUrl || typeof avatarUrl !== 'string') {
    return res.status(400).json({ error: '请提供有效的头像数据（Base64 格式）。' });
  }

  // 验证 Base64 图片格式
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
  console.log(`[Admin] 更新头像: ${user.displayName}`);
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

  const oldBalance = wallet.balance;
  wallet.balance = Math.max(0, wallet.balance + amount);
  db.transactions.push({
    id: createId('adj'),
    userId: req.params.id,
    type: 'ADMIN_ADJUST',
    amount,
    balanceBefore: oldBalance,
    balanceAfter: wallet.balance,
    note: req.body.reason || '管理员手动调整积分',
    createdAt: new Date().toISOString(),
  });
  dbService.save();
  res.json({ success: true, balance: wallet.balance });
});

// ─── 比赛管理 ───

router.put('/api/admin/matches/:id', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const db = dbService.getData();
  const match = db.matches.find((item) => item.id === req.params.id);
  if (!match) return res.status(404).json({ error: '比赛不存在。' });

  const { homeScore, awayScore, status, isOddsFrozen, isPredictionLocked, winnerTeamId } = req.body;
  if (status) match.status = status;
  if (homeScore !== undefined) match.homeScore = Number(homeScore);
  if (awayScore !== undefined) match.awayScore = Number(awayScore);
  if (winnerTeamId !== undefined) match.winnerTeamId = winnerTeamId || undefined;
  if (isOddsFrozen !== undefined) {
    match.isOddsFrozen = Boolean(isOddsFrozen);
    match.oddsFrozenAt = match.isOddsFrozen ? new Date().toISOString() : undefined;
  }
  if (isPredictionLocked !== undefined) {
    match.isPredictionLocked = Boolean(isPredictionLocked);
    match.predictionLockedAt = match.isPredictionLocked ? new Date().toISOString() : undefined;
  }
  applyLifecycleUpdates(match, config.predictionLockMinutes);
  dbService.refreshBracketState();
  markMatchAiStale(match.id);
  markRoomLeaderboardAiStale('room-1');
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

router.post('/api/admin/matches/:id/settle', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const db = dbService.getData();
  const match = db.matches.find((item) => item.id === req.params.id);
  if (!match) return res.status(404).json({ error: '比赛不存在。' });

  try {
    const count = settleMatch(match);
    dbService.save();
    res.json({ success: true, count });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : '结算失败。' });
  }
});

// ─── 同步管理 ───

router.post('/api/admin/sync/fixtures', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const db = dbService.getData();
  const date = (req.body?.date as string) || new Date().toISOString().slice(0, 10);
  const result = await syncFixturesForDay({
    apiKey: config.apiFootballKey,
    date,
    db,
  });
  appendSyncLog(result.log);
  ensureLifecycleForAllMatches();
  result.updatedMatches.forEach((item) => markMatchAiStale(item.id));
  dbService.refreshBracketState();
  dbService.save();
  res.json({
    success: result.log.status !== 'FAILED',
    updatedMatches: result.updatedMatches.map((item) => item.id),
    log: result.log,
  });
});

router.post('/api/admin/sync/today', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const db = dbService.getData();
  const date = new Date().toISOString().slice(0, 10);
  const fixturesResult = await syncFixturesForDay({
    apiKey: config.apiFootballKey,
    date,
    db,
  });
  const oddsResult = await syncOddsForMatches({
    apiKey: config.theOddsApiKey,
    db,
  });
  appendSyncLog(fixturesResult.log);
  appendSyncLog(oddsResult.log);
  ensureLifecycleForAllMatches();
  fixturesResult.updatedMatches.forEach((item) => markMatchAiStale(item.id));
  oddsResult.updatedMatchIds.forEach((item) => markMatchAiStale(item));
  dbService.refreshBracketState();
  dbService.save();
  res.json({
    success: fixturesResult.log.status !== 'FAILED' || oddsResult.log.status !== 'FAILED',
    fixturesUpdated: fixturesResult.updatedMatches.map((item) => item.id),
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
  fixturesResult.updatedMatches.forEach((item) => markMatchAiStale(item.id));
  oddsResult.updatedMatchIds.forEach((item) => markMatchAiStale(item));
  dbService.refreshBracketState();
  dbService.save();
  res.json({
    success: true,
    updatedMatch: serializeMatch(match),
    oddsUpdated: oddsResult.updatedMatchIds.includes(match.id),
  });
});

// ─── AI 管理 ───

router.post('/api/admin/ai/match/:id/pre', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const db = dbService.getData();
  const match = db.matches.find((item) => item.id === req.params.id);
  if (!match) return res.status(404).json({ error: '比赛不存在。' });

  const home = db.teams.find((team) => team.id === match.homeTeamId)?.nameZh || '主队';
  const away = db.teams.find((team) => team.id === match.awayTeamId)?.nameZh || '客队';
  const odds = db.matchOdds[match.id];
  const prompt = `请为 ${home} vs ${away} 生成一张世界杯朋友群赛前速览卡。要求：第一句给结论，再给 2 到 3 条短 bullet，最后补一句风险提醒。可参考信息：阶段 ${match.stage}，地点 ${match.venueCity}，胜平负指数 ${odds ? `${odds.h2h.homeWin}/${odds.h2h.draw}/${odds.h2h.awayWin}` : '暂无'}。`;

  const aiContent = await generateStructuredAiContent({
    type: 'PRE_MATCH_ANALYSIS',
    title: `AI 赛前速览：${home} vs ${away}`,
    prompt,
    fallbackBody: `${home} 和 ${away} 这场球适合先看首发和临场变化，再决定娱乐积分怎么分配。`,
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

// ─── 同步日志 ───

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

export default router;
