/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import http from 'node:http';
import https from 'node:https';
import { Router, Request, Response } from 'express';
import { dbService } from '../../db/db_service';
import { Match, MatchStatus } from '../../types';
import { isMatchOnBeijingDate, serializeMatch, sortMatchesByStartTime, toBeijingDateKey } from '../helpers';

const router = Router();

const WC2026_API_BASE = process.env.WC2026_AI_API_BASE || 'https://worldcup-2026-sigma.vercel.app';
const WC2026_API_KEY = process.env.WC2026_AI_API_KEY || 'wc2026-demo-free';
const CACHE_TTL_MS = 3 * 60 * 60 * 1000;
const THIRD_PARTY_TIMEOUT_MS = 12000;

type SerializedMatch = ReturnType<typeof serializeMatch>;

interface ThirdPartyPrediction {
  id: string | number;
  level?: string;
  tip?: string;
  score?: string;
  totalGoals?: string;
  spf?: string;
  note?: string;
}

interface AIPredictionMatch {
  matchId: string;
  home: string;
  away: string;
  matchTime: string;
  predictResult: string;
  predictScore: string;
  confidence: string;
  totalGoals?: string;
  odds?: string;
  reason: string;
  disclaimer: string;
}

interface AIPredictionResponse {
  success: boolean;
  updatedAt: string;
  title: string;
  summary: string;
  matches: AIPredictionMatch[];
}

let predictionCache: {
  data: AIPredictionResponse;
  expiresAt: number;
} | null = null;

const CONFIDENCE_LABELS: Record<string, string> = {
  铁胆: '高信心',
  稳胆: '较高信心',
  大概率: '有倾向',
  中等: '谨慎看好',
  待定: '暂无明确倾向',
  '': '暂无明确倾向',
};

const CONFIDENCE_WEIGHTS: Record<string, number> = {
  铁胆: 5,
  稳胆: 4,
  大概率: 3,
  中等: 2,
  待定: 1,
  '': 0,
};

function normalizePredictionLevel(level?: string) {
  const cleaned = String(level || '').replace(/[^\u4e00-\u9fa5A-Za-z]/g, '');
  if (cleaned.includes('铁胆')) return '铁胆';
  if (cleaned.includes('稳胆')) return '稳胆';
  if (cleaned.includes('大概率')) return '大概率';
  if (cleaned.includes('中等')) return '中等';
  return '待定';
}

function normalizeMatchId(value: string | number | undefined | null) {
  return String(value ?? '').trim().replace(/^m-/i, '');
}

function formatTip(tip: string | undefined, homeTeam: string, awayTeam: string) {
  if (tip === '胜') return `看好${homeTeam}`;
  if (tip === '平') return '看好双方打平';
  if (tip === '负') return `看好${awayTeam}`;
  return '暂无明确倾向';
}

function getSerializedUpcomingMatches() {
  return sortMatchesByStartTime(dbService.getMatches())
    .map((match) => serializeMatch(match))
    .filter((match) => match.status === MatchStatus.NS);
}

function isUpcomingWithinThreeDays(match: Pick<Match, 'startTimeUtc' | 'status'>) {
  const kickoff = new Date(match.startTimeUtc).getTime();
  const now = Date.now();
  const diff = kickoff - now;
  return match.status === MatchStatus.NS && diff >= 0 && diff <= 3 * 24 * 60 * 60 * 1000;
}

function selectCandidateMatches(matches: SerializedMatch[]) {
  const todayKey = toBeijingDateKey();
  const todayMatches = matches.filter((match) => match.status === MatchStatus.NS && isMatchOnBeijingDate(match, todayKey));

  const futureMatches = matches.filter((match) => isUpcomingWithinThreeDays(match));
  const merged = [...todayMatches, ...futureMatches];

  return merged.filter(
    (match, index) => merged.findIndex((candidate) => candidate.id === match.id) === index,
  );
}

function findPredictionForMatch(match: SerializedMatch, predictions: ThirdPartyPrediction[]) {
  const localId = normalizeMatchId(match.id);
  return (
    predictions.find((prediction) => normalizeMatchId(prediction.id) === localId) ||
    predictions.find((prediction) => normalizeMatchId(prediction.id) === localId.replace(/^0+/, ''))
  );
}

