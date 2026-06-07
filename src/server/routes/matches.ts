/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { dbService } from '../../db/db_service';
import { MatchStatus, Prediction, TournamentBet } from '../../types';
import { buildUserProfileSummary } from '../../utils/achievements';
import {
  createId,
  getAuthenticatedUser,
  serializeMatch,
  runScheduledMaintenance,
  deriveOperationalStatus,
  resolveOddsSnapshot,
  getTournamentMarketConfig,
  serializeTournamentBet,
} from '../helpers';
import { getRuntimeConfig } from '../config';

const config = getRuntimeConfig();
const router = Router();

// ─── 比赛列表 ───

router.get('/api/matches', async (_req: Request, res: Response) => {
  await runScheduledMaintenance();
  res.json(dbService.getMatches().map(serializeMatch));
});

router.get('/api/matches/today', async (_req: Request, res: Response) => {
  await runScheduledMaintenance();
  res.json(dbService.getMatches().map(serializeMatch));
});

router.get('/api/matches/:id', async (req: Request, res: Response) => {
  await runScheduledMaintenance();
  const db = dbService.getData();
  const match = db.matches.find((item) => item.id === req.params.id);
  if (!match) return res.status(404).json({ error: '未找到该比赛。' });

  const predictions = db.predictions.filter((item) => item.matchId === match.id && item.market === 'H2H');
  const homeCount = predictions
    .filter((item) => item.optionKey === 'home')
    .reduce((sum, item) => sum + item.stakePoints, 0);
  const drawCount = predictions
    .filter((item) => item.optionKey === 'draw')
    .reduce((sum, item) => sum + item.stakePoints, 0);
  const awayCount = predictions
    .filter((item) => item.optionKey === 'away')
    .reduce((sum, item) => sum + item.stakePoints, 0);
  const totalPoints = homeCount + drawCount + awayCount;

  res.json({
    ...serializeMatch(match),
    sentiment:
      totalPoints === 0
        ? { home: 45, draw: 10, away: 45 }
        : {
            home: Math.round((homeCount / totalPoints) * 100),
            draw: Math.round((drawCount / totalPoints) * 100),
            away: Math.round((awayCount / totalPoints) * 100),
        },
  });
});

router.get('/api/bracket', async (_req: Request, res: Response) => {
  await runScheduledMaintenance();
  dbService.refreshBracketState();
  res.json(dbService.getBracketState());
});

// ─── 好友投注分布 ───

router.get('/api/matches/:id/friend-picks', async (req: Request, res: Response) => {
  await runScheduledMaintenance();
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: '请先登录。' });

  const db = dbService.getData();
  const match = db.matches.find((item) => item.id === req.params.id);
  if (!match) return res.status(404).json({ error: '比赛不存在。' });

  const shouldReveal =
    match.status === MatchStatus.LIVE ||
    match.status === MatchStatus.HT ||
    match.status === MatchStatus.FT ||
    match.status === MatchStatus.AET ||
    match.status === MatchStatus.PEN ||
    new Date(match.startTimeUtc).getTime() <= Date.now();

  const picks = db.predictions
    .filter((item) => item.matchId === match.id && item.groupId === user.groupId)
    .map((prediction) => {
      const pickUser = db.users.find((item) => item.id === prediction.userId);
      return {
        id: prediction.id,
        userId: prediction.userId,
        displayName: pickUser?.displayName || '好友',
        avatarUrl: pickUser?.avatarUrl || '🙂',
        revealed: shouldReveal,
        optionLabel: shouldReveal ? prediction.optionLabel : undefined,
        stakePoints: shouldReveal ? prediction.stakePoints : undefined,
        status: prediction.status,
        settledProfit:
          shouldReveal && (prediction.status === 'WON' || prediction.status === 'LOST')
            ? prediction.settledProfit || 0
            : undefined,
        placedAt: prediction.placedAt,
      };
    })
    .sort((a, b) => a.placedAt.localeCompare(b.placedAt));

  res.json({
    matchId: match.id,
    visibility: shouldReveal ? 'after_kickoff_revealed' : 'hidden_before_kickoff',
    picks,
  });
});

