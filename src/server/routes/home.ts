/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import { Router, Request, Response } from 'express';
import { dbService } from '../../db/db_service';
import { serializeMatch, sortMatchesByStartTime } from '../helpers';
import {
  AIPredictionResponse,
  DataJsonMatch,
  ThirdPartyPrediction,
  buildAIPredictionCardPayload,
} from '../services/home_ai_prediction_service';

const router = Router();

const WC2026_API_BASE = process.env.WC2026_AI_API_BASE || 'https://worldcup-2026-sigma.vercel.app';
const WC2026_API_KEY = process.env.WC2026_AI_API_KEY || 'wc2026-demo-free';
const DATA_JSON_URL =
  process.env.WC2026_DATA_URL ||
  'https://cdn.jsdelivr.net/gh/shimenghan6/worldcup-2026@main/data.json';
const CACHE_TTL_MS = 3 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15_000;
const LOCAL_CACHE_PATH = path.resolve(process.env.APP_DATA_DIR || './runtime', 'prediction-data.json');

interface DataJsonResponse {
  updated?: string;
  source?: string;
  matches?: DataJsonMatch[];
}

let predictionCache:
  | {
      data: AIPredictionResponse;
      expiresAt: number;
    }
  | null = null;

// In-memory cache of raw data.json matches
let cachedDataJsonMatches: DataJsonMatch[] | null = null;

// ─── HTTP JSON request ───

function requestJson(url: string): Promise<unknown> {
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

    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error(`Request timeout after ${REQUEST_TIMEOUT_MS}ms`));
    });
    req.on('error', reject);
    req.end();
  });
}

// ─── Local file cache (B+C strategy) ───

function saveLocalCache(data: DataJsonResponse): void {
  try {
    const dir = path.dirname(LOCAL_CACHE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_CACHE_PATH, JSON.stringify(data, null, 2), 'utf8');
    console.log(`[AI Prediction] Saved local cache to ${LOCAL_CACHE_PATH}`);
  } catch (error) {
    console.error('[AI Prediction] Failed to save local cache:', (error as Error).message);
  }
}

function loadLocalCache(): DataJsonMatch[] | null {
  try {
    if (!fs.existsSync(LOCAL_CACHE_PATH)) return null;
    const raw = fs.readFileSync(LOCAL_CACHE_PATH, 'utf8');
    const data = JSON.parse(raw) as DataJsonResponse;
    if (Array.isArray(data?.matches) && data.matches.length > 0) {
      console.log(`[AI Prediction] Loaded ${data.matches.length} matches from local cache (updated: ${data.updated || 'unknown'})`);
      return data.matches;
    }
  } catch (error) {
    console.error('[AI Prediction] Failed to load local cache:', (error as Error).message);
  }
  return null;
}

// ─── Fetch with file cache fallback ───

async function fetchDataJsonPredictions(): Promise<DataJsonMatch[]> {
  // 1. Try remote fetch
  try {
    const data = (await requestJson(DATA_JSON_URL)) as DataJsonResponse;
    if (Array.isArray(data?.matches) && data.matches.length > 0) {
      console.log(`[AI Prediction] Fetched ${data.matches.length} matches from jsDelivr (updated: ${data.updated || 'unknown'})`);
      // Save to local file cache
      saveLocalCache(data);
      cachedDataJsonMatches = data.matches;
      return data.matches;
    }
  } catch (error) {
    console.error('[AI Prediction] jsDelivr fetch failed:', (error as Error).message);
  }

  // 2. Try in-memory cache
  if (cachedDataJsonMatches && cachedDataJsonMatches.length > 0) {
    console.log('[AI Prediction] Using in-memory cache');
    return cachedDataJsonMatches;
  }

  // 3. Try local file cache
  const fileCache = loadLocalCache();
  if (fileCache) {
    cachedDataJsonMatches = fileCache;
    return fileCache;
  }

  console.warn('[AI Prediction] All data sources failed, no prediction data available');
  return [];
}

async function fetchThirdPartyPredictions(): Promise<ThirdPartyPrediction[]> {
  const url = `${WC2026_API_BASE}/matches?key=${encodeURIComponent(WC2026_API_KEY)}`;
  try {
    const data = (await requestJson(url)) as { matches?: ThirdPartyPrediction[] };
    return Array.isArray(data?.matches) ? data.matches : [];
  } catch (error) {
    console.error('[AI Prediction] third-party API failed:', (error as Error).message);
    return [];
  }
}

// ─── Scheduled background refresh ───

let refreshTimer: ReturnType<typeof setInterval> | null = null;

function startBackgroundRefresh(): void {
  if (refreshTimer) return;
  // Refresh every 3 hours
  refreshTimer = setInterval(async () => {
    try {
      const data = (await requestJson(DATA_JSON_URL)) as DataJsonResponse;
      if (Array.isArray(data?.matches) && data.matches.length > 0) {
        console.log(`[AI Prediction] Background refresh: ${data.matches.length} matches (updated: ${data.updated || 'unknown'})`);
        saveLocalCache(data);
        cachedDataJsonMatches = data.matches;
        // Invalidate prediction cache so next request uses fresh data
        predictionCache = null;
      }
    } catch (error) {
      console.error('[AI Prediction] Background refresh failed:', (error as Error).message);
    }
  }, CACHE_TTL_MS);
}

// ─── Startup: warm cache ───

(async () => {
  console.log('[AI Prediction] Warming cache on startup...');
  const matches = await fetchDataJsonPredictions();
  if (matches.length > 0) {
    console.log(`[AI Prediction] Startup cache ready: ${matches.length} matches`);
  } else {
    console.warn('[AI Prediction] Startup cache empty, will retry on first request');
  }
  startBackgroundRefresh();
})();

// ─── Route ───

router.get('/api/home/ai-prediction-card', async (_req: Request, res: Response) => {
  try {
    if (predictionCache && Date.now() < predictionCache.expiresAt) {
      return res.json(predictionCache.data);
    }

    const matches = sortMatchesByStartTime(dbService.getMatches()).map(serializeMatch);
    const [dataJsonMatches, thirdPartyPredictions] = await Promise.all([
      fetchDataJsonPredictions(),
      fetchThirdPartyPredictions(),
    ]);

    const payload = buildAIPredictionCardPayload({
      matches,
      dataJsonMatches,
      thirdPartyPredictions,
      updatedAt: new Date().toISOString(),
    });

    predictionCache = {
      data: payload,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };

    return res.json(payload);
  } catch (error) {
    console.error('[AI Prediction] Failed to generate card:', error);
    return res.status(500).json({
      success: false,
      updatedAt: new Date().toISOString(),
      title: '今日 AI 娱乐预测',
      summary: 'AI 预测卡片加载失败，请稍后重试。',
      matches: [],
      state: 'empty',
      dataSource: 'none',
    });
  }
});

export default router;
