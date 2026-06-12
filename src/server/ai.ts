import { GoogleGenAI } from '@google/genai';
import type { DatabaseSchema } from '../db/db_service';
import {
  AIContent,
  AIContentType,
  AIEnhancementMode,
  AILeaderboardCommentaryResult,
  AIPredictionResult,
  AIPreMatchAnalysisResult,
  AIProvider,
  Match,
  ShareCardRecord,
} from '../types';
import type { RuntimeConfig } from './config';

const DEFAULT_PROMPT_VERSION = 'v3';
const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash';
const MATCH_ANALYSIS_REFRESH_WINDOWS_MS = [
  6 * 60 * 60 * 1000,
  60 * 60 * 1000,
  15 * 60 * 1000,
];

let geminiClient: GoogleGenAI | null = null;

type StructuredOutput = AIPredictionResult | AIPreMatchAnalysisResult | AILeaderboardCommentaryResult | Record<string, unknown>;

type GenerateAiContentParams = {
  db: DatabaseSchema;
  config: RuntimeConfig;
  contentType: AIContentType;
  matchId?: string;
  roomId?: string;
  enhancementMode?: AIEnhancementMode;
  forceRefresh?: boolean;
  promptVersion?: string;
  sourceImageUrls?: string[];
};

type GenerateAiResultParams = GenerateAiContentParams & {
  contentType: 'MATCH_PREDICTION' | 'PRE_MATCH_ANALYSIS' | 'LEADERBOARD_COMMENTARY' | 'SEARCH_ENHANCEMENT';
};

type ProviderCallOptions = {
  provider: AIProvider;
  config: RuntimeConfig;
  systemPrompt: string;
  userPrompt: string;
  enhancementMode: AIEnhancementMode;
  sourceImageUrls?: string[];
};

type ContentBuildContext = {
  db: DatabaseSchema;
  match?: Match;
  roomId?: string;
  enhancementMode: AIEnhancementMode;
  promptVersion: string;
};

type BetShareParams = {
  config: RuntimeConfig;
  predictionId: string;
  matchId: string;
  title: string;
  prompt: string;
  fallbackBody: string;
  summary: {
    userName: string;
    homeTeam: string;
    awayTeam: string;
    kickoffLabel: string;
    marketLabel: string;
    optionLabel: string;
    oddsLabel: string;
    stakeLabel: string;
  };
};

function resolveRoomId(db: DatabaseSchema, roomId?: string) {
  if (roomId) return roomId;
  return db.rooms.find((item) => item.isActive)?.id || db.rooms[0]?.id || 'room-1';
}

export function getCachedAIContent(db: DatabaseSchema, cacheKey: string, now = Date.now()) {
  return db.aiContents.find((item) => {
    if (item.cacheKey !== cacheKey) return false;
    if (item.status === 'stale' || item.status === 'error') return false;
    if (item.expiresAt && new Date(item.expiresAt).getTime() <= now) return false;
    return true;
  });
}

export function invalidateAIContent(
  db: DatabaseSchema,
  scopeId: string,
  contentType?: AIContentType,
  scopeType: 'match' | 'room' | 'global' = 'match',
) {
  for (const item of db.aiContents) {
    if (item.scopeType !== scopeType) continue;
    if (item.scopeId !== scopeId) continue;
    if (contentType && item.contentType !== contentType && item.type !== contentType) continue;
    item.status = 'stale';
    item.expiresAt = new Date().toISOString();
  }
}

export function storeAIContent(db: DatabaseSchema, payload: AIContent) {
  const existingIndex = db.aiContents.findIndex((item) => item.cacheKey === payload.cacheKey);
  if (existingIndex >= 0) {
    db.aiContents[existingIndex] = payload;
  } else {
    db.aiContents.unshift(payload);
  }
  db.aiContents = db.aiContents.slice(0, 200);
  return payload;
}

export async function generateAIContent(params: GenerateAiContentParams): Promise<AIContent> {
  const contentType = params.contentType;
  if (
    contentType !== 'MATCH_PREDICTION' &&
    contentType !== 'PRE_MATCH_ANALYSIS' &&
    contentType !== 'LEADERBOARD_COMMENTARY' &&
    contentType !== 'SEARCH_ENHANCEMENT'
  ) {
    throw new Error(`Unsupported AI content type: ${contentType}`);
  }

  return generateTypedAIContent({
    ...params,
    contentType,
  });
}

