/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { dbService } from './src/db/db_service';
import {
  AIContent,
  Match,
  MatchOdds,
  MatchStatus,
  Prediction,
  ShareCardRecord,
  SyncLog,
  Transaction,
  User,
  Wallet,
} from './src/types';
import { generateBetShareCard, generateStructuredAiContent } from './src/server/ai';
import { getRuntimeConfig, summarizeProviderConfig } from './src/server/config';
import {
  FINISHED_MATCH_STATUSES,
  applyLifecycleUpdates,
  deriveOperationalStatus,
  deriveSettlementStatus,
  enrichMatchLifecycle,
} from './src/server/operations';
import { syncFixturesForDay, syncOddsForMatches, ensureDefaultOdds } from './src/server/sync';

const app = express();
app.use(express.json());
const PORT = Number(process.env.PORT || 3000);
const config = getRuntimeConfig();

type AdminSession = { token: string; expiresAt: number };
const ADMIN_SESSIONS_FILE = path.join(process.cwd(), 'admin_sessions.json');
const adminSessions = new Map<string, AdminSession>();

function loadAdminSessions() {
  try {
    if (fs.existsSync(ADMIN_SESSIONS_FILE)) {
      const content = fs.readFileSync(ADMIN_SESSIONS_FILE, 'utf-8');
      const sessions = JSON.parse(content) as AdminSession[];
      const now = Date.now();
      for (const session of sessions) {
        if (now < session.expiresAt) {
          adminSessions.set(session.token, session);
        }
      }
      console.log(`[Admin] Loaded ${adminSessions.size} valid sessions from disk.`);
    }
  } catch (error) {
    console.error('[Admin] Failed to load admin sessions, starting fresh.', error);
  }
}

function saveAdminSessions() {
  try {
    const sessions = Array.from(adminSessions.values());
    fs.writeFileSync(ADMIN_SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
  } catch (error) {
    console.error('[Admin] Failed to save admin sessions.', error);
  }
}

function cleanupExpiredSessions() {
  const now = Date.now();
  let changed = false;
  for (const [token, session] of adminSessions) {
    if (now >= session.expiresAt) {
      adminSessions.delete(token);
      changed = true;
    }
  }
  if (changed) {
    saveAdminSessions();
  }
}

loadAdminSessions();
let lastScheduledSyncAt = 0;
let scheduledSyncRunning = false;

dbService.getData();

function createId(prefix: string) {
  return `${prefix}-${crypto.randomBytes(4).toString('hex')}`;
}

function getAuthenticatedUser(req: Request) {
  const loginCode = req.headers.authorization || (req.query.loginCode as string);
  if (!loginCode) return null;
  const cleanCode = loginCode.toString().trim().toUpperCase();
  const user = dbService
    .getUsers()
    .find((candidate) => candidate.loginCode === cleanCode || candidate.id === cleanCode);
  if (!user || user.status === 'LOCKED' || user.status === 'DISABLED') return null;
  return user;
}

function createAdminSession() {
  const token = crypto.randomBytes(24).toString('hex');
  adminSessions.set(token, {
    token,
    expiresAt: Date.now() + config.adminSessionTtlMs,
  });
  saveAdminSessions();
  return token;
}

function isAdminAuthenticated(req: Request) {
  cleanupExpiredSessions();
  const token = (req.headers['x-admin-token'] || req.query.adminToken || '').toString();
  if (!token) return false;
  const session = adminSessions.get(token);
  if (!session) return false;
  if (Date.now() > session.expiresAt) {
    adminSessions.delete(token);
    saveAdminSessions();
    return false;
  }
  return true;
}

function buildAiFallback(title: string, content: string): AIContent {
  return {
    id: createId('ai'),
    type: 'DAILY_RECOMMENDATION',
    title,
    content,
    summary: '今晚先看焦点战的节奏变化，再决定娱乐积分怎么分配。',
    bullets: ['强强对话先等首发', '热门方向别压满', '比分玩法更适合轻仓试水'],
    riskWarning: '临场首发和锁盘时间都可能改变判断，娱乐积分建议分档操作。',
    model: 'local-fallback',
    provider: 'Local',
    fallbackUsed: true,
    createdAt: new Date().toISOString(),
  };
}

function formatMarketLabel(market: Prediction['market']) {
  const mapping: Record<Prediction['market'], string> = {
    H2H: '胜平负',
    CORRECT_SCORE: '比分',
    TOTAL_GOALS: '总进球',
    QUALIFY: '晋级',
  };
  return mapping[market] || market;
}

function formatKickoffLabel(startTimeUtc: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Shanghai',
  }).format(new Date(startTimeUtc));
}

function buildMatchPreviewPrompt(match: Match, odds?: MatchOdds | null) {
  const db = dbService.getData();
  const home = db.teams.find((team) => team.id === match.homeTeamId)?.nameZh || '主队';
  const away = db.teams.find((team) => team.id === match.awayTeamId)?.nameZh || '客队';
  return {
    title: `AI 赛前速览：${home} vs ${away}`,
    prompt: `请为 ${home} vs ${away} 生成一段世界杯群聊赛前速览。要求：第一句给结论，再给 2 到 3 条短 bullet，最后补一句风险提醒。可参考信息：阶段 ${match.stage}，地点 ${match.venueCity}，北京时间 ${formatKickoffLabel(match.startTimeUtc)}，胜平负赔率 ${odds ? `${odds.h2h.homeWin}/${odds.h2h.draw}/${odds.h2h.awayWin}` : '暂无'}。`,
    fallbackBody: `${home} 和 ${away} 这场球适合先看首发和临场变化，再决定娱乐积分怎么分配。`,
  };
}

