import { AIContent, ShareCardRecord } from '../types';
import { RuntimeConfig, hasProviderKey } from './config';

type TextProviderName = 'DeepSeek' | 'MiMo' | 'Gemini' | 'Local';
type ShareCardMode = 'image' | 'text';

interface StructuredRequest {
  type: AIContent['type'];
  title: string;
  prompt: string;
  fallbackBody: string;
  matchId?: string;
  predictionId?: string;
}

type LegacyStructuredRequest = StructuredRequest & {
  deepSeekApiKey?: string;
  geminiApiKey?: string;
};

interface TextProviderResult {
  provider: TextProviderName;
  model: string;
  text: string;
  fallbackUsed: boolean;
  debugMeta?: Record<string, string | number | boolean | null>;
}

interface BetShareParams {
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
}

function createAiId(prefix = 'ai') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeAiText(rawText: string) {
  const lines = rawText
    .split('\n')
    .map((line) => line.replace(/^[-*•\s]+/, '').trim())
    .filter(Boolean);

  const summary = lines[0] || '今晚先看节奏变化，再决定娱乐积分怎么分配。';
  const bulletPool = lines
    .slice(1)
    .filter((line) => !line.includes('风险') && !line.toLowerCase().includes('risk'));
  const bullets = bulletPool.slice(0, 3);
  const riskWarning =
    lines.find((line) => line.includes('风险') || line.includes('提醒')) ||
    '临场首发、盘口变化和锁盘时间都可能改变判断，娱乐积分建议分档操作。';

  return {
    summary,
    bullets: bullets.length > 0 ? bullets : ['先看首发再加注', '热门方向别一把压满', '比分玩法更适合小档位试水'],
    riskWarning,
    content: [summary, ...bullets, `风险提醒：${riskWarning}`].join('\n'),
  };
}

function buildFallbackAiContent(params: StructuredRequest): AIContent {
  const normalized = normalizeAiText(params.fallbackBody);
  return {
    id: createAiId(),
    type: params.type,
    matchId: params.matchId,
    predictionId: params.predictionId,
    title: params.title,
    model: 'local-fallback',
    provider: 'Local',
    createdAt: new Date().toISOString(),
    fallbackUsed: true,
    debugMeta: {
      route: 'local-fallback',
    },
    ...normalized,
  };
}

function buildProviderError(provider: TextProviderName, message: string) {
  return {
    provider,
    model: 'unavailable',
    text: '',
    fallbackUsed: true,
    debugMeta: { error: message },
  } satisfies TextProviderResult;
}

async function callDeepSeek(prompt: string, config: RuntimeConfig): Promise<TextProviderResult> {
  if (!hasProviderKey(config.deepSeekApiKey)) {
    return buildProviderError('DeepSeek', 'DEEPSEEK_API_KEY missing');
  }

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.deepSeekApiKey}`,
    },
    body: JSON.stringify({
      model: config.deepSeekModel,
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content:
            '你是世界杯群聊竞猜助手。请输出适合移动端阅读的简洁中文内容：第一句给结论，再给 2 到 3 条短 bullet，最后补一句风险提醒。',
        },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek request failed (${response.status})`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return {
    provider: 'DeepSeek',
    model: config.deepSeekModel,
    text: data.choices?.[0]?.message?.content?.trim() || '',
    fallbackUsed: false,
    debugMeta: {
      route: 'deepseek-chat-completions',
    },
  };
}

async function callMiMo(_prompt: string, config: RuntimeConfig): Promise<TextProviderResult> {
  if (!hasProviderKey(config.mimoApiKey) || !config.mimoBaseUrl) {
    return buildProviderError('MiMo', 'MiMo provider not configured');
  }

  return buildProviderError('MiMo', 'MiMo provider reserved but not implemented in this build');
}