// ─── 竞猜快照 ───

router.get('/api/predictions/snapshot/:matchId', async (req: Request, res: Response) => {
  await runScheduledMaintenance();
  const db = dbService.getData();
  const match = db.matches.find((item) => item.id === req.params.matchId);
  if (!match) return res.status(404).json({ error: '未找到比赛。' });
  res.json({
    matchId: match.id,
    operationalStatus: deriveOperationalStatus(match, Date.now(), config.predictionLockMinutes),
    odds: db.matchOdds[match.id] || null,
    lastUpdated: db.matchOdds[match.id]?.lastUpdated || null,
  });
});

// ─── 我的竞猜 ───

router.get('/api/predictions/me', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: '请先登录。' });

  const db = dbService.getData();
  const payload = db.predictions
    .filter((item) => item.userId === user.id)
    .sort((a, b) => b.placedAt.localeCompare(a.placedAt))
    .map((prediction) => {
      const match = db.matches.find((item) => item.id === prediction.matchId);
      return {
        ...prediction,
        match: match ? serializeMatch(match) : null,
      };
    });
  res.json(payload);
});

// ─── 下注竞猜 ───

router.post('/api/predictions', async (req: Request, res: Response) => {
  await runScheduledMaintenance();
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: '认证已失效，请重新登录。' });

  const { matchId, market, optionKey, optionLabel, stakePoints } = req.body as {
    matchId: string;
    market: Prediction['market'];
    optionKey: string;
    optionLabel: string;
    stakePoints: number;
  };

  if (!matchId || !market || !optionKey || !optionLabel || !stakePoints) {
    return res.status(400).json({ error: '请完整选择玩法、选项和积分。' });
  }

  const betAmount = Number(stakePoints);
  if (!Number.isFinite(betAmount) || betAmount <= 0) {
    return res.status(400).json({ error: '积分数量不合法。' });
  }

  const db = dbService.getData();
  const match = db.matches.find((item) => item.id === matchId);
  if (!match) return res.status(404).json({ error: '比赛不存在。' });

  const operationalStatus = deriveOperationalStatus(match, Date.now(), config.predictionLockMinutes);
  if (operationalStatus !== 'BETTABLE' && operationalStatus !== 'LOCKING_SOON') {
    return res.status(400).json({ error: '这场比赛当前不能继续竞猜。' });
  }

  const snapshot = resolveOddsSnapshot(matchId, market, optionKey);
  if (!snapshot) return res.status(400).json({ error: '当前没有可用指数，请稍后再试。' });

  const wallet = db.wallets.find((item) => item.userId === user.id);
  if (!wallet) return res.status(500).json({ error: '钱包不存在。' });
  if (wallet.balance < betAmount) {
    return res.status(400).json({ error: `积分不足，当前余额 ${wallet.balance}。` });
  }

  const singleMatchTotalBet = db.predictions
    .filter((item) => item.userId === user.id && item.matchId === matchId && (item.status === 'PENDING' || item.status === 'LOCKED'))
    .reduce((sum, item) => sum + item.stakePoints, 0);

  if (singleMatchTotalBet + betAmount > wallet.balance * 0.5 && wallet.balance > 200) {
    return res.status(400).json({ error: '单场总投入不能超过当前余额的 50%。' });
  }
  if (wallet.balance - betAmount < 100) {
    return res.status(400).json({ error: '下单后至少保留 100 积分。' });
  }

  const predictionId = createId('pred');
  const potentialReturn = Math.round(betAmount * snapshot.oddsDecimal * 10) / 10;
  const prediction: Prediction = {
    id: predictionId,
    userId: user.id,
    groupId: user.groupId,
    matchId,
    market,
    optionKey,
    optionLabel,
    stakePoints: betAmount,
    oddsDecimal: snapshot.oddsDecimal,
    potentialReturn,
    status: 'PENDING',
    placedAt: new Date().toISOString(),
    oddsSnapshot: {
      market,
      optionKey,
      optionLabel,
      oddsDecimal: snapshot.oddsDecimal,
      source: snapshot.source as any,
      capturedAt: snapshot.capturedAt,
    },
  };

  const oldBalance = wallet.balance;
  wallet.balance -= betAmount;
  db.predictions.push(prediction);
  db.transactions.push({
    id: createId('stake'),
    userId: user.id,
    type: 'PREDICTION_STAKE',
    amount: -betAmount,
    balanceBefore: oldBalance,
    balanceAfter: wallet.balance,
    relatedPredictionId: predictionId,
    relatedMatchId: matchId,
    note: `竞猜投入：${optionLabel}`,
    createdAt: new Date().toISOString(),
  });

  dbService.save();
  res.json({
    success: true,
    prediction,
    wallet,
    match: serializeMatch(match),
  });
});