function ensureLifecycleForAllMatches() {
  const db = dbService.getData();
  for (const match of db.matches) {
    applyLifecycleUpdates(match, config.predictionLockMinutes);
  }
}

function serializeMatch(match: Match) {
  const db = dbService.getData();
  const homeTeam = db.teams.find((team) => team.id === match.homeTeamId);
  const awayTeam = db.teams.find((team) => team.id === match.awayTeamId);
  return {
    ...enrichMatchLifecycle(match, config.predictionLockMinutes),
    homeTeam,
    awayTeam,
    odds: db.matchOdds[match.id] || null,
  };
}

function appendSyncLog(log: SyncLog) {
  const db = dbService.getData();
  db.syncLogs.unshift(log);
  db.syncLogs = db.syncLogs.slice(0, 120);
}

function serializeUserForClient(user: User) {
  const { pinHash, ...safeUser } = user;
  return safeUser;
}

function getLatestSyncLog(syncType: SyncLog['syncType'], source?: SyncLog['source']) {
  return dbService.getSyncLogs().find((log) => log.syncType === syncType && (!source || log.source === source));
}

function getIntegrationStatusPayload() {
  const db = dbService.getData();
  const providerConfig = summarizeProviderConfig(config);
  const fixtureLog = getLatestSyncLog('fixtures', 'API-Football');
  const oddsLog = getLatestSyncLog('odds', 'The Odds API');
  const aiLog = getLatestSyncLog('ai');
  const syncedOddsCount = Object.values(db.matchOdds).filter((odds) => odds.source === 'The Odds API').length;
  const manualOddsCount = Object.values(db.matchOdds).filter((odds) => odds.source !== 'The Odds API').length;
  const datedMatches = db.matches.filter((match) => match.startTimeUtc);
  const orderedDates = datedMatches.map((match) => match.startTimeUtc.slice(0, 10)).sort();

  return {
    providers: providerConfig,
    sync: {
      fixtures: fixtureLog
        ? {
            status: fixtureLog.status,
            lastRunAt: fixtureLog.createdAt,
            requestSummary: fixtureLog.requestSummary,
            responseSummary: fixtureLog.responseSummary,
            errorMessage: fixtureLog.errorMessage || null,
            targetDate: fixtureLog.targetDate || null,
          }
        : null,
      odds: oddsLog
        ? {
            status: oddsLog.status,
            lastRunAt: oddsLog.createdAt,
            requestSummary: oddsLog.requestSummary,
            responseSummary: oddsLog.responseSummary,
            errorMessage: oddsLog.errorMessage || null,
          }
        : null,
      ai: aiLog
        ? {
            status: aiLog.status,
            lastRunAt: aiLog.createdAt,
            requestSummary: aiLog.requestSummary,
            responseSummary: aiLog.responseSummary,
            errorMessage: aiLog.errorMessage || null,
          }
        : null,
      coverage: {
        totalMatches: db.matches.length,
        oddsFromApi: syncedOddsCount,
        oddsManualFallback: manualOddsCount,
        dateRange:
          orderedDates.length > 0
            ? {
                first: orderedDates[0],
                last: orderedDates[orderedDates.length - 1],
              }
            : null,
      },
    },
  };
}

function pickNearestMatchDay() {
  const datedMatches = dbService
    .getMatches()
    .filter((match) => match.startTimeUtc)
    .sort((a, b) => new Date(a.startTimeUtc).getTime() - new Date(b.startTimeUtc).getTime());

  if (datedMatches.length === 0) {
    return new Date().toISOString().slice(0, 10);
  }

  const now = Date.now();
  const future = datedMatches.find((match) => new Date(match.startTimeUtc).getTime() >= now);
  return (future || datedMatches[0]).startTimeUtc.slice(0, 10);
}

function resolveOddsSnapshot(matchId: string, market: Prediction['market'], optionKey: string) {
  const db = dbService.getData();
  const odds: MatchOdds | undefined = db.matchOdds[matchId];
  if (!odds) return null;

  let oddsDecimal = 1;
  if (market === 'H2H') {
    oddsDecimal = optionKey === 'home' ? odds.h2h.homeWin : optionKey === 'draw' ? odds.h2h.draw : odds.h2h.awayWin;
  } else if (market === 'TOTAL_GOALS') {
    oddsDecimal = optionKey === 'over_2_5' ? odds.totalGoals.over25 : odds.totalGoals.under25;
  } else if (market === 'CORRECT_SCORE') {
    const score = odds.correctScore.find(
      (item) => `correctScore_${item.score.replace('-', '_')}` === optionKey || item.score === optionKey,
    );
    oddsDecimal = score?.odds || 9.5;
  } else if (market === 'QUALIFY') {
    oddsDecimal = optionKey === 'homeQualify' ? odds.qualify?.homeQualify || 1.8 : odds.qualify?.awayQualify || 1.8;
  }

  return {
    oddsDecimal,
    source: odds.source || 'LOCAL',
    capturedAt: new Date().toISOString(),
  };
}