async function callGeminiText(prompt: string, config: RuntimeConfig): Promise<TextProviderResult> {
  if (!hasProviderKey(config.geminiApiKey)) {
    return buildProviderError('Gemini', 'GEMINI_API_KEY missing');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.geminiTextModel)}:generateContent?key=${encodeURIComponent(config.geminiApiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: '你是世界杯群聊竞猜助手。请输出适合移动端阅读的简洁中文内容：第一句给结论，再给 2 到 3 条短 bullet，最后补一句风险提醒。',
            },
          ],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.8,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini text request failed (${response.status})`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n').trim() || '';

  return {
    provider: 'Gemini',
    model: config.geminiTextModel,
    text,
    fallbackUsed: false,
    debugMeta: {
      route: 'gemini-generateContent',
    },
  };
}

async function routeTextGeneration(prompt: string, config: RuntimeConfig) {
  const attempts = [
    () => callDeepSeek(prompt, config),
    () => callMiMo(prompt, config),
    () => callGeminiText(prompt, config),
  ];

  const errors: string[] = [];

  for (const attempt of attempts) {
    try {
      const result = await attempt();
      if (result.text) {
        return { result, errors };
      }
      if (result.debugMeta?.error) {
        errors.push(`${result.provider}: ${String(result.debugMeta.error)}`);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown provider error');
    }
  }

  return { result: null, errors };
}

export async function generateStructuredAiContent(
  params:
    | (StructuredRequest & {
        config: RuntimeConfig;
      })
    | LegacyStructuredRequest,
): Promise<AIContent> {
  const runtimeConfig =
    'config' in params
      ? params.config
      : {
          apiFootballKey: '',
          theOddsApiKey: '',
          deepSeekApiKey: params.deepSeekApiKey || '',
          geminiApiKey: params.geminiApiKey || '',
          mimoApiKey: '',
          mimoBaseUrl: '',
          mimoModel: 'mimo-v2.5-pro',
          deepSeekModel: 'deepseek-v4-pro',
          geminiTextModel: 'gemini-2.5-flash',
          geminiImageModel: 'gemini-2.5-flash-image-preview',
          adminUsername: 'admin',
          adminPassword: 'admin_worldcup2026',
          adminSessionTtlMs: 0,
          predictionLockMinutes: 5,
          syncIntervalMinutes: 5,
        };

  const routed = await routeTextGeneration(params.prompt, runtimeConfig);
  if (!routed.result) {
    return {
      ...buildFallbackAiContent(params),
      debugMeta: {
        route: 'local-fallback',
        errors: routed.errors.join(' | '),
      },
    };
  }

  const normalized = normalizeAiText(routed.result.text);
  return {
    id: createAiId(),
    type: params.type,
    matchId: params.matchId,
    predictionId: params.predictionId,
    title: params.title,
    model: routed.result.model,
    provider: routed.result.provider,
    createdAt: new Date().toISOString(),
    fallbackUsed: routed.result.provider !== 'DeepSeek',
    debugMeta: {
      ...(routed.result.debugMeta || {}),
      fallbackChain: routed.errors.join(' | ') || null,
    },
    ...normalized,
  };
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
      <text x="132" y="382" fill="#86EFAC" font-size="28" font-family="Arial, sans-serif">下注人</text>
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

async function tryGenerateGeminiImage(prompt: string, config: RuntimeConfig) {
  if (!hasProviderKey(config.geminiApiKey)) {
    return null;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.geminiImageModel)}:generateContent?key=${encodeURIComponent(config.geminiApiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseModalities: ['IMAGE', 'TEXT'],
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini image request failed (${response.status})`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: { mimeType?: string; data?: string };
          text?: string;
        }>;
      };
    }>;
  };

  for (const part of data.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData?.data && part.inlineData?.mimeType) {
      return {
        imageDataUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
        provider: 'Gemini' as const,
        model: config.geminiImageModel,
      };
    }
  }

  return null;
}

export async function generateBetShareCard(
  params: BetShareParams & {
    config: RuntimeConfig;
  },
): Promise<ShareCardRecord> {
  const aiCopy = await generateStructuredAiContent({
    config: params.config,
    type: 'BET_SHARE_COPY',
    title: params.title,
    prompt: params.prompt,
    fallbackBody: params.fallbackBody,
    matchId: params.matchId,
    predictionId: params.predictionId,
  });

  const imagePrompt = [
    'Create a premium sports social share card for a world cup group chat.',
    `Match: ${params.summary.homeTeam} vs ${params.summary.awayTeam}.`,
    `Pick: ${params.summary.marketLabel} - ${params.summary.optionLabel}.`,
    `Odds: ${params.summary.oddsLabel}. Stake: ${params.summary.stakeLabel}.`,
    `Short punchline in Chinese: ${aiCopy.summary || aiCopy.title}.`,
    'Visual tone: bold, clean, mobile-friendly, emerald accents, dark stadium atmosphere, no clutter, no extra people.',
  ].join(' ');

  try {
    const geminiImage = await tryGenerateGeminiImage(imagePrompt, params.config);
    if (geminiImage) {
      return {
        id: createAiId('share'),
        userId: '',
        predictionId: params.predictionId,
        matchId: params.matchId,
        mode: 'image',
        text: aiCopy.content,
        imageDataUrl: geminiImage.imageDataUrl,
        provider: 'Gemini',
        model: geminiImage.model,
        fallbackUsed: aiCopy.fallbackUsed ?? false,
        createdAt: new Date().toISOString(),
        debugMeta: {
          textProvider: aiCopy.provider || 'Local',
          textModel: aiCopy.model,
          imageProvider: 'Gemini',
        },
      };
    }
  } catch (error) {
    const imageFallback = buildShareSvg(params, aiCopy);
    return {
      id: createAiId('share'),
      userId: '',
      predictionId: params.predictionId,
      matchId: params.matchId,
      mode: 'image',
      text: aiCopy.content,
      imageDataUrl: imageFallback,
      provider: aiCopy.provider || 'Local',
      model: aiCopy.model,
      fallbackUsed: true,
      createdAt: new Date().toISOString(),
      debugMeta: {
        textProvider: aiCopy.provider || 'Local',
        textModel: aiCopy.model,
        imageFallback: 'svg-template',
        imageError: error instanceof Error ? error.message : 'Unknown image error',
      },
    };
  }

  return {
    id: createAiId('share'),
    userId: '',
    predictionId: params.predictionId,
    matchId: params.matchId,
    mode: 'image',
    text: aiCopy.content,
    imageDataUrl: buildShareSvg(params, aiCopy),
    provider: aiCopy.provider || 'Local',
    model: aiCopy.model,
    fallbackUsed: true,
    createdAt: new Date().toISOString(),
    debugMeta: {
      textProvider: aiCopy.provider || 'Local',
      textModel: aiCopy.model,
      imageFallback: 'svg-template',
    },
  };
}