// ─── 长线竞猜 ───

router.get('/api/tournament-bets', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: '请先登录。' });

  const db = dbService.getData();
  const bets = db.tournamentBets
    .filter((item) => item.userId === user.id)
    .sort((a, b) => b.placedAt.localeCompare(a.placedAt))
    .map(serializeTournamentBet);

  res.json({
    bets,
    markets: [
      getTournamentMarketConfig('champion'),
      getTournamentMarketConfig('golden_boot'),
      getTournamentMarketConfig('golden_ball'),
    ],
  });
});

async function placeTournamentBet(req: Request, res: Response, type: TournamentBet['type']) {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: '请先登录。' });

  const marketConfig = getTournamentMarketConfig(type);
  if (!marketConfig.isOpen) {
    return res.status(400).json({ error: `${marketConfig.label} 当前尚未开放。` });
  }

  const { targetId, stakePoints } = req.body as { targetId: string; stakePoints: number };
  if (!targetId || !stakePoints) {
    return res.status(400).json({ error: '请选择目标并填写积分。' });
  }

  const stake = Number(stakePoints);
  if (!Number.isFinite(stake) || stake <= 0) {
    return res.status(400).json({ error: '积分数量不合法。' });
  }

  const db = dbService.getData();
  const wallet = db.wallets.find((item) => item.userId === user.id);
  if (!wallet) return res.status(500).json({ error: '钱包不存在。' });
  if (wallet.balance < stake) return res.status(400).json({ error: '当前积分不足。' });

  const existing = db.tournamentBets.find((item) => item.userId === user.id && item.type === type);
  if (existing) {
    return res.status(400).json({ error: '同一玩法当前版本只允许保留一条竞猜记录。' });
  }

  const option = marketConfig.options.find((item) => item.id === targetId);
  if (!option) return res.status(400).json({ error: '未找到对应竞猜目标。' });

  const bet: TournamentBet = {
    id: createId('tour'),
    userId: user.id,
    roomId: user.groupId,
    type,
    targetId: option.id,
    targetLabel: option.label,
    targetSubLabel: option.subLabel,
    stakePoints: stake,
    oddsDecimal: option.oddsDecimal,
    potentialReturn: Math.round(stake * option.oddsDecimal * 10) / 10,
    status: 'OPEN',
    openedAt: marketConfig.openedAt || new Date().toISOString(),
    lockedAt: marketConfig.lockedAt || undefined,
    placedAt: new Date().toISOString(),
  };

  const oldBalance = wallet.balance;
  wallet.balance -= stake;
  db.tournamentBets.push(bet);
  db.transactions.push({
    id: createId('tour-stake'),
    userId: user.id,
    type: 'PREDICTION_STAKE',
    amount: -stake,
    balanceBefore: oldBalance,
    balanceAfter: wallet.balance,
    note:
      type === 'champion'
        ? `冠军竞猜投入：${option.label}`
        : type === 'golden_boot'
          ? `金靴竞猜投入：${option.label}`
          : `金球竞猜投入：${option.label}`,
    createdAt: new Date().toISOString(),
  });

  dbService.save();
  return res.json({ success: true, bet: serializeTournamentBet(bet), wallet });
}