export async function generateStructuredAiContent(params:
  | {
      type: AIContentType;
      title: string;
      prompt: string;
      fallbackBody: string;
      matchId?: string;
      predictionId?: string;
      deepSeekApiKey: string;
      geminiApiKey: string;
    }
  | {
      type: AIContentType;
      title: string;
      prompt: string;
      fallbackBody: string;
      matchId?: string;
      predictionId?: string;
      config: RuntimeConfig;
    }): Promise<AIContent> {
  const config =
    'config' in params
      ? params.config
      : ({
          deepSeekApiKey: params.deepSeekApiKey,
          geminiApiKey: params.geminiApiKey,
          mimoApiKey: '',
          mimoBaseUrl: 'https://api.xiaomimimo.com/v1',
          mimoDefaultModel: 'mimo-v2.5-pro',
          mimoMultimodalModel: 'mimo-v2.5',
          mimoFastModel: 'mimo-v2-flash',
          aiPrimaryProvider: 'deepseek',
          aiFallbackProvider: 'gemini',
          aiEnableWebSearch: false,
          aiEnableMultimodal: false,
          aiCacheTtlMinutes: 30,
          apiFootballKey: '',
          theOddsApiKey: '',
          deepSeekModel: 'deepseek-chat',
          geminiTextModel: DEFAULT_GEMINI_MODEL,
          geminiImageModel: 'gemini-2.5-flash-image-preview',
          adminUsername: 'admin',
          adminPassword: 'admin',
          adminSessionTtlMs: 0,
          predictionLockMinutes: 5,
          syncIntervalMinutes: 5,
          activityMaxEntries: 1000,
          activityArchiveFile: 'db.activities.archive.json',
        } satisfies RuntimeConfig);

  try {
    const rawText = await callProvider({
      provider: 'DeepSeek',
      config,
      systemPrompt:
        '你是世界杯朋友群的中文赛前分析助手。请输出简洁、适合移动端的中文内容。',
      userPrompt: params.prompt,
      enhancementMode: 'off',
    });
    const output = normalizePreMatchAnalysis(rawText, 'off');
    return buildAiContentRecord({
      contentType: params.type === 'MATCH_PREDICTION' ? 'MATCH_PREDICTION' : 'PRE_MATCH_ANALYSIS',
      output,
      provider: 'DeepSeek',
      model: 'deepseek-chat',
      fallbackUsed: false,
      enhancementMode: 'off',
      promptVersion: 'legacy',
      dataVersion: 'legacy',
      cacheKey: `legacy:${params.type}:${params.title}`,
      inputSnapshotJson: { prompt: params.prompt },
    });
  } catch {
    if (config.geminiApiKey) {
      try {
        const rawText = await callProvider({
          provider: 'Gemini',
          config,
          systemPrompt:
            '你是世界杯朋友群的中文赛前分析助手。请输出简洁、适合移动端的中文内容。',
          userPrompt: params.prompt,
          enhancementMode: 'off',
        });
        const output = normalizePreMatchAnalysis(rawText, 'off');
        return buildAiContentRecord({
          contentType: params.type === 'MATCH_PREDICTION' ? 'MATCH_PREDICTION' : 'PRE_MATCH_ANALYSIS',
          output,
          provider: 'Gemini',
          model: DEFAULT_GEMINI_MODEL,
          fallbackUsed: true,
          enhancementMode: 'off',
          promptVersion: 'legacy',
          dataVersion: 'legacy',
          cacheKey: `legacy:${params.type}:${params.title}`,
          inputSnapshotJson: { prompt: params.prompt },
        });
      } catch {
        // fall through
      }
    }
  }

  return {
    id: `ai-${Date.now()}`,
    type: params.type,
    contentType: params.type,
    title: params.title,
    content: params.fallbackBody,
    model: 'local-fallback',
    provider: 'Local',
    fallbackUsed: true,
    createdAt: new Date().toISOString(),
    summary: params.fallbackBody,
    bullets: ['先看临场阵容。', '娱乐积分建议分档。', '重点盯锁盘前变化。'],
    riskWarning: '临场变化可能改变原先判断。',
    scopeType: 'global',
    scopeId: 'legacy',
  };
}

export async function getOrGenerateMatchPrediction(params: Omit<GenerateAiResultParams, 'contentType'> & { matchId: string }) {
  return generateTypedAIContent({
    ...params,
    contentType: 'MATCH_PREDICTION',
  });
}

export async function getOrGenerateMatchAnalysis(params: Omit<GenerateAiResultParams, 'contentType'> & { matchId: string }) {
  return generateTypedAIContent({
    ...params,
    contentType: 'PRE_MATCH_ANALYSIS',
  });
}

export async function getOrGenerateLeaderboardCommentary(
  params: Omit<GenerateAiResultParams, 'contentType'> & { roomId: string },
) {
  return generateTypedAIContent({
    ...params,
    contentType: 'LEADERBOARD_COMMENTARY',
  });
}

async function generateTypedAIContent(params: GenerateAiResultParams): Promise<AIContent> {
  const db = params.db;
  const config = params.config;
  const enhancementMode = params.enhancementMode || 'off';
  const promptVersion = params.promptVersion || DEFAULT_PROMPT_VERSION;
  const now = Date.now();
  const match = params.matchId ? db.matches.find((item) => item.id === params.matchId) : undefined;

  if (params.matchId && !match) {
    throw new Error('Match not found');
  }
  if (params.contentType === 'LEADERBOARD_COMMENTARY' && !params.roomId) {
    throw new Error('roomId is required for leaderboard commentary');
  }

  const dataVersion = buildDataVersion({
    db,
    match,
    roomId: params.roomId,
    contentType: params.contentType,
    now,
  });
  const cacheKey = buildCacheKey({
    contentType: params.contentType,
    scopeId: params.matchId || params.roomId || 'global',
    provider: resolvePrimaryProvider(params.contentType, enhancementMode, config),
    model: resolveModel(resolvePrimaryProvider(params.contentType, enhancementMode, config), config, enhancementMode),
    promptVersion,
    dataVersion,
    enhancementMode,
  });

  if (!params.forceRefresh) {
    const cached = getCachedAIContent(db, cacheKey, now);
    if (cached) return cached;
  }

  const content = await buildContent({
    db,
    match,
    roomId: params.roomId,
    config,
    contentType: params.contentType,
    enhancementMode,
    promptVersion,
    dataVersion,
    cacheKey,
    sourceImageUrls: params.sourceImageUrls,
  });

  return storeAIContent(db, content);
}