function buildPredictionReason(match: SerializedMatch, prediction: ThirdPartyPrediction) {
  const homeTeam = match.homeTeam?.nameZh || '主队';
  const awayTeam = match.awayTeam?.nameZh || '客队';
  const tip = formatTip(prediction.tip, homeTeam, awayTeam);
  const score = prediction.score ? `参考比分 ${prediction.score}` : '比分仍在更新';
  const level = normalizePredictionLevel(prediction.level);
  const confidence = `信心等级 ${CONFIDENCE_LABELS[level] || CONFIDENCE_LABELS['待定']}`;
  const note = prediction.note ? `补充信息：${prediction.note}` : '';
  return [tip, score, confidence, note].filter(Boolean).join('，');
}

function buildThirdPartyCards(matches: SerializedMatch[], predictions: ThirdPartyPrediction[]) {
  const selectedMatches = selectCandidateMatches(matches)
    .map((match) => {
      const prediction = findPredictionForMatch(match, predictions);
      if (!prediction) return null;
      return { match, prediction };
    })
    .filter((item): item is { match: SerializedMatch; prediction: ThirdPartyPrediction } => Boolean(item))
    .sort((a, b) => {
      const weightB = CONFIDENCE_WEIGHTS[normalizePredictionLevel(b.prediction.level)] || 0;
      const weightA = CONFIDENCE_WEIGHTS[normalizePredictionLevel(a.prediction.level)] || 0;
      if (weightA !== weightB) return weightB - weightA;
      return a.match.startTimeUtc.localeCompare(b.match.startTimeUtc);
    })
    .slice(0, 3);

  return selectedMatches.map(({ match, prediction }) => {
    const homeTeam = match.homeTeam?.nameZh || '主队';
    const awayTeam = match.awayTeam?.nameZh || '客队';
    const level = normalizePredictionLevel(prediction.level);

    return {
      matchId: match.id,
      home: homeTeam,
      away: awayTeam,
      matchTime: match.startTimeUtc,
      predictResult: formatTip(prediction.tip, homeTeam, awayTeam),
      predictScore: prediction.score || '待定',
      confidence: CONFIDENCE_LABELS[level] || CONFIDENCE_LABELS['待定'],
      totalGoals: prediction.totalGoals || '待定',
      odds: prediction.spf || '待定',
      reason: buildPredictionReason(match, prediction),
      disclaimer: 'AI 娱乐预测仅供群内娱乐参考，请勿当作正式投资建议。',
    };
  });
}

function getLocalConfidenceLabel(match: SerializedMatch) {
  const odds = match.odds?.h2h;
  if (!odds) return '谨慎看好';

  const sortedOdds = [odds.homeWin, odds.draw, odds.awayWin].filter((value) => typeof value === 'number').sort((a, b) => a - b);
  if (sortedOdds.length < 2) return '谨慎看好';

  const gap = sortedOdds[1] - sortedOdds[0];
  if (sortedOdds[0] <= 1.45 || gap >= 1.2) return '高信心';
  if (sortedOdds[0] <= 1.75 || gap >= 0.7) return '较高信心';
  if (gap >= 0.35) return '有倾向';
  return '谨慎看好';
}

function buildLocalFallbackTip(match: SerializedMatch) {
  const odds = match.odds?.h2h;
  const homeTeam = match.homeTeam?.nameZh || '主队';
  const awayTeam = match.awayTeam?.nameZh || '客队';

  if (!odds) {
    return {
      predictResult: `关注${homeTeam} vs ${awayTeam}`,
      predictScore: '1:1',
      reason: '第三方预测暂时不可用，当前先按赛程焦点战展示，建议临场再看首发和赔率变化。',
    };
  }

  const entries = [
    { key: 'home', label: `看好${homeTeam}`, odds: odds.homeWin },
    { key: 'draw', label: '看好双方打平', odds: odds.draw },
    { key: 'away', label: `看好${awayTeam}`, odds: odds.awayWin },
  ].sort((a, b) => a.odds - b.odds);

  const favorite = entries[0];
  const predictScore =
    favorite.key === 'draw'
      ? '1:1'
      : favorite.odds <= 1.4
        ? '2:0'
        : favorite.odds <= 1.8
          ? '2:1'
          : '1:0';

  return {
    predictResult: favorite.label,
    predictScore,
    reason: `第三方预测暂时不可用，已切换为本地赔率娱乐预测。当前 ${favorite.label}，主胜/平/客胜赔率为 ${odds.homeWin}/${odds.draw}/${odds.awayWin}。`,
  };
}