router.post('/api/tournament-bets/champion', (req: Request, res: Response) => {
  placeTournamentBet(req, res, 'champion');
});

router.post('/api/tournament-bets/golden-boot', (req: Request, res: Response) => {
  placeTournamentBet(req, res, 'golden_boot');
});

router.post('/api/tournament-bets/golden-ball', (req: Request, res: Response) => {
  placeTournamentBet(req, res, 'golden_ball');
});

// ─── 排行榜 ───

router.get('/api/leaderboards', (_req: Request, res: Response) => {
  const db = dbService.getData();
  const groupId = (_req.query.groupId as string) || 'room-1';
  const users = db.users.filter((item) => item.groupId === groupId);

  const settledTimes = db.predictions.filter((item) => item.settledAt).map((item) => new Date(item.settledAt!).getTime());
  const anchorTime = settledTimes.length > 0 ? Math.max(...settledTimes) : Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const currentWalletMap = new Map(
    users.map((user) => [
      user.id,
      (db.wallets.find((item) => item.userId === user.id) || { balance: 10000, initialPoints: 10000 }).balance,
    ]),
  );
  const previousBalanceMap = new Map<string, number>();

  for (const user of users) {
    const latestTransaction = db.transactions
      .filter((item) => item.userId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    previousBalanceMap.set(user.id, latestTransaction ? latestTransaction.balanceBefore : currentWalletMap.get(user.id) || 10000);
  }

  const previousRankMap = new Map(
    [...users]
      .sort((a, b) => (previousBalanceMap.get(b.id) || 0) - (previousBalanceMap.get(a.id) || 0))
      .map((user, index) => [user.id, index + 1]),
  );

  const leaderboard = users.map((user) => {
    const wallet = db.wallets.find((item) => item.userId === user.id) || { userId: user.id, balance: 10000, initialPoints: 10000 };
    const predictions = db.predictions.filter((item) => item.userId === user.id);
    const totalCount = predictions.length;
    const wonCount = predictions.filter((item) => item.status === 'WON').length;
    const rate = totalCount === 0 ? 0 : Math.round((wonCount / totalCount) * 100);
    const netProfit = wallet.balance - (wallet.initialPoints || 10000);
    const biggestWin = predictions.filter((item) => item.status === 'WON').reduce((max, item) => Math.max(max, item.settledProfit || 0), 0);
    const todayPredictions = predictions.filter(
      (item) => item.settledAt && anchorTime - new Date(item.settledAt).getTime() <= oneDay,
    );
    const todayProfit = todayPredictions.reduce((sum, item) => sum + (item.settledProfit || 0), 0);
    const totalWonProfit = predictions.filter((item) => item.status === 'WON').reduce((sum, item) => sum + (item.settledProfit || 0), 0);

    const completed = predictions
      .filter((item) => item.status === 'WON' || item.status === 'LOST')
      .sort((a, b) => new Date(a.settledAt || a.placedAt).getTime() - new Date(b.settledAt || b.placedAt).getTime());

    let maxStreak = 0;
    let currentStreak = 0;
    for (const item of completed) {
      if (item.status === 'WON') {
        currentStreak += 1;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    let aiStyle = '稳住节奏派';
    let aiBadge = '数据观察员';
    if (rate >= 70 && totalCount >= 3) {
      aiStyle = '冷静收米派';
      aiBadge = '连击高手';
    } else if (rate <= 20 && totalCount >= 3) {
      aiStyle = '逆向预言家';
      aiBadge = '冷门诱捕器';
    } else if (biggestWin > 5000) {
      aiStyle = '冷门收割机';
      aiBadge = '搏冷选手';
    }

    const profileSummary = buildUserProfileSummary({
      predictions,
      tournamentBets: db.tournamentBets.filter((item) => item.userId === user.id),
      transactions: db.transactions.filter((item) => item.userId === user.id),
      wallet,
    });

    return {
      userId: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      balance: wallet.balance,
      netProfit,
      rate,
      totalCount,
      wonCount,
      biggestWin,
      todayProfit,
      maxStreak,
      currentStreak,
      aiStyle,
      aiBadge,
      totalWonProfit,
      title: profileSummary.currentTitle,
      featuredBadge: profileSummary.featuredBadge?.label || null,
      badgeTone: profileSummary.featuredBadge?.tone || 'slate',
      rankDelta: 0,
      todayStar: false,
    };
  });

  const sortedByTotal = [...leaderboard].sort((a, b) => b.balance - a.balance);
  const currentRankMap = new Map(sortedByTotal.map((item, index) => [item.userId, index + 1]));
  const maxTodayProfit = Math.max(...leaderboard.map((item) => item.todayProfit), 0);

  for (const item of leaderboard) {
    const previousRank = previousRankMap.get(item.userId) || currentRankMap.get(item.userId) || 0;
    const currentRank = currentRankMap.get(item.userId) || previousRank;
    item.rankDelta = previousRank - currentRank;
    item.todayStar = maxTodayProfit > 0 && item.todayProfit === maxTodayProfit;
  }

  res.json({
    totalList: sortedByTotal,
    todayList: [...leaderboard].sort((a, b) => b.todayProfit - a.todayProfit),
    rateList: [...leaderboard].sort((a, b) => b.rate - a.rate),
    streakList: [...leaderboard].sort((a, b) => b.maxStreak - a.maxStreak),
    wonProfitList: [...leaderboard].sort((a, b) => b.totalWonProfit - a.totalWonProfit),
  });
});

// ─── 统计 ───

router.get('/api/stats/summary', (req: Request, res: Response) => {
  const db = dbService.getData();
  const groupId = (req.query.groupId as string) || 'room-1';
  const users = db.users.filter((item) => item.groupId === groupId);
  const predictions = db.predictions.filter((item) => item.groupId === groupId);
  const tournamentBets = db.tournamentBets.filter((item) => item.roomId === groupId);

  const topCounts = (entries: Array<[string, number]>, limit = 8) =>
    entries
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([label, value]) => ({ label, value }));

  const perUser = new Map<string, number>();
  for (const prediction of predictions) {
    perUser.set(prediction.userId, (perUser.get(prediction.userId) || 0) + 1);
  }
  const userPredictionDistribution = topCounts(
    users.map((user) => [user.displayName, perUser.get(user.id) || 0]),
    10,
  );

  const popularBetMap = new Map<string, number>();
  for (const prediction of predictions) {
    const key = prediction.optionLabel || prediction.market;
    popularBetMap.set(key, (popularBetMap.get(key) || 0) + 1);
  }

  const championMap = new Map<string, number>();
  for (const bet of tournamentBets.filter((item) => item.type === 'champion')) {
    championMap.set(bet.targetLabel, (championMap.get(bet.targetLabel) || 0) + 1);
  }

  const correctScoreMap = new Map<string, number>();
  for (const prediction of predictions.filter((item) => item.market === 'CORRECT_SCORE')) {
    correctScoreMap.set(prediction.optionLabel, (correctScoreMap.get(prediction.optionLabel) || 0) + 1);
  }

  res.json({
    userPredictionDistribution,
    popularBetOptions: topCounts(Array.from(popularBetMap.entries())),
    championPickDistribution: topCounts(Array.from(championMap.entries()), 10),
    correctScoreHeat: topCounts(Array.from(correctScoreMap.entries()), 10),
  });
});

export default router;