function settleMatch(match: Match) {
  const db = dbService.getData();
  if (!FINISHED_MATCH_STATUSES.has(match.status)) {
    throw new Error('比赛尚未正式结束，暂时不能结算。');
  }
  if (match.homeScore === undefined || match.awayScore === undefined) {
    throw new Error('比分还不完整，不能开始结算。');
  }

  const matchPredictions = db.predictions.filter((prediction) => prediction.matchId === match.id);
  for (const prediction of matchPredictions) {
    if (prediction.status === 'WON' && prediction.settledReturn) {
      const wallet = db.wallets.find((item) => item.userId === prediction.userId);
      if (wallet) {
        const before = wallet.balance;
        wallet.balance -= prediction.settledReturn;
        db.transactions.push({
          id: createId('rollback'),
          userId: prediction.userId,
          type: 'REFUND',
          amount: -prediction.settledReturn,
          balanceBefore: before,
          balanceAfter: wallet.balance,
          relatedPredictionId: prediction.id,
          relatedMatchId: match.id,
          note: `重结回滚：${match.roundName}`,
          createdAt: new Date().toISOString(),
        });
      }
    }

    prediction.status = 'PENDING';
    prediction.settledReturn = 0;
    prediction.settledProfit = 0;
    prediction.settledAt = undefined;
  }

  const hScore = match.homeScore;
  const aScore = match.awayScore;

  for (const prediction of matchPredictions) {
    const wallet = db.wallets.find((item) => item.userId === prediction.userId);
    if (!wallet) continue;

    let won = false;
    if (prediction.market === 'H2H') {
      won =
        (prediction.optionKey === 'home' && hScore > aScore) ||
        (prediction.optionKey === 'draw' && hScore === aScore) ||
        (prediction.optionKey === 'away' && hScore < aScore);
    } else if (prediction.market === 'TOTAL_GOALS') {
      const totalGoals = hScore + aScore;
      won =
        (prediction.optionKey === 'over_2_5' && totalGoals > 2.5) ||
        (prediction.optionKey === 'under_2_5' && totalGoals < 2.5);
    } else if (prediction.market === 'CORRECT_SCORE') {
      const normalizedKey = prediction.optionKey.replace('correctScore_', '').replace('_', '-');
      const actualScore = `${hScore}-${aScore}`;
      won = normalizedKey === actualScore;
      if (!won && normalizedKey === 'Other') {
        const commonScores = ['1-0', '2-0', '2-1', '3-0', '0-0', '1-1', '0-1', '0-2', '1-2'];
        won = !commonScores.includes(actualScore);
      }
    } else if (prediction.market === 'QUALIFY' && match.winnerTeamId) {
      won =
        (prediction.optionKey === 'homeQualify' && match.winnerTeamId === match.homeTeamId) ||
        (prediction.optionKey === 'awayQualify' && match.winnerTeamId === match.awayTeamId);
    }

    if (won) {
      const pointsWon = Math.round(prediction.stakePoints * prediction.oddsDecimal * 10) / 10;
      const oldBalance = wallet.balance;
      wallet.balance += pointsWon;
      prediction.status = 'WON';
      prediction.settledReturn = pointsWon;
      prediction.settledProfit = pointsWon - prediction.stakePoints;
      prediction.settledAt = new Date().toISOString();

      db.transactions.push({
        id: createId('win'),
        userId: prediction.userId,
        type: 'PREDICTION_WIN',
        amount: pointsWon,
        balanceBefore: oldBalance,
        balanceAfter: wallet.balance,
        relatedPredictionId: prediction.id,
        relatedMatchId: match.id,
        note: `竞猜命中：${match.roundName} ${prediction.optionLabel}`,
        createdAt: new Date().toISOString(),
      });
    } else {
      prediction.status = 'LOST';
      prediction.settledReturn = 0;
      prediction.settledProfit = -prediction.stakePoints;
      prediction.settledAt = new Date().toISOString();

      db.transactions.push({
        id: createId('lose'),
        userId: prediction.userId,
        type: 'PREDICTION_LOSE',
        amount: -prediction.stakePoints,
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance,
        relatedPredictionId: prediction.id,
        relatedMatchId: match.id,
        note: `竞猜未命中：${match.roundName} ${prediction.optionLabel}`,
        createdAt: new Date().toISOString(),
      });
    }
  }

  match.isSettled = true;
  match.settledAt = new Date().toISOString();
  match.settlementStatus = 'SETTLED';
  match.operationalStatus = 'SETTLED';

  const homeName = db.teams.find((team) => team.id === match.homeTeamId)?.nameZh || '主队';
  const awayName = db.teams.find((team) => team.id === match.awayTeamId)?.nameZh || '客队';
  db.aiContents.unshift({
    id: createId('ai-recap'),
    type: 'POST_MATCH_RECAP',
    matchId: match.id,
    title: `赛后速览：${homeName} vs ${awayName}`,
    content: `${homeName} 与 ${awayName} 的比赛已经结束，最终比分 ${hScore} : ${aScore}。本场竞猜已经自动结算完成。`,
    summary: `比分定格在 ${hScore} : ${aScore}，本场竞猜已完成结算。`,
    bullets: ['结算已写入钱包', '重结时会先回滚再重算', '榜单会随着结算自动刷新'],
    riskWarning: '若赛果官方修订，后台可以触发重结。',
    model: 'local-fallback',
    provider: 'Local',
    fallbackUsed: true,
    createdAt: new Date().toISOString(),
  });

  return matchPredictions.length;
}

