/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { dbService } from '../../db/db_service';
import {
  generateBetShareCard,
  generateStructuredAiContent,
  getOrGenerateLeaderboardCommentary,
  getOrGenerateMatchAnalysis,
  getOrGenerateMatchPrediction,
} from '../ai';
import { getRuntimeConfig } from '../config';
import {
  createId,
  getAuthenticatedUser,
  buildAiFallback,
  buildMatchPreviewPrompt,
  formatMarketLabel,
  formatKickoffLabel,
  serializeMatch,
  appendSyncLog,
} from '../helpers';

const config = getRuntimeConfig();
const router = Router();

// ─── AI 预测 ───

router.get('/api/ai/match/:id/prediction', async (req: Request, res: Response) => {
  const db = dbService.getData();
  try {
    const aiContent = await getOrGenerateMatchPrediction({
      db,
      config,
      matchId: req.params.id,
      enhancementMode: 'off',
    });
    return res.json(aiContent);
  } catch (error) {
    return res.status(404).json({ error: error instanceof Error ? error.message : 'AI prediction generation failed.' });
  }
});

// ─── AI 分析 ───

router.get('/api/ai/match/:id/analysis', async (req: Request, res: Response) => {
  const db = dbService.getData();
  try {
    const aiContent = await getOrGenerateMatchAnalysis({
      db,
      config,
      matchId: req.params.id,
      enhancementMode: 'off',
    });
    return res.json(aiContent);
  } catch (error) {
    return res.status(404).json({ error: error instanceof Error ? error.message : 'AI analysis generation failed.' });
  }
});

// ─── AI 榜单点评 ───

router.get('/api/ai/leaderboard/:roomId', async (req: Request, res: Response) => {
  const db = dbService.getData();
  try {
    const aiContent = await getOrGenerateLeaderboardCommentary({
      db,
      config,
      roomId: req.params.roomId,
      enhancementMode: 'off',
    });
    return res.json(aiContent);
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'AI leaderboard generation failed.' });
  }
});

// ─── AI 每日推荐 ───

router.get('/api/ai/daily', (_req: Request, res: Response) => {
  const db = dbService.getData();
  const daily = db.aiContents.find((item) => item.type === 'DAILY_RECOMMENDATION');
  res.json(daily || buildAiFallback('今日焦点推荐已经生成', '今晚先看焦点战，再决定娱乐积分怎么分配。'));
});

// ─── AI 比赛内容 ───

router.get('/api/ai/match/:id', (req: Request, res: Response) => {
  const db = dbService.getData();
  res.json(db.aiContents.filter((item) => item.matchId === req.params.id));
});

// ─── AI 生成 ───