async function buildContent(params: {
  db: DatabaseSchema;
  match?: Match;
  roomId?: string;
  config: RuntimeConfig;
  contentType: GenerateAiResultParams['contentType'];
  enhancementMode: AIEnhancementMode;
  promptVersion: string;
  dataVersion: string;
  cacheKey: string;
  sourceImageUrls?: string[];
}) {
  const context: ContentBuildContext = {
    db: params.db,
    match: params.match,
    roomId: params.roomId,
    enhancementMode: params.enhancementMode,
    promptVersion: params.promptVersion,
  };

  const prompt = buildPrompt(params.contentType, context);
  const providers = buildProviderRoute(params.contentType, params.enhancementMode, params.config);

  let usedProvider: AIProvider = 'Local';
  let usedModel = 'local-fallback';
  let fallbackUsed = false;
  let output: StructuredOutput | null = null;

  for (let index = 0; index < providers.length; index += 1) {
    const provider = providers[index];
    try {
      const rawText = await callProvider({
        provider,
        config: params.config,
        systemPrompt: prompt.systemPrompt,
        userPrompt: prompt.userPrompt,
        enhancementMode: params.enhancementMode,
        sourceImageUrls: params.sourceImageUrls,
      });
      usedProvider = provider;
      usedModel = resolveModel(provider, params.config, params.enhancementMode);
      fallbackUsed = index > 0;
      output = normalizeOutput(params.contentType, rawText, params.enhancementMode);
      break;
    } catch (error) {
      console.warn(`[AI] ${provider} generation failed for ${params.contentType}`, error);
    }
  }

  if (!output) {
    usedProvider = 'Local';
    usedModel = 'local-fallback';
    fallbackUsed = true;
    output = buildLocalFallback(params.contentType, context);
  }

  return buildAiContentRecord({
    contentType: params.contentType,
    output,
    provider: usedProvider,
    model: usedModel,
    fallbackUsed,
    match: params.match,
    roomId: params.roomId,
    enhancementMode: params.enhancementMode,
    promptVersion: params.promptVersion,
    dataVersion: params.dataVersion,
    cacheKey: params.cacheKey,
    inputSnapshotJson: buildInputSnapshot(params.contentType, context),
  });
}

function buildPrompt(contentType: GenerateAiResultParams['contentType'], context: ContentBuildContext) {
  if (contentType === 'MATCH_PREDICTION') {
    return buildMatchPredictionPrompt(context);
  }
  if (contentType === 'LEADERBOARD_COMMENTARY') {
    return buildLeaderboardPrompt(context);
  }
  return buildMatchAnalysisPrompt(contentType, context);
}

function buildMatchPredictionPrompt(context: ContentBuildContext) {
  const match = assertMatch(context.match);
  const snapshot = buildMatchSnapshot(context.db, match);
  return {
    systemPrompt:
      '你是世界杯朋友群的中文 AI 分析助手。请只输出 JSON，不要输出额外解释，不要输出代码块。不要输出精确胜率百分比。要保持克制、简短、适合移动端阅读。',
    userPrompt: [
      '请基于以下比赛信息，输出一个娱乐参考预测 JSON。',
      JSON.stringify(snapshot, null, 2),
      '输出字段必须严格为：winner_pick, score_pick, confidence_band, summary, bullets, risk_warning。',
      'winner_pick 只能是 home / draw / away。',
      'confidence_band 只能是 low / medium / high。',
      'bullets 只保留 2 到 3 条简短中文句子。',
    ].join('\n'),
  };
}

function buildMatchAnalysisPrompt(contentType: 'PRE_MATCH_ANALYSIS' | 'SEARCH_ENHANCEMENT', context: ContentBuildContext) {
  const match = assertMatch(context.match);
  const snapshot = buildMatchSnapshot(context.db, match);
  const enhancementHints: string[] = [];
  if (context.enhancementMode === 'search' || context.enhancementMode === 'search_multimodal') {
    enhancementHints.push('请结合联网搜索能力补充最近公开信息，但不要覆盖给定的本地赔率、比分和赛果事实。');
  }
  if (context.enhancementMode === 'multimodal' || context.enhancementMode === 'search_multimodal') {
    enhancementHints.push('如果存在图像输入，请把图像仅作为赛前辅助信息来源。');
  }

  const outputHint =
    contentType === 'SEARCH_ENHANCEMENT'
      ? '输出字段必须严格为：summary, prediction, bullets, risk_warning, search_enhanced, multimodal_enhanced。prediction 内包含 winner_pick 与 score_pick。'
      : '输出字段必须严格为：summary, prediction, bullets, risk_warning, search_enhanced, multimodal_enhanced。prediction 内包含 winner_pick 与 score_pick。';

  return {
    systemPrompt:
      '你是世界杯朋友群的中文 AI 赛前分析助手。只输出 JSON，不要输出多余解释，不要输出 Markdown 代码块。内容要短，适合首页与比赛详情卡片。',
    userPrompt: [
      '请基于以下比赛信息，生成一条结构化赛前分析。',
      JSON.stringify(snapshot, null, 2),
      ...enhancementHints,
      outputHint,
      'summary 只保留一句结论。',
      'bullets 只保留 2 到 3 条短句。',
      'risk_warning 只保留一句提醒。',
    ].join('\n'),
  };
}

function buildLeaderboardPrompt(context: ContentBuildContext) {
  const roomId = resolveRoomId(context.db, context.roomId);
  const snapshot = buildLeaderboardSnapshot(context.db, roomId);
  return {
    systemPrompt:
      '你是世界杯朋友群排行榜点评助手。只输出 JSON，不要输出额外解释。风格轻松但克制，像群里懂球的朋友，不要写成长文。',
    userPrompt: [
      '请基于以下排行榜结构化数据，生成一条 AI 榜单点评。',
      JSON.stringify(snapshot, null, 2),
      '输出字段必须严格为：headline, summary, highlights, fun_tags。',
      'headline 为一句短标题。',
      'summary 为一段 1 到 2 句的中文点评。',
      'highlights 保留 2 到 3 条短句。',
      'fun_tags 保留 2 到 4 个短标签，不要带井号。',
    ].join('\n'),
  };
}