async function runScheduledMaintenance(forceSync = false) {
  ensureLifecycleForAllMatches();
  const db = dbService.getData();
  let changed = false;

  for (const match of db.matches) {
    if (
      deriveOperationalStatus(match, Date.now(), config.predictionLockMinutes) === 'WAITING_SETTLEMENT' &&
      !match.isSettled &&
      FINISHED_MATCH_STATUSES.has(match.status)
    ) {
      try {
        settleMatch(match);
        changed = true;
      } catch (error) {
        console.error('Auto settlement failed', error);
      }
    }
  }

  const shouldRunSync =
    forceSync || Date.now() - lastScheduledSyncAt >= config.syncIntervalMinutes * 60 * 1000;
  if (shouldRunSync && !scheduledSyncRunning) {
    scheduledSyncRunning = true;
    try {
      const date = new Date().toISOString().slice(0, 10);
      const fixturesResult = await syncFixturesForDay({
        apiKey: config.apiFootballKey,
        date,
        db,
      });
      appendSyncLog(fixturesResult.log);

      const oddsResult = await syncOddsForMatches({
        apiKey: config.theOddsApiKey,
        db,
      });
      appendSyncLog(oddsResult.log);

      lastScheduledSyncAt = Date.now();
      changed = true;
    } finally {
      scheduledSyncRunning = false;
    }
  }

  if (changed) {
    dbService.save();
  }
}

function requireAdmin(req: Request, res: Response) {
  if (!isAdminAuthenticated(req)) {
    res.status(403).json({ error: '管理员权限不足或登录已失效。' });
    return false;
  }
  return true;
}

app.get('/api/rooms', (_req: Request, res: Response) => {
  res.json(dbService.getRooms().filter((room) => room.isActive));
});

app.get('/api/me', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: '未登录或登录已失效。' });
  }
  const wallet = dbService.getWallets().find((item) => item.userId === user.id);
  res.json({
    user: serializeUserForClient(user),
    wallet: wallet || { userId: user.id, balance: 0, initialPoints: 10000 },
  });
});

app.get('/api/checkin/status', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: '请先登录。' });
  const today = new Date().toISOString().split('T')[0];
  const checkedInToday = dbService
    .getTransactions()
    .some((tx) => tx.userId === user.id && tx.createdAt.startsWith(today) && tx.note.includes('签到抽奖'));
  res.json({ checkedInToday });
});

app.post('/api/checkin', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: '认证已失效，请重新登录。' });

  const db = dbService.getData();
  const wallet = db.wallets.find((item) => item.userId === user.id);
  if (!wallet) return res.status(500).json({ error: '钱包不存在。' });

  const today = new Date().toISOString().split('T')[0];
  const alreadyCheckedIn = db.transactions.some(
    (tx) => tx.userId === user.id && tx.createdAt.startsWith(today) && tx.note.includes('签到抽奖'),
  );
  if (alreadyCheckedIn) {
    return res.status(400).json({ error: '今天已经签过到了。' });
  }

  const roll = Math.random();
  let amount = 150;
  let prizeName = '幸运入袋';
  if (roll < 0.1) {
    amount = 505;
    prizeName = '独占鳌头';
  } else if (roll < 0.35) {
    amount = 300;
    prizeName = '凯歌高奏';
  } else if (roll < 0.65) {
    amount = 200;
    prizeName = '运转加成';
  }

  const oldBalance = wallet.balance;
  wallet.balance += amount;
  db.transactions.push({
    id: createId('checkin'),
    userId: user.id,
    type: 'ADMIN_ADJUST',
    amount,
    balanceBefore: oldBalance,
    balanceAfter: wallet.balance,
    note: `签到抽奖：${prizeName} +${amount}`,
    createdAt: new Date().toISOString(),
  });

  dbService.save();
  res.json({ success: true, amount, prizeName, wallet });
});

/* ─── 每日足球问答 API ─── */

const QUIZ_POINTS_PER_CORRECT = 100;