function buildLocalFallbackCards(matches: SerializedMatch[]) {
  return selectCandidateMatches(matches).slice(0, 3).map((match) => {
    const homeTeam = match.homeTeam?.nameZh || '主队';
    const awayTeam = match.awayTeam?.nameZh || '客队';
    const fallback = buildLocalFallbackTip(match);

    return {
      matchId: match.id,
      home: homeTeam,
      away: awayTeam,
      matchTime: match.startTimeUtc,
      predictResult: fallback.predictResult,
      predictScore: fallback.predictScore,
      confidence: getLocalConfidenceLabel(match),
      totalGoals: '待定',
      odds: match.odds ? `${match.odds.h2h.homeWin}/${match.odds.h2h.draw}/${match.odds.h2h.awayWin}` : '待定',
      reason: fallback.reason,
      disclaimer: '当前为本地赔率娱乐预测，仅供群内娱乐参考。',
    };
  });
}

function requestJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const transport = target.protocol === 'https:' ? https : http;

    const req = transport.request(
      target,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'worldcup-ai-card/1.0',
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        response.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          if ((response.statusCode || 500) >= 400) {
            reject(new Error(`HTTP ${response.statusCode}: ${body.slice(0, 200)}`));
            return;
          }

          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      },
    );

    req.setTimeout(THIRD_PARTY_TIMEOUT_MS, () => {
      req.destroy(new Error(`Request timeout after ${THIRD_PARTY_TIMEOUT_MS}ms`));
    });
    req.on('error', reject);
    req.end();
  });
}

async function fetchThirdPartyPredictions() {
  const url = `${WC2026_API_BASE}/matches?key=${encodeURIComponent(WC2026_API_KEY)}`;

  try {
    if (typeof fetch === 'function') {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), THIRD_PARTY_TIMEOUT_MS);
      try {
        const response = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'worldcup-ai-card/1.0',
          },
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        return Array.isArray(data.matches) ? data.matches : [];
      } finally {
        clearTimeout(timer);
      }
    }

    const data = await requestJson(url);
    return Array.isArray(data.matches) ? data.matches : [];
  } catch (error) {
    console.error('[AI Prediction] Failed to fetch third-party predictions:', error);
    return [];
  }
}

router.get('/api/home/ai-prediction-card', async (_req: Request, res: Response) => {
  try {
    if (predictionCache && Date.now() < predictionCache.expiresAt) {
      return res.json(predictionCache.data);
    }

    const serializedMatches = getSerializedUpcomingMatches();
    const thirdPartyPredictions = await fetchThirdPartyPredictions();

    let matchCards = buildThirdPartyCards(serializedMatches, thirdPartyPredictions);
    let summary = `今日 AI 更看好 ${matchCards.length} 场比赛，优先关注近期开赛的焦点战。`;

    if (matchCards.length === 0) {
      matchCards = buildLocalFallbackCards(serializedMatches);
      summary =
        matchCards.length > 0
          ? '第三方预测暂时不可用，已切换为本地赔率娱乐预测，方便首页继续正常展示。'
          : '今天暂时没有可展示的未开赛比赛，晚些时候赛程更新后会自动恢复。';
    }

    const result: AIPredictionResponse = {
      success: true,
      updatedAt: new Date().toISOString(),
      title: '今日 AI 娱乐预测',
      summary,
      matches: matchCards,
    };

    predictionCache = {
      data: result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };

    return res.json(result);
  } catch (error) {
    console.error('[AI Prediction] Failed to generate card:', error);
    return res.status(500).json({
      success: false,
      updatedAt: new Date().toISOString(),
      title: '今日 AI 娱乐预测',
      summary: 'AI 预测卡片加载失败，请稍后重试。',
      matches: [],
    });
  }
});

export default router;