async function callProvider(options: ProviderCallOptions) {
  if (options.provider === 'DeepSeek') {
    if (!options.config.deepSeekApiKey) throw new Error('DeepSeek API key missing');
    return callDeepSeek(options.config.deepSeekApiKey, options.systemPrompt, options.userPrompt);
  }
  if (options.provider === 'Mimo') {
    if (!options.config.mimoApiKey) throw new Error('Mimo API key missing');
    return callMimo(options);
  }
  if (options.provider === 'Gemini') {
    if (!options.config.geminiApiKey) throw new Error('Gemini API key missing');
    return callGemini(options.config.geminiApiKey, options.systemPrompt, options.userPrompt);
  }
  throw new Error(`Unsupported provider: ${options.provider}`);
}

async function callDeepSeek(apiKey: string, systemPrompt: string, userPrompt: string) {
  const data = await withRetry(async () => {
    const response = await fetchWithTimeout('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        temperature: 0.4,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek request failed (${response.status})`);
    }

    return (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
  });

  return data.choices?.[0]?.message?.content?.trim() || '';
}

async function callMimo(options: ProviderCallOptions) {
  const model =
    options.enhancementMode === 'multimodal' || options.enhancementMode === 'search_multimodal'
      ? options.config.mimoMultimodalModel
      : options.config.mimoDefaultModel;

  const content =
    options.sourceImageUrls && options.sourceImageUrls.length > 0
      ? [
          ...options.sourceImageUrls.map((url) => ({
            type: 'image_url',
            image_url: { url },
          })),
          {
            type: 'text',
            text: options.userPrompt,
          },
        ]
      : options.userPrompt;

  const data = await withRetry(async () => {
    const response = await fetchWithTimeout(`${options.config.mimoBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': options.config.mimoApiKey,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: options.systemPrompt },
          { role: 'user', content },
        ],
        max_completion_tokens: 2048,
        temperature: 0.4,
        top_p: 0.95,
        stream: false,
        thinking: { type: 'disabled' },
        enableWebSearch:
          options.config.aiEnableWebSearch &&
          (options.enhancementMode === 'search' || options.enhancementMode === 'search_multimodal'),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Mimo request failed (${response.status}) ${errorText}`);
    }

    return (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
  });

  return data.choices?.[0]?.message?.content?.trim() || '';
}

async function callGemini(apiKey: string, systemPrompt: string, userPrompt: string) {
  const client = getGeminiClient(apiKey);
  if (!client) throw new Error('Gemini client unavailable');

  const response = await client.models.generateContent({
    model: DEFAULT_GEMINI_MODEL,
    contents: userPrompt,
    config: {
      temperature: 0.4,
      systemInstruction: systemPrompt,
    },
  });

  return response.text?.trim() || '';
}

function getGeminiClient(apiKey: string) {
  if (!apiKey) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'world-cup-clubhouse',
        },
      },
    });
  }
  return geminiClient;
}

function normalizeOutput(
  contentType: GenerateAiResultParams['contentType'],
  rawText: string,
  enhancementMode: AIEnhancementMode,
): StructuredOutput {
  if (contentType === 'MATCH_PREDICTION') {
    return normalizePrediction(rawText);
  }
  if (contentType === 'LEADERBOARD_COMMENTARY') {
    return normalizeLeaderboardCommentary(rawText);
  }
  return normalizePreMatchAnalysis(rawText, enhancementMode);
}

function normalizePrediction(rawText: string): AIPredictionResult {
  const payload = parseStructuredPayload(rawText);
  return {
    winner_pick: normalizeWinnerPick(payload?.winner_pick),
    score_pick: normalizeScorePick(payload?.score_pick),
    confidence_band: normalizeConfidence(payload?.confidence_band),
    summary: normalizeSentence(payload?.summary, '本场更适合先看临场，再做娱乐参考判断。'),
    bullets: normalizeBullets(payload?.bullets, [
      '两队实力接近，节奏变化比热度更重要。',
      '先看临场阵容和指数变化再决定积分分档。',
      '比分玩法更适合小额试探。',
    ]),
    risk_warning: normalizeSentence(payload?.risk_warning, '临场名单和锁盘时间都可能改变判断。'),
  };
}

function normalizePreMatchAnalysis(rawText: string, enhancementMode: AIEnhancementMode): AIPreMatchAnalysisResult {
  const payload = parseStructuredPayload(rawText);
  const nestedPrediction = payload?.prediction || {};
  return {
    summary: normalizeSentence(payload?.summary, '这场更像拉锯战，适合先观察节奏再做娱乐参考。'),
    prediction: {
      winner_pick: normalizeWinnerPick(nestedPrediction.winner_pick),
      score_pick: normalizeScorePick(nestedPrediction.score_pick),
    },
    bullets: normalizeBullets(payload?.bullets, [
      '两队临场节奏和中场控制会决定比赛走势。',
      '高热方向不宜一次性压重。',
      '先看首发和临场指数变化。',
    ]),
    risk_warning: normalizeSentence(payload?.risk_warning, '临场变化可能让原本判断快速失效。'),
    search_enhanced:
      Boolean(payload?.search_enhanced) ||
      enhancementMode === 'search' ||
      enhancementMode === 'search_multimodal',
    multimodal_enhanced:
      Boolean(payload?.multimodal_enhanced) ||
      enhancementMode === 'multimodal' ||
      enhancementMode === 'search_multimodal',
  };
}