const quizQuestionPool = [
  {
    id: 'q1',
    question: '2026 年世界杯由哪三个国家联合举办？',
    options: ['美国、加拿大、墨西哥', '美国、巴西、阿根廷', '英国、法国、德国', '日本、韩国、中国'],
    correctIndex: 0,
    explanation: '2026 年世界杯是美国、加拿大、墨西哥三国首次联合举办，也是首次有 48 支球队参赛。',
  },
  {
    id: 'q2',
    question: '2026 世界杯是第几届世界杯？',
    options: ['第 21 届', '第 22 届', '第 23 届', '第 24 届'],
    correctIndex: 2,
    explanation: '2026 世界杯是第 23 届 FIFA 世界杯。',
  },
  {
    id: 'q3',
    question: '哪支球队获得过最多次世界杯冠军？',
    options: ['德国', '意大利', '巴西', '阿根廷'],
    correctIndex: 2,
    explanation: '巴西队共获得 5 次世界杯冠军（1958、1962、1970、1994、2002），是夺冠次数最多的球队。',
  },
  {
    id: 'q4',
    question: '2022 年卡塔尔世界杯冠军是哪支球队？',
    options: ['法国', '克罗地亚', '摩洛哥', '阿根廷'],
    correctIndex: 3,
    explanation: '阿根廷在 2022 年卡塔尔世界杯决赛中击败法国，梅西终圆世界杯冠军梦。',
  },
  {
    id: 'q5',
    question: '世界杯奖杯的正式名称是什么？',
    options: ['金球奖', '大力神杯', '雷米特杯', '金靴奖'],
    correctIndex: 1,
    explanation: '大力神杯是 1974 年以来 FIFA 世界杯的正式奖杯，由 18K 黄金铸造。',
  },
  {
    id: 'q6',
    question: '一场标准足球比赛的时长是多少？',
    options: ['80 分钟', '90 分钟', '100 分钟', '120 分钟'],
    correctIndex: 1,
    explanation: '标准足球比赛上下半场各 45 分钟，共 90 分钟，加上伤停补时。',
  },
  {
    id: 'q7',
    question: '足球比赛中，每队上场人数是多少？',
    options: ['9 人', '10 人', '11 人', '12 人'],
    correctIndex: 2,
    explanation: '标准足球比赛每队上场 11 人，包括 1 名守门员。',
  },
  {
    id: 'q8',
    question: '2026 世界杯决赛圈有多少支球队参赛？',
    options: ['32 支', '40 支', '48 支', '64 支'],
    correctIndex: 2,
    explanation: '2026 世界杯首次扩军至 48 支球队，分为 12 个小组。',
  },
  {
    id: 'q9',
    question: '哪位球员在单届世界杯进球数最多？',
    options: ['贝利', '克洛泽', '方丹', '罗纳尔多'],
    correctIndex: 2,
    explanation: '法国球员方丹在 1958 年世界杯单届打入 13 球，至今无人打破。',
  },
  {
    id: 'q10',
    question: '世界杯历史上进球最多的球员是谁？',
    options: ['贝利', '罗纳尔多', '克洛泽', '梅西'],
    correctIndex: 2,
    explanation: '德国球员克洛泽在世界杯决赛圈共打入 16 球，是世界杯历史最佳射手。',
  },
  {
    id: 'q11',
    question: '足球比赛中越位规则是指什么？',
    options: ['球员在对方半场接球时比倒数第二名防守球员更靠近球门线', '球员在禁区内推人', '球员用手触球', '球员从背后铲球'],
    correctIndex: 0,
    explanation: '越位是指进攻球员在传球瞬间，比倒数第二名防守球员更靠近对方球门线。',
  },
  {
    id: 'q12',
    question: '点球大战中每队先罚几个球？',
    options: ['3 个', '4 个', '5 个', '6 个'],
    correctIndex: 2,
    explanation: '点球大战每队先罚 5 轮，若仍平局则进入突然死亡模式。',
  },
  {
    id: 'q13',
    question: 'VAR 在足球比赛中代表什么？',
    options: ['视频助理裁判', '虚拟攻击区域', '球员评估排名', '比赛分析报告'],
    correctIndex: 0,
    explanation: 'VAR 即 Video Assistant Referee（视频助理裁判），用于协助主裁判做出更准确的判罚。',
  },
  {
    id: 'q14',
    question: '哪支球队被称为"高卢雄鸡"？',
    options: ['巴西', '德国', '法国', '西班牙'],
    correctIndex: 2,
    explanation: '法国队因其国家象征高卢雄鸡而被称为"高卢雄鸡"。',
  },
  {
    id: 'q15',
    question: '世界杯小组赛赢一场得几分？',
    options: ['1 分', '2 分', '3 分', '4 分'],
    correctIndex: 2,
    explanation: '世界杯小组赛胜一场得 3 分，平一场得 1 分，负一场得 0 分。',
  },
];

function getDailyQuizQuestions(): typeof quizQuestionPool {
  const today = new Date().toISOString().split('T')[0];
  const seed = today.split('-').join('');
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const shuffled = [...quizQuestionPool].sort((a, b) => {
    const ha = (hash + a.id.charCodeAt(0)) | 0;
    const hb = (hash + b.id.charCodeAt(0)) | 0;
    return ha - hb;
  });
  return shuffled.slice(0, 3);
}

app.get('/api/quiz/status', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: '请先登录。' });
  const today = new Date().toISOString().split('T')[0];
  const completedToday = dbService
    .getTransactions()
    .some((tx) => tx.userId === user.id && tx.createdAt.startsWith(today) && tx.note.includes('每日问答'));
  res.json({ completedToday });
});

