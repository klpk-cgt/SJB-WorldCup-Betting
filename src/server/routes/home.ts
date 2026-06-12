/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { dbService } from '../../db/db_service';
import { MatchStatus } from '../../types';

const router = Router();

// 第三方预测 API 配置
const WC2026_API_BASE = process.env.WC2026_AI_API_BASE || 'https://worldcup-2026-sigma.vercel.app';
const WC2026_API_KEY = process.env.WC2026_AI_API_KEY || 'wc2026-demo-free';

// 缓存配置
const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3小时
let predictionCache: {
  data: any;
  expiresAt: number;
} | null = null;

// 信心等级映射
const CONFIDENCE_MAP: Record<string, string> = {
  '铁胆': '高信心',
  '稳胆': '较高信心',
  '大概率': '有倾向',
  '中等': '谨慎看好',
  '待定': '暂无明确倾向',
  '': '暂无明确倾向',
};

// 胜平负映射
function formatTip(tip: string, homeTeam: string, awayTeam: string): string {
  if (tip === '胜') return `看好${homeTeam}`;
  if (tip === '平') return '看好双方打平';
  if (tip === '负') return `看好${awayTeam}`;
  return '暂无预测';
}

// 生成模板理由
function buildFallbackReason(match: any, prediction: any): string {
  const homeTeam = match.homeTeam?.nameZh || '主队';
  const awayTeam = match.awayTeam?.nameZh || '客队';
  const tip = formatTip(prediction.tip, homeTeam, awayTeam);
  const score = prediction.score ? `比分参考 ${prediction.score}` : '比分暂未更新';
  const confidence = prediction.level ? `信心等级为 ${CONFIDENCE_MAP[prediction.level] || '暂无明确倾向'}` : '倾向暂不明显';

  return `${tip}，${score}，${confidence}。仅供娱乐参考。`;
}

// 筛选首页展示比赛
function selectPredictionMatches(matches: any[], predictions: any[]) {
  const now = new Date();

  // 1. 今日比赛（优先）
  const todayMatches = matches.filter((m) => {
    const matchDate = new Date(m.startTimeUtc);
    const isToday = matchDate.toDateString() === now.toDateString();
    return isToday && m.status === MatchStatus.NS;
  });

  // 2. 未来3天比赛
  const futureMatches = matches.filter((m) => {
    const matchDate = new Date(m.startTimeUtc);
    const diff = matchDate.getTime() - now.getTime();
    return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000 && m.status === MatchStatus.NS;
  });

  // 合并并去重
  const allMatches = [...todayMatches, ...futureMatches].reduce((acc, m) => {
    if (!acc.find((item: any) => item.id === m.id)) {
      acc.push(m);
    }
    return acc;
  }, []);

  // 关联预测数据
  const matchesWithPrediction = allMatches
    .map((match) => {
      const prediction = predictions.find((p) => p.id === match.id);
      if (!prediction) return null;

      return {
        match,
        prediction,
      };
    })
    .filter(Boolean);

  // 按信心等级排序
  const confidenceWeight: Record<string, number> = {
    '铁胆': 5,
    '稳胆': 4,
    '大概率': 3,
    '中等': 2,
    '待定': 0,
    '': 0,
  };

  matchesWithPrediction.sort((a: any, b: any) => {
    const weightA = confidenceWeight[a.prediction.level] || 0;
    const weightB = confidenceWeight[b.prediction.level] || 0;
    return weightB - weightA;
  });

  // 返回前3场
  return matchesWithPrediction.slice(0, 3);
}

// 获取第三方预测数据
async function fetchThirdPartyPredictions() {
  try {
    const response = await fetch(`${WC2026_API_BASE}/matches?key=${WC2026_API_KEY}`);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    const data = await response.json();
    return data.matches || [];
  } catch (error) {
    console.error('[AI Prediction] Failed to fetch third-party predictions:', error);
    return [];
  }
}

// GET /api/home/ai-prediction-card
router.get('/api/home/ai-prediction-card', async (_req: Request, res: Response) => {
  try {
    // 检查缓存
    if (predictionCache && Date.now() < predictionCache.expiresAt) {
      return res.json(predictionCache.data);
    }

    // 获取第三方预测数据
    const predictions = await fetchThirdPartyPredictions();
    if (predictions.length === 0) {
      return res.json({
        success: true,
        updatedAt: new Date().toISOString(),
        title: '今日 AI 娱乐预测',
        summary: 'AI预测数据暂时开小差了，稍后再来看看。',
        matches: [],
      });
    }

    // 获取本地赛程
    const db = dbService.getData();
    const matches = db.matches;

    // 筛选并合并数据
    const selectedMatches = selectPredictionMatches(matches, predictions);

    if (selectedMatches.length === 0) {
      return res.json({
        success: true,
        updatedAt: new Date().toISOString(),
        title: '今日 AI 娱乐预测',
        summary: 'AI预测正在准备中，赛前会更新更多看点。',
        matches: [],
      });
    }

    // 生成卡片数据
    const matchCards = selectedMatches.map(({ match, prediction }: any) => {
      const homeTeam = match.homeTeam?.nameZh || '主队';
      const awayTeam = match.awayTeam?.nameZh || '客队';

      return {
        matchId: match.id,
        home: homeTeam,
        away: awayTeam,
        matchTime: match.startTimeUtc,
        predictResult: formatTip(prediction.tip, homeTeam, awayTeam),
        rawTip: prediction.tip,
        predictScore: prediction.score || '待定',
        confidence: CONFIDENCE_MAP[prediction.level] || '暂无明确倾向',
        rawConfidence: prediction.level,
        totalGoals: prediction.totalGoals || '待定',
        odds: prediction.spf || '待定',
        reason: buildFallbackReason(match, prediction),
        disclaimer: 'AI预测仅供娱乐参考',
      };
    });

    // 生成摘要
    const summary = `今日 AI 更看好 ${matchCards.length} 场比赛，比分预测集中在 2-3 球区间。`;

    const result = {
      success: true,
      updatedAt: new Date().toISOString(),
      title: '今日 AI 娱乐预测',
      summary,
      matches: matchCards,
    };

    // 更新缓存
    predictionCache = {
      data: result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };

    return res.json(result);
  } catch (error) {
    console.error('[AI Prediction] Failed to generate card:', error);
    return res.status(500).json({
      success: false,
      error: 'AI预测卡片加载失败',
    });
  }
});

export default router;