function normalizeLeaderboardCommentary(rawText: string): AILeaderboardCommentaryResult {
  const payload = parseStructuredPayload(rawText);
  return {
    headline: normalizeSentence(payload?.headline, '今晚榜单气氛组已就位'),
    summary: normalizeSentence(payload?.summary, '头部选手依旧稳住节奏，中后段还有翻身空间。'),
    highlights: normalizeBullets(payload?.highlights, [
      '榜首选手目前在稳定拉开积分差距。',
      '今天的黑马表现值得继续盯一轮。',
      '高光和翻车都还可能在下一场出现。',
    ]),
    fun_tags: normalizeFunTags(payload?.fun_tags, ['稳住节奏', '黑马观察', '临场见分晓']),
    risk_warning: normalizeSentence(payload?.risk_warning, ''),
  };
}

function buildLocalFallback(contentType: GenerateAiResultParams['contentType'], context: ContentBuildContext): StructuredOutput {
  if (contentType === 'MATCH_PREDICTION') {
    return {
      winner_pick: 'home',
      score_pick: '1-1',
      confidence_band: 'medium',
      summary: '这场更像一场胶着对话，主队不败倾向稍高。',
      bullets: ['先看临场阵容再决定投入档位。', '热度太高的一边不宜重压。', '比分玩法更适合轻量试探。'],
      risk_warning: '临场名单和锁盘时间都可能快速改变判断。',
    };
  }

  if (contentType === 'LEADERBOARD_COMMENTARY') {
    const snapshot = buildLeaderboardSnapshot(context.db, resolveRoomId(context.db, context.roomId));
    return {
      headline: '今晚榜单还在持续升温',
      summary: `${snapshot.leader?.displayName || '榜首选手'} 目前守在前排，但后续几场仍有翻盘空间。`,
      highlights: [
        `${snapshot.leader?.displayName || '榜首选手'} 目前是这轮最稳的一位。`,
        `${snapshot.darkHorse?.displayName || '黑马选手'} 的走势值得继续留意。`,
        '下一轮结算后，榜单顺序还可能明显变化。',
      ],
      fun_tags: ['稳住节奏', '黑马观察', '临场见分晓'],
    };
  }

  return {
    summary: '这场先看节奏和首发，娱乐积分建议分档操作。',
    prediction: {
      winner_pick: 'home',
      score_pick: '1-1',
    },
    bullets: ['强强对话更适合先观察临场。', '高热方向不宜一次性压重。', '比分玩法适合小档位试探。'],
    risk_warning: '临场变化会直接影响参考价值。',
    search_enhanced: false,
    multimodal_enhanced: false,
  };
}

function buildAiContentRecord(params: {
  contentType: GenerateAiResultParams['contentType'];
  output: StructuredOutput;
  provider: AIProvider;
  model: string;
  fallbackUsed: boolean;
  match?: Match;
  roomId?: string;
  enhancementMode: AIEnhancementMode;
  promptVersion: string;
  dataVersion: string;
  cacheKey: string;
  inputSnapshotJson: Record<string, unknown>;
}): AIContent {
  const now = new Date().toISOString();
  const title = buildTitle(params.contentType, params.match, params.roomId);
  const base: AIContent = {
    id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: params.contentType,
    contentType: params.contentType,
    matchId: params.match?.id,
    roomId: params.roomId,
    title,
    content: buildContentText(params.output),
    model: params.model,
    createdAt: now,
    provider: params.provider,
    fallbackUsed: params.fallbackUsed,
    scopeType: params.match ? 'match' : params.roomId ? 'room' : 'global',
    scopeId: params.match?.id || params.roomId || 'global',
    promptVersion: params.promptVersion,
    dataVersion: params.dataVersion,
    enhancementMode: params.enhancementMode,
    inputSnapshotJson: params.inputSnapshotJson,
    outputJson: params.output,
    searchEnhanced:
      params.enhancementMode === 'search' || params.enhancementMode === 'search_multimodal',
    multimodalEnhanced:
      params.enhancementMode === 'multimodal' || params.enhancementMode === 'search_multimodal',
    status: 'ready',
    expiresAt: buildExpiryAt(params.match, params.contentType),
    cacheKey: params.cacheKey,
  };

  if (params.contentType === 'MATCH_PREDICTION') {
    const prediction = params.output as AIPredictionResult;
    base.summary = prediction.summary;
    base.bullets = prediction.bullets;
    base.riskWarning = prediction.risk_warning;
    base.predictionJson = prediction;
  } else if (params.contentType === 'LEADERBOARD_COMMENTARY') {
    const commentary = params.output as AILeaderboardCommentaryResult;
    base.summary = commentary.summary;
    base.bullets = commentary.highlights;
    base.riskWarning = commentary.risk_warning;
    base.headline = commentary.headline;
    base.highlights = commentary.highlights;
    base.funTags = commentary.fun_tags;
  } else {
    const analysis = params.output as AIPreMatchAnalysisResult;
    base.summary = analysis.summary;
    base.bullets = analysis.bullets;
    base.riskWarning = analysis.risk_warning;
    base.predictionJson = {
      winner_pick: analysis.prediction.winner_pick,
      score_pick: analysis.prediction.score_pick,
      confidence_band: 'medium',
      summary: analysis.summary,
      bullets: analysis.bullets,
      risk_warning: analysis.risk_warning,
    };
  }

  return base;
}