app.get('/api/quiz/daily', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: '请先登录。' });

  const today = new Date().toISOString().split('T')[0];
  const alreadyDone = dbService
    .getTransactions()
    .some((tx) => tx.userId === user.id && tx.createdAt.startsWith(today) && tx.note.includes('每日问答'));
  if (alreadyDone) {
    return res.status(400).json({ error: '今日问答已完成。' });
  }

  const questions = getDailyQuizQuestions();
  res.json({ questions });
});

app.post('/api/quiz/answer', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: '认证已失效，请重新登录。' });

  const { questionId, selectedIndex } = req.body;
  if (!questionId || typeof selectedIndex !== 'number') {
    return res.status(400).json({ error: '参数缺失。' });
  }

  const today = new Date().toISOString().split('T')[0];
  const alreadyDone = dbService
    .getTransactions()
    .some((tx) => tx.userId === user.id && tx.createdAt.startsWith(today) && tx.note.includes('每日问答'));
  if (alreadyDone) {
    return res.status(400).json({ error: '今日问答已完成。' });
  }

  const question = quizQuestionPool.find((q) => q.id === questionId);
  if (!question) {
    return res.status(400).json({ error: '题目不存在。' });
  }

  const isCorrect = selectedIndex === question.correctIndex;
  let pointsEarned = 0;

  if (isCorrect) {
    pointsEarned = QUIZ_POINTS_PER_CORRECT;
    const db = dbService.getData();
    const wallet = db.wallets.find((w) => w.userId === user.id);
    if (wallet) {
      const oldBalance = wallet.balance;
      wallet.balance += pointsEarned;
      db.transactions.push({
        id: createId('quiz'),
        userId: user.id,
        type: 'ADMIN_ADJUST',
        amount: pointsEarned,
        balanceBefore: oldBalance,
        balanceAfter: wallet.balance,
        note: `每日问答：答对 +${pointsEarned}`,
        createdAt: new Date().toISOString(),
      });
      dbService.save();
    }
  }

  res.json({ correct: isCorrect, pointsEarned, explanation: question.explanation });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { loginCode, pin } = req.body;
  if (!loginCode || !pin) {
    return res.status(400).json({ error: '请输入身份码和 PIN。' });
  }

  const user = dbService
    .getUsers()
    .find((candidate) => candidate.loginCode === String(loginCode).trim().toUpperCase());
  if (!user) return res.status(401).json({ error: '未找到对应身份码。' });
  if (user.status === 'LOCKED' || user.status === 'DISABLED') {
    return res.status(403).json({ error: '该账号已被锁定或停用。' });
  }
  if (user.pinHash !== String(pin).trim()) {
    return res.status(401).json({ error: 'PIN 错误。' });
  }

  user.lastLoginAt = new Date().toISOString();
  dbService.save();

  const wallet = dbService.getWallets().find((item) => item.userId === user.id);
  res.json({
    success: true,
    user: serializeUserForClient(user),
    wallet: wallet || { userId: user.id, balance: 10000, initialPoints: 10000 },
  });
});

app.post('/api/auth/claim', (req: Request, res: Response) => {
  const { slug, inviteCode, name, pin } = req.body;
  if (!slug || !inviteCode || !name || !pin) {
    return res.status(400).json({ error: '请完整填写房间、邀请码、昵称和 PIN。' });
  }

  const room = dbService.getRooms().find((item) => item.slug === String(slug).trim() && item.isActive);
  if (!room) return res.status(404).json({ error: '房间不存在。' });
  if (room.inviteCode !== String(inviteCode).trim()) {
    return res.status(400).json({ error: '邀请码不正确。' });
  }

  const db = dbService.getData();
  if (db.users.some((item) => item.groupId === room.id && item.displayName === String(name).trim())) {
    return res.status(400).json({ error: '这个昵称已经有人用了。' });
  }

  const suffix = Math.floor(1000 + Math.random() * 9000);
  const userId = createId('user');
  const loginCode = `WC${suffix}`;
  const user: User = {
    id: userId,
    groupId: room.id,
    displayName: String(name).trim(),
    avatarUrl: ['⚽', '🏆', '🥅', '🔥', '🎯', '🎉'][Math.floor(Math.random() * 6)],
    loginCode,
    pinHash: String(pin).trim(),
    status: 'CLAIMED',
    claimedAt: new Date().toISOString(),
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
    note: '注册认领，初始赠送 10,000 娱乐积分',
    createdAt: new Date().toISOString(),
  });
  dbService.save();

  res.json({ success: true, user: serializeUserForClient(user), wallet });
});

app.get('/api/matches', async (_req: Request, res: Response) => {
  await runScheduledMaintenance();
  res.json(dbService.getMatches().map(serializeMatch));
});

app.get('/api/matches/today', async (_req: Request, res: Response) => {
  await runScheduledMaintenance();
  res.json(dbService.getMatches().map(serializeMatch));
});

