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

export default router;