function buildTitle(contentType: GenerateAiResultParams['contentType'], match?: Match, roomId?: string) {
  if (contentType === 'LEADERBOARD_COMMENTARY') {
    return `AI 榜单点评 · ${roomId || 'default-room'}`;
  }
  if (!match) {
    return 'AI 内容';
  }
  const label = match.roundName || match.id;
  if (contentType === 'MATCH_PREDICTION') return `AI 预测 · ${label}`;
  if (contentType === 'SEARCH_ENHANCEMENT') return `AI 搜索增强 · ${label}`;
  return `AI 赛前分析 · ${label}`;
}

function buildContentText(output: StructuredOutput) {
  if ('headline' in output) {
    const commentary = output as AILeaderboardCommentaryResult;
    return [commentary.headline, commentary.summary, ...commentary.highlights].filter(Boolean).join('\n');
  }

  if ('prediction' in output) {
    const analysis = output as AIPreMatchAnalysisResult;
    return [
      analysis.summary,
      ...analysis.bullets,
      `风险提醒：${analysis.risk_warning}`,
    ].join('\n');
  }

  const prediction = output as AIPredictionResult;
  return [
    prediction.summary,
    ...prediction.bullets,
    `参考比分：${prediction.score_pick}`,
    `风险提醒：${prediction.risk_warning}`,
  ].join('\n');
}

function buildInputSnapshot(contentType: GenerateAiResultParams['contentType'], context: ContentBuildContext) {
  if (contentType === 'LEADERBOARD_COMMENTARY') {
    return buildLeaderboardSnapshot(context.db, resolveRoomId(context.db, context.roomId));
  }
  return buildMatchSnapshot(context.db, assertMatch(context.match));
}

function buildMatchSnapshot(db: DatabaseSchema, match: Match) {
  const homeTeam = db.teams.find((team) => team.id === match.homeTeamId);
  const awayTeam = db.teams.find((team) => team.id === match.awayTeamId);
  const odds = db.matchOdds[match.id];
  return {
    matchId: match.id,
    stage: match.stage,
    roundName: match.roundName,
    venueName: match.venueName,
    venueCity: match.venueCity,
    startTimeUtc: match.startTimeUtc,
    status: match.status,
    homeTeam: {
      id: homeTeam?.id,
      code: homeTeam?.code,
      nameZh: homeTeam?.nameZh,
      groupName: homeTeam?.groupName,
    },
    awayTeam: {
      id: awayTeam?.id,
      code: awayTeam?.code,
      nameZh: awayTeam?.nameZh,
      groupName: awayTeam?.groupName,
    },
    odds: odds
      ? {
          source: odds.source,
          h2h: odds.h2h,
          totalGoals: odds.totalGoals,
          lastUpdated: odds.lastUpdated,
        }
      : null,
    lineupAvailable: Boolean(match.lineups),
    eventCount: match.events?.length || 0,
  };
}

function buildLeaderboardSnapshot(db: DatabaseSchema, roomId: string) {
  const users = db.users.filter((item) => item.groupId === roomId);
  const entries = users.map((user) => {
    const wallet = db.wallets.find((item) => item.userId === user.id);
    const predictions = db.predictions.filter((item) => item.userId === user.id);
    const wonCount = predictions.filter((item) => item.status === 'WON').length;
    const totalCount = predictions.length;
    const rate = totalCount === 0 ? 0 : Math.round((wonCount / totalCount) * 100);
    const todayProfit = predictions
      .filter((item) => item.settledAt && new Date(item.settledAt).getTime() >= Date.now() - 24 * 60 * 60 * 1000)
      .reduce((sum, item) => sum + (item.settledProfit || 0), 0);
    return {
      userId: user.id,
      displayName: user.displayName,
      balance: wallet?.balance || 0,
      rate,
      totalCount,
      wonCount,
      todayProfit,
      maxStreak: buildMaxStreak(predictions),
      aiBadge: predictions.length >= 3 && rate >= 70 ? '连中高手' : '节奏观察员',
    };
  });

  const sortedByBalance = [...entries].sort((a, b) => b.balance - a.balance);
  const sortedByToday = [...entries].sort((a, b) => b.todayProfit - a.todayProfit);
  const sortedByRate = [...entries].sort((a, b) => b.rate - a.rate);

  return {
    roomId,
    leader: sortedByBalance[0] || null,
    darkHorse: sortedByToday[0] || sortedByBalance[1] || null,
    sharpShooter: sortedByRate[0] || null,
    entries: sortedByBalance.slice(0, 5),
  };
}

function buildMaxStreak(predictions: DatabaseSchema['predictions']) {
  const completed = predictions
    .filter((item) => item.status === 'WON' || item.status === 'LOST')
    .sort((a, b) => new Date(a.settledAt || a.placedAt).getTime() - new Date(b.settledAt || b.placedAt).getTime());
  let maxStreak = 0;
  let current = 0;
  for (const prediction of completed) {
    if (prediction.status === 'WON') {
      current += 1;
      maxStreak = Math.max(maxStreak, current);
    } else {
      current = 0;
    }
  }
  return maxStreak;
}

function buildDataVersion(params: {
  db: DatabaseSchema;
  match?: Match;
  roomId?: string;
  contentType: GenerateAiResultParams['contentType'];
  now: number;
}) {
  if (params.contentType === 'LEADERBOARD_COMMENTARY') {
    const snapshot = buildLeaderboardSnapshot(params.db, resolveRoomId(params.db, params.roomId));
    return [
      params.contentType,
      snapshot.leader?.userId || 'none',
      snapshot.leader?.balance || 0,
      snapshot.darkHorse?.userId || 'none',
      latestSettlementStamp(params.db),
    ].join(':');
  }

  const match = assertMatch(params.match);
  const odds = params.db.matchOdds[match.id];
  return [
    params.contentType,
    match.id,
    match.status,
    match.homeScore ?? 'na',
    match.awayScore ?? 'na',
    odds?.lastUpdated || 'no-odds',
    getRefreshBucket(match.startTimeUtc, params.now),
  ].join(':');
}