router.post('/api/ai/generate', async (req: Request, res: Response) => {
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

// ─── AI 赛前速览 ───

router.post('/api/ai/match/:id/preview', async (req: Request, res: Response) => {
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

// ─── AI 竞猜分享卡 ───

router.post('/api/ai/share/bet', async (req: Request, res: Response) => {
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

  const storedCard = {
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

// ─── AI 群友竞猜点评 ───

router.get('/api/ai/match/:id/crowd-review', async (req: Request, res: Response) => {
  const db = dbService.getData();
  const match = db.matches.find((m) => m.id === req.params.id);
  if (!match) {
    return res.status(404).json({ error: 'Match not found.' });
  }

  const predictions = db.predictions.filter((p) => p.matchId === req.params.id);
  if (predictions.length === 0) {
    return res.json({ summary: '还没有群友下注，快来第一个！', bullets: [] });
  }

  // 统计各选项人数
  const optionCounts: Record<string, number> = {};
  const totalStake: Record<string, number> = {};
  for (const p of predictions) {
    const key = p.optionLabel || p.market;
    optionCounts[key] = (optionCounts[key] || 0) + 1;
    totalStake[key] = (totalStake[key] || 0) + (p.stakePoints || 0);
  }

  const homeTeam = match.homeTeam?.nameZh || '主队';
  const awayTeam = match.awayTeam?.nameZh || '客队';
  const total = predictions.length;
  const topOption = Object.entries(optionCounts).sort((a, b) => b[1] - a[1])[0];
  const topStake = Object.entries(totalStake).sort((a, b) => b[1] - a[1])[0];

  const prompt = [
    `比赛：${homeTeam} vs ${awayTeam}。`,
    `共${total}位群友下注。`,
    `最热门选项：${topOption?.[0]}（${topOption?.[1]}人）。`,
    `最大投入方向：${topStake?.[0]}（${topStake?.[1]}积分）。`,
    '请用2-3句话点评群友的投注倾向，口吻轻松有趣，适合朋友群讨论。最后加一句风险提醒。',
  ].join('');

  try {
    const aiContent = await generateStructuredAiContent({
      config,
      type: 'BET_SHARE_COPY',
      title: `群友竞猜点评：${homeTeam} vs ${awayTeam}`,
      prompt,
      fallbackBody: `${total}位群友已下注，${topOption?.[0]}最受欢迎。大家看法比较一致，但也别忘了冷门可能！`,
      matchId: match.id,
    });
    return res.json(aiContent);
  } catch {
    return res.json({
      summary: `${total}位群友已下注，${topOption?.[0]}最受欢迎。`,
      bullets: ['群友倾向明显', '注意冷门风险'],
    });
  }
});

// ─── AI 冷门提醒 ───

router.get('/api/ai/cold-alerts', (_req: Request, res: Response) => {
  const db = dbService.getData();
  const now = new Date();

  // 找即将开赛的比赛
  const upcoming = db.matches
    .filter((m) => {
      const start = new Date(m.startTimeUtc);
      const diff = start.getTime() - now.getTime();
      return diff > 0 && diff < 48 * 60 * 60 * 1000; // 48小时内
    })
    .sort((a, b) => new Date(a.startTimeUtc).getTime() - new Date(b.startTimeUtc).getTime())
    .slice(0, 5);

  if (upcoming.length === 0) {
    return res.json({ alerts: [] });
  }

  const alerts = upcoming.map((match) => {
    const odds = db.matchOdds[match.id];
    const homeTeam = match.homeTeam?.nameZh || '主队';
    const awayTeam = match.awayTeam?.nameZh || '客队';

    // 简单判断：如果赔率差距大，可能存在冷门
    let coldAlert = '';
    if (odds && odds.h2h) {
      const { homeWin, draw, awayWin } = odds.h2h;
      const maxOdds = Math.max(homeWin, draw, awayWin);
      const minOdds = Math.min(homeWin, draw, awayWin);
      if (minOdds > 0 && maxOdds / minOdds > 2) {
        coldAlert = `${homeTeam} vs ${awayTeam}：赔率差距较大，低赔率方并非稳赢，历史上冷门频出。`;
      }
    }

    return {
      matchId: match.id,
      homeTeam,
      awayTeam,
      startTimeUtc: match.startTimeUtc,
      alert: coldAlert || `${homeTeam} vs ${awayTeam}：数据有限，谨慎下注。`,
    };
  }).filter((a) => a.alert);

  res.json({ alerts });
});

export default router;

// ─── AI 推荐跟投 ───

router.get('/api/ai/recommendations', async (_req: Request, res: Response) => {
  const db = dbService.getData();
  const now = new Date();

  // 找未锁定、未结算的比赛
  const upcoming = db.matches
    .filter((m) => {
      if (m.isSettled) return false;
      const start = new Date(m.startTimeUtc);
      const diff = start.getTime() - now.getTime();
      return diff > 0 && diff < 72 * 60 * 60 * 1000; // 72小时内
    })
    .sort((a, b) => new Date(a.startTimeUtc).getTime() - new Date(b.startTimeUtc).getTime())
    .slice(0, 10);

  const recommendations = upcoming.map((match) => {
    const odds = db.matchOdds[match.id];
    const homeTeam = match.homeTeam?.nameZh || '主队';
    const awayTeam = match.awayTeam?.nameZh || '客队';

    // 基于赔率和历史交锋生成简单推荐
    let recommendation: {
      matchId: string;
      label: string;
      market: string;
      option: string;
      optionLabel: string;
      odds: number;
      confidence: number;
      reason: string;
      suggestedStake: number;
    } | null = null;

    if (odds?.h2h) {
      const { homeWin, draw, awayWin } = odds.h2h;
      const maxOdds = Math.max(homeWin, draw, awayWin);
      const minOdds = Math.min(homeWin, draw, awayWin);

      // 推荐高赔率的选项（博冷）
      let bestOption = 'HOME_WIN';
      let bestLabel = homeTeam + ' 胜';
      let bestOdds = homeWin;
      if (draw > bestOdds) {
        bestOption = 'DRAW';
        bestLabel = '平局';
        bestOdds = draw;
      }
      if (awayWin > bestOdds) {
        bestOption = 'AWAY_WIN';
        bestLabel = awayTeam + ' 胜';
        bestOdds = awayWin;
      }

      const confidence = Math.max(30, Math.min(80, Math.round((1 / bestOdds) * 100)));
      const suggestedStake = Math.max(50, Math.min(500, Math.round((confidence / 80) * 300)));

      recommendation = {
        matchId: match.id,
        label: `${homeTeam} vs ${awayTeam}`,
        market: 'H2H',
        option: bestOption,
        optionLabel: bestLabel,
        odds: bestOdds,
        confidence,
        reason: `基于当前赔率分析，${bestLabel} 赔率 ${bestOdds.toFixed(2)}，建议投入 ${suggestedStake} 积分`,
        suggestedStake,
      };
    }

    return recommendation;
  }).filter(Boolean);

  res.json({
    recommendations: recommendations.slice(0, 5),
    total: recommendations.length,
    aiNote: '以上推荐基于赔率分析，仅供参考，不构成投资建议。',
    generatedAt: now.toISOString(),
  });
});