app.get('/api/matches/:id', async (req: Request, res: Response) => {
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

app.get('/api/predictions/snapshot/:matchId', async (req: Request, res: Response) => {
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

app.get('/api/predictions/me', (req: Request, res: Response) => {
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

app.post('/api/predictions', async (req: Request, res: Response) => {
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

app.get('/api/leaderboards', (_req: Request, res: Response) => {
  const db = dbService.getData();
  const groupId = (_req.query.groupId as string) || 'room-1';
  const users = db.users.filter((item) => item.groupId === groupId);

  const settledTimes = db.predictions.filter((item) => item.settledAt).map((item) => new Date(item.settledAt!).getTime());
  const anchorTime = settledTimes.length > 0 ? Math.max(...settledTimes) : Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  const leaderboard = users.map((user) => {
    const wallet = db.wallets.find((item) => item.userId === user.id) || { balance: 10000, initialPoints: 10000 };
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
    };
  });

  res.json({
    totalList: [...leaderboard].sort((a, b) => b.balance - a.balance),
    todayList: [...leaderboard].sort((a, b) => b.todayProfit - a.todayProfit),
    rateList: [...leaderboard].sort((a, b) => b.rate - a.rate),
    streakList: [...leaderboard].sort((a, b) => b.maxStreak - a.maxStreak),
    wonProfitList: [...leaderboard].sort((a, b) => b.totalWonProfit - a.totalWonProfit),
  });
});

app.get('/api/ai/daily', (_req: Request, res: Response) => {
  const db = dbService.getData();
  const daily = db.aiContents.find((item) => item.type === 'DAILY_RECOMMENDATION');
  res.json(daily || buildAiFallback('今日焦点推荐已经生成', '今晚先看焦点战，再决定娱乐积分怎么分配。'));
});

app.get('/api/ai/match/:id', (req: Request, res: Response) => {
  const db = dbService.getData();
  res.json(db.aiContents.filter((item) => item.matchId === req.params.id));
});

app.post('/api/ai/generate', async (req: Request, res: Response) => {
  const { type, title, prompt, fallbackBody, matchId, predictionId } = req.body || {};
  if (!type || !title || !prompt || !fallbackBody) {
    return res.status(400).json({ error: 'type, title, prompt, fallbackBody are required.' });
  }

  const aiContent = await generateStructuredAiContent({
    config,
    type,
    title,
    prompt,
    fallbackBody,
    matchId,
    predictionId,
  });

  const db = dbService.getData();
  db.aiContents.unshift(aiContent);
  appendSyncLog({
    id: createId('sync'),
    source: aiContent.provider || 'Local',
    action: 'Generate AI content',
    syncType: 'ai',
    status: 'SUCCESS',
    requestSummary: `Generate ${type} content`,
    responseSummary: `${aiContent.provider || 'Local'} / ${aiContent.model}`,
    targetMatchId: matchId,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });
  dbService.save();
  res.json(aiContent);
});

app.post('/api/ai/match/:id/preview', async (req: Request, res: Response) => {
  const db = dbService.getData();
  const match = db.matches.find((item) => item.id === req.params.id);
  if (!match) {
    return res.status(404).json({ error: 'Match not found.' });
  }

  const promptPayload = buildMatchPreviewPrompt(match, db.matchOdds[match.id]);
  const aiContent = await generateStructuredAiContent({
    config,
    type: 'PRE_MATCH_ANALYSIS',
    title: promptPayload.title,
    prompt: promptPayload.prompt,
    fallbackBody: promptPayload.fallbackBody,
    matchId: match.id,
  });

  const existingIndex = db.aiContents.findIndex(
    (item) => item.type === 'PRE_MATCH_ANALYSIS' && item.matchId === match.id,
  );
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

app.post('/api/ai/share/bet', async (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Please log in first.' });
  }

  const predictionId = String(req.body?.predictionId || '').trim();
  if (!predictionId) {
    return res.status(400).json({ error: 'predictionId is required.' });
  }

  const db = dbService.getData();
  const prediction = db.predictions.find((item) => item.id === predictionId && item.userId === user.id);
  if (!prediction) {
    return res.status(404).json({ error: 'Prediction not found.' });
  }

  const match = db.matches.find((item) => item.id === prediction.matchId);
  if (!match) {
    return res.status(404).json({ error: 'Match not found.' });
  }

  const serializedMatch = serializeMatch(match);
  const homeTeam = serializedMatch.homeTeam?.nameZh || '主队';
  const awayTeam = serializedMatch.awayTeam?.nameZh || '客队';
  const marketLabel = formatMarketLabel(prediction.market);
  const sharePrompt = [
    '请为世界杯群聊生成一段晒单文案。',
    `比赛：${homeTeam} vs ${awayTeam}。`,
    `玩法：${marketLabel}。`,
    `选择：${prediction.optionLabel}。`,
    `赔率：${prediction.oddsDecimal.toFixed(2)}。`,
    `投入：${prediction.stakePoints} 积分。`,
    '要求：一句结论，2 条短 bullet，最后一句风险提醒，口吻适合发群聊讨论。',
  ].join('');

  const shareCard = await generateBetShareCard({
    config,
    predictionId: prediction.id,
    matchId: match.id,
    title: `投注分享卡：${homeTeam} vs ${awayTeam}`,
    prompt: sharePrompt,
    fallbackBody: `${homeTeam} vs ${awayTeam} 这场我先站 ${prediction.optionLabel}，小注参与，临场继续看走势。`,
    summary: {
      userName: user.displayName,
      homeTeam,
      awayTeam,
      kickoffLabel: `北京时间 ${formatKickoffLabel(match.startTimeUtc)}`,
      marketLabel,
      optionLabel: prediction.optionLabel,
      oddsLabel: prediction.oddsDecimal.toFixed(2),
      stakeLabel: `${prediction.stakePoints} PTS`,
    },
  });

  const storedCard: ShareCardRecord = {
    ...shareCard,
    userId: user.id,
  };
  const existingIndex = db.shareCards.findIndex((item) => item.predictionId === prediction.id && item.userId === user.id);
  if (existingIndex >= 0) {
    db.shareCards[existingIndex] = storedCard;
  } else {
    db.shareCards.unshift(storedCard);
  }

  appendSyncLog({
    id: createId('sync'),
    source: storedCard.provider,
    action: 'Generate bet share card',
    syncType: 'ai',
    status: 'SUCCESS',
    requestSummary: `Generate bet share card for ${prediction.id}`,
    responseSummary: `${storedCard.provider} / ${storedCard.model} -> ${storedCard.mode}`,
    targetMatchId: match.id,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });

  dbService.save();
  res.json(storedCard);
});

app.get('/api/me/transactions', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: '请先登录。' });
  const payload = dbService
    .getTransactions()
    .filter((item) => item.userId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(payload);
});

app.get('/api/users/:userId/trend', (req: Request, res: Response) => {
  const db = dbService.getData();
  const user = db.users.find((item) => item.id === req.params.userId);
  if (!user) return res.status(404).json({ error: '用户不存在。' });

  const wallet = db.wallets.find((item) => item.userId === user.id) || { balance: 10000 };
  const transactions = db.transactions
    .filter((item) => item.userId === user.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const trend = [];
  const today = new Date();
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const endOfDay = `${dateStr}T23:59:59.999Z`;
    const txBefore = transactions.filter((item) => item.createdAt <= endOfDay);
    const balance = txBefore.length > 0 ? txBefore[txBefore.length - 1].balanceAfter : 10000;
    trend.push({
      dateStr,
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      balance,
    });
  }

  res.json({
    userId: user.id,
    displayName: user.displayName,
    balance: wallet.balance,
    trend,
  });
});

app.post('/api/admin/login', (req: Request, res: Response) => {
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

app.get('/api/admin/dashboard', (req: Request, res: Response) => {
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

app.get('/api/admin/integrations/status', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  res.json(getIntegrationStatusPayload());
});

app.post('/api/admin/integrations/test-sync', async (req: Request, res: Response) => {
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

app.get('/api/admin/users', (req: Request, res: Response) => {
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

app.post('/api/admin/users/bulk', (req: Request, res: Response) => {
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

app.put('/api/admin/users/:id', (req: Request, res: Response) => {
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

app.post('/api/admin/users/:id/adjust-points', (req: Request, res: Response) => {
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

app.put('/api/admin/matches/:id', (req: Request, res: Response) => {
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
  dbService.save();
  res.json({ success: true, match: serializeMatch(match) });
});

app.put('/api/admin/matches/:id/odds', (req: Request, res: Response) => {
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
  dbService.save();
  res.json({ success: true, odds: existing });
});

app.post('/api/admin/matches/:id/settle', (req: Request, res: Response) => {
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

app.post('/api/admin/sync/fixtures', async (req: Request, res: Response) => {
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
  dbService.save();
  res.json({
    success: result.log.status !== 'FAILED',
    updatedMatches: result.updatedMatches.map((item) => item.id),
    log: result.log,
  });
});

app.post('/api/admin/sync/today', async (req: Request, res: Response) => {
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
  dbService.save();
  res.json({
    success: fixturesResult.log.status !== 'FAILED' || oddsResult.log.status !== 'FAILED',
    fixturesUpdated: fixturesResult.updatedMatches.map((item) => item.id),
    oddsUpdated: oddsResult.updatedMatchIds,
  });
});

app.post('/api/admin/sync/matches/:id', async (req: Request, res: Response) => {
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
  dbService.save();
  res.json({
    success: true,
    updatedMatch: serializeMatch(match),
    oddsUpdated: oddsResult.updatedMatchIds.includes(match.id),
  });
});

app.post('/api/admin/ai/match/:id/pre', async (req: Request, res: Response) => {
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

app.get('/api/admin/sync-logs', (req: Request, res: Response) => {
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

async function startServer() {
  // 启动时确保所有已确定比赛有默认赔率
  const db = dbService.getData();
  const filled = ensureDefaultOdds(db);
  if (filled.length > 0) {
    console.log(`[Init] Generated default odds for ${filled.length} matches.`);
    dbService.save();
  }

  const providerConfig = summarizeProviderConfig(config);
  for (const [provider, status] of Object.entries(providerConfig)) {
    if (!status.configured) {
      console.warn(`[Config] ${provider} is not fully configured. Expected env: ${status.env}`);
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  setInterval(() => {
    runScheduledMaintenance().catch((error) => {
      console.error('Scheduled maintenance failed', error);
    });
  }, 60 * 1000);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running successfully on http://0.0.0.0:${PORT}`);
  });
}

startServer();