function latestSettlementStamp(db: DatabaseSchema) {
  return db.predictions
    .map((item) => item.settledAt || item.placedAt)
    .sort()
    .slice(-1)[0] || 'none';
}

function buildCacheKey(params: {
  contentType: AIContentType;
  scopeId: string;
  provider: AIProvider;
  model: string;
  promptVersion: string;
  dataVersion: string;
  enhancementMode: AIEnhancementMode;
}) {
  return [
    params.contentType,
    params.scopeId,
    params.provider,
    params.model,
    params.promptVersion,
    params.dataVersion,
    params.enhancementMode,
  ].join(':');
}

function buildExpiryAt(match: Match | undefined, contentType: GenerateAiResultParams['contentType']) {
  if (contentType === 'LEADERBOARD_COMMENTARY') {
    return new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
  }
  if (!match) {
    return new Date(Date.now() + 60 * 60 * 1000).toISOString();
  }

  const kickoff = new Date(match.startTimeUtc).getTime();
  const now = Date.now();
  if (kickoff <= now) {
    return new Date(now + 30 * 60 * 1000).toISOString();
  }

  for (const windowMs of MATCH_ANALYSIS_REFRESH_WINDOWS_MS) {
    const boundary = kickoff - windowMs;
    if (boundary > now) {
      return new Date(boundary).toISOString();
    }
  }

  return new Date(kickoff).toISOString();
}

function getRefreshBucket(startTimeUtc: string, now: number) {
  const diff = new Date(startTimeUtc).getTime() - now;
  if (diff > MATCH_ANALYSIS_REFRESH_WINDOWS_MS[0]) return 't6h';
  if (diff > MATCH_ANALYSIS_REFRESH_WINDOWS_MS[1]) return 't1h';
  if (diff > MATCH_ANALYSIS_REFRESH_WINDOWS_MS[2]) return 't15m';
  if (diff > 0) return 'prelock';
  return 'live_or_post';
}

function resolvePrimaryProvider(
  contentType: GenerateAiResultParams['contentType'],
  enhancementMode: AIEnhancementMode,
  config: RuntimeConfig,
): AIProvider {
  if (
    contentType === 'SEARCH_ENHANCEMENT' ||
    enhancementMode === 'search' ||
    enhancementMode === 'multimodal' ||
    enhancementMode === 'search_multimodal'
  ) {
    return 'Mimo';
  }
  if (contentType === 'LEADERBOARD_COMMENTARY' || contentType === 'MATCH_PREDICTION' || contentType === 'PRE_MATCH_ANALYSIS') {
    return mapConfigProvider(config.aiPrimaryProvider);
  }
  return 'DeepSeek';
}

function buildProviderRoute(
  contentType: GenerateAiResultParams['contentType'],
  enhancementMode: AIEnhancementMode,
  config: RuntimeConfig,
) {
  const first = resolvePrimaryProvider(contentType, enhancementMode, config);
  const fallback = mapConfigProvider(config.aiFallbackProvider);
  return uniqueProviders([first, fallback, 'Gemini']);
}

function uniqueProviders(providers: AIProvider[]) {
  return providers.filter((provider, index) => providers.indexOf(provider) === index);
}

function mapConfigProvider(provider: RuntimeConfig['aiPrimaryProvider'] | RuntimeConfig['aiFallbackProvider']): AIProvider {
  if (provider === 'mimo') return 'Mimo';
  if (provider === 'gemini') return 'Gemini';
  return 'DeepSeek';
}

function resolveModel(provider: AIProvider, config: RuntimeConfig, enhancementMode: AIEnhancementMode) {
  if (provider === 'Mimo') {
    if (enhancementMode === 'multimodal' || enhancementMode === 'search_multimodal') {
      return config.mimoMultimodalModel;
    }
    return config.mimoDefaultModel;
  }
  if (provider === 'Gemini') {
    return DEFAULT_GEMINI_MODEL;
  }
  if (provider === 'DeepSeek') {
    return 'deepseek-chat';
  }
  return 'local-fallback';
}

function normalizeWinnerPick(value: unknown): AIPredictionResult['winner_pick'] {
  return value === 'away' || value === 'draw' ? value : 'home';
}

function normalizeConfidence(value: unknown): AIPredictionResult['confidence_band'] {
  return value === 'low' || value === 'high' ? value : 'medium';
}

function normalizeScorePick(value: unknown) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return '1-1';
}

function normalizeSentence(value: unknown, fallback: string) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return fallback;
}

function normalizeBullets(value: unknown, fallback: string[]) {
  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
      .slice(0, 3);
    if (normalized.length > 0) {
      return normalized;
    }
  }
  return fallback;
}

function normalizeFunTags(value: unknown, fallback: string[]) {
  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => (typeof item === 'string' ? item.trim().replace(/^#/, '') : ''))
      .filter(Boolean)
      .slice(0, 4);
    if (normalized.length > 0) {
      return normalized;
    }
  }
  return fallback;
}

function parseStructuredPayload(rawText: string) {
  const text = rawText.trim();
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1]?.trim() || text;

  try {
    return JSON.parse(candidate);
  } catch {
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
      } catch {
        return {};
      }
    }
    return {};
  }
}

function assertMatch(match: Match | undefined): Match {
  if (!match) {
    throw new Error('Match context is required');
  }
  return match;
}

const AI_API_TIMEOUT_MS = 30_000; // AI API 请求超时 30 秒

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      await sleep(400 * 2 ** attempt);
    }
  }
  throw lastError;
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = AI_API_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapSvgText(lines: string[], x: number, y: number, lineHeight: number) {
  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * lineHeight}" fill="#E2E8F0" font-size="24" font-family="Arial, sans-serif">${escapeXml(line)}</text>`,
    )
    .join('');
}

function buildShareSvg(params: BetShareParams, aiCopy: AIContent) {
  const bullets = (aiCopy.bullets || []).slice(0, 2);
  const lines = bullets.length > 0 ? bullets : [aiCopy.summary || '今晚先看节奏，再决定怎么玩。'];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0F172A" />
          <stop offset="55%" stop-color="#0B3B3A" />
          <stop offset="100%" stop-color="#14532D" />
        </linearGradient>
      </defs>
      <rect width="1080" height="1350" fill="url(#bg)" rx="40" />
      <rect x="56" y="56" width="968" height="1238" rx="36" fill="rgba(15,23,42,0.55)" stroke="rgba(255,255,255,0.14)" />
      <text x="96" y="132" fill="#A7F3D0" font-size="30" font-family="Arial, sans-serif">WORLD CUP GROUP SHARE</text>
      <text x="96" y="214" fill="#FFFFFF" font-size="64" font-weight="700" font-family="Arial, sans-serif">${escapeXml(params.summary.homeTeam)} vs ${escapeXml(params.summary.awayTeam)}</text>
      <text x="96" y="264" fill="#CBD5E1" font-size="28" font-family="Arial, sans-serif">${escapeXml(params.summary.kickoffLabel)}</text>

      <rect x="96" y="320" width="888" height="220" rx="28" fill="rgba(255,255,255,0.08)" />
      <text x="132" y="382" fill="#86EFAC" font-size="28" font-family="Arial, sans-serif">竞猜人</text>
      <text x="132" y="430" fill="#FFFFFF" font-size="46" font-weight="700" font-family="Arial, sans-serif">${escapeXml(params.summary.userName)}</text>
      <text x="132" y="500" fill="#CBD5E1" font-size="30" font-family="Arial, sans-serif">${escapeXml(params.summary.marketLabel)} · ${escapeXml(params.summary.optionLabel)}</text>

      <rect x="96" y="586" width="276" height="144" rx="26" fill="rgba(255,255,255,0.08)" />
      <rect x="402" y="586" width="276" height="144" rx="26" fill="rgba(255,255,255,0.08)" />
      <rect x="708" y="586" width="276" height="144" rx="26" fill="rgba(255,255,255,0.08)" />
      <text x="132" y="634" fill="#94A3B8" font-size="24" font-family="Arial, sans-serif">赔率</text>
      <text x="132" y="694" fill="#FFFFFF" font-size="48" font-weight="700" font-family="Arial, sans-serif">${escapeXml(params.summary.oddsLabel)}</text>
      <text x="438" y="634" fill="#94A3B8" font-size="24" font-family="Arial, sans-serif">投入</text>
      <text x="438" y="694" fill="#FFFFFF" font-size="48" font-weight="700" font-family="Arial, sans-serif">${escapeXml(params.summary.stakeLabel)}</text>
      <text x="744" y="634" fill="#94A3B8" font-size="24" font-family="Arial, sans-serif">模型</text>
      <text x="744" y="694" fill="#FFFFFF" font-size="40" font-weight="700" font-family="Arial, sans-serif">${escapeXml(aiCopy.provider || 'Local')}</text>

      <rect x="96" y="786" width="888" height="320" rx="28" fill="rgba(255,255,255,0.08)" />
      <text x="132" y="848" fill="#A5F3FC" font-size="28" font-family="Arial, sans-serif">AI 一句话点评</text>
      <text x="132" y="912" fill="#FFFFFF" font-size="38" font-weight="700" font-family="Arial, sans-serif">${escapeXml(aiCopy.summary || aiCopy.title)}</text>
      ${wrapSvgText(lines, 132, 978, 42)}

      <rect x="96" y="1148" width="888" height="96" rx="24" fill="rgba(251,191,36,0.12)" stroke="rgba(251,191,36,0.28)" />
      <text x="132" y="1204" fill="#FDE68A" font-size="24" font-family="Arial, sans-serif">仅供群聊娱乐讨论，不构成真实投资建议。赔率与赛况请以当前页面为准。</text>
    </svg>
  `;

  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
}

export async function generateBetShareCard(params: BetShareParams): Promise<ShareCardRecord> {
  const aiCopy = await generateStructuredAiContent({
    type: 'BET_SHARE_COPY',
    title: params.title,
    prompt: params.prompt,
    fallbackBody: params.fallbackBody,
    deepSeekApiKey: params.config.deepSeekApiKey,
    geminiApiKey: params.config.geminiApiKey,
  });

  return {
    id: `share-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: '',
    predictionId: params.predictionId,
    matchId: params.matchId,
    mode: 'image',
    text: aiCopy.content,
    imageDataUrl: buildShareSvg(params, aiCopy),
    provider: aiCopy.provider || 'Local',
    model: aiCopy.model,
    fallbackUsed: aiCopy.fallbackUsed ?? true,
    createdAt: new Date().toISOString(),
    debugMeta: {
      textProvider: aiCopy.provider || 'Local',
      textModel: aiCopy.model,
      imageFallback: 'svg-template',
    },
  };
}
