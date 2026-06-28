export interface LevelConfig {
  level: number;
  minNetProfit: number;
  label: string;
  color: string;       // tailwind text color class
  bgColor: string;     // tailwind bg color class
  badgeBg: string;     // tailwind bg/border for badge
  barGradient: string; // tailwind gradient classes for progress bar
}

export const LEVEL_CONFIGS: LevelConfig[] = [
  { level: 1,  minNetProfit: 0,       label: '青铜球童',   color: 'text-amber-700',  bgColor: 'bg-amber-50',   badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',     barGradient: 'from-amber-500 to-amber-400' },
  { level: 2,  minNetProfit: 500,     label: '黑铁后卫',   color: 'text-slate-700',  bgColor: 'bg-slate-100',  badgeBg: 'bg-slate-200 text-slate-700 border-slate-300',     barGradient: 'from-slate-500 to-slate-400' },
  { level: 3,  minNetProfit: 1500,    label: '绿茵新秀',   color: 'text-green-700',  bgColor: 'bg-green-50',   badgeBg: 'bg-green-100 text-green-800 border-green-200',     barGradient: 'from-green-500 to-green-400' },
  { level: 4,  minNetProfit: 3000,    label: '战术中场',   color: 'text-teal-700',   bgColor: 'bg-teal-50',    badgeBg: 'bg-teal-100 text-teal-800 border-teal-200',       barGradient: 'from-teal-500 to-teal-400' },
  { level: 5,  minNetProfit: 6000,    label: '锋线快马',   color: 'text-cyan-700',   bgColor: 'bg-cyan-50',    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',       barGradient: 'from-cyan-500 to-cyan-400' },
  { level: 6,  minNetProfit: 10000,   label: '铁血队长',   color: 'text-blue-700',   bgColor: 'bg-blue-50',    badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',       barGradient: 'from-blue-500 to-blue-400' },
  { level: 7,  minNetProfit: 15000,   label: '战术大师',   color: 'text-indigo-700', bgColor: 'bg-indigo-50',  badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200', barGradient: 'from-indigo-500 to-indigo-400' },
  { level: 8,  minNetProfit: 22000,   label: '中场核心',   color: 'text-violet-700', bgColor: 'bg-violet-50',  badgeBg: 'bg-violet-100 text-violet-800 border-violet-200', barGradient: 'from-violet-500 to-violet-400' },
  { level: 9,  minNetProfit: 30000,   label: '神锋射手',   color: 'text-purple-700', bgColor: 'bg-purple-50',  badgeBg: 'bg-purple-100 text-purple-800 border-purple-200', barGradient: 'from-purple-500 to-purple-400' },
  { level: 10, minNetProfit: 40000,   label: '传奇巨星',   color: 'text-pink-700',   bgColor: 'bg-pink-50',    badgeBg: 'bg-pink-100 text-pink-800 border-pink-200',       barGradient: 'from-pink-500 to-pink-400' },
  { level: 11, minNetProfit: 55000,   label: '冠军教头',   color: 'text-rose-700',   bgColor: 'bg-rose-50',    badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',       barGradient: 'from-rose-500 to-rose-400' },
  { level: 12, minNetProfit: 75000,   label: '球王至尊',   color: 'text-yellow-600', bgColor: 'bg-yellow-50',  badgeBg: 'bg-gradient-to-r from-amber-200 to-yellow-200 text-amber-900 border-amber-300', barGradient: 'from-yellow-500 to-amber-400' },
];

/** 根据净收益计算当前等级（不降级） */
export function getLevelByNetProfit(netProfit: number): LevelConfig {
  let best = LEVEL_CONFIGS[0];
  for (const cfg of LEVEL_CONFIGS) {
    if (netProfit >= cfg.minNetProfit) {
      best = cfg;
    }
  }
  return best;
}

export interface RuntimeConfig {
  theOddsApiKey: string;
  sportteryApiBaseUrl: string;
  sportterySyncIntervalMinutes: number;
  deepSeekApiKey: string;
  geminiApiKey: string;
  mimoApiKey: string;
  mimoBaseUrl: string;
  mimoDefaultModel: string;
  mimoMultimodalModel: string;
  mimoFastModel: string;
  deepSeekModel: string;
  geminiTextModel: string;
  geminiImageModel: string;
  aiPrimaryProvider: 'deepseek' | 'mimo' | 'gemini';
  aiFallbackProvider: 'mimo' | 'gemini' | 'local';
  aiEnableWebSearch: boolean;
  aiEnableMultimodal: boolean;
  aiCacheTtlMinutes: number;
  adminUsername: string;
  adminPassword: string;
  adminSessionTtlMs: number;
  predictionLockMinutes: number;
  syncIntervalMinutes: number;
  activityMaxEntries: number;
  activityArchiveFile: string;
  defaultRoomId: string;
}

function readEnv(name: string, fallback = '') {
  return (process.env[name] || fallback).trim();
}

export function getRuntimeConfig(): RuntimeConfig {
  return {
    theOddsApiKey: readEnv('THE_ODDS_API_KEY'),
    sportteryApiBaseUrl: readEnv('SPORTTERY_API_BASE_URL', 'https://webapi.sporttery.cn/gateway'),
    sportterySyncIntervalMinutes: Math.max(5, Number(process.env.SPORTTERY_SYNC_INTERVAL_MINUTES || 60)),
    deepSeekApiKey: readEnv('DEEPSEEK_API_KEY'),
    geminiApiKey: readEnv('GEMINI_API_KEY'),
    mimoApiKey: readEnv('MIMO_API_KEY'),
    mimoBaseUrl: readEnv('MIMO_BASE_URL', 'https://api.xiaomimimo.com/v1'),
    mimoDefaultModel: readEnv('MIMO_DEFAULT_MODEL', 'mimo-v2.5-pro'),
    mimoMultimodalModel: readEnv('MIMO_MULTIMODAL_MODEL', 'mimo-v2.5'),
    mimoFastModel: readEnv('MIMO_FAST_MODEL', 'mimo-v2-flash'),
    deepSeekModel: readEnv('DEEPSEEK_MODEL', 'deepseek-v4-pro'),
    geminiTextModel: readEnv('GEMINI_TEXT_MODEL', 'gemini-2.5-flash'),
    geminiImageModel: readEnv('GEMINI_IMAGE_MODEL', 'gemini-2.5-flash-image-preview'),
    aiPrimaryProvider: (readEnv('AI_PRIMARY_PROVIDER', 'deepseek').toLowerCase() as RuntimeConfig['aiPrimaryProvider']),
    aiFallbackProvider: (readEnv('AI_FALLBACK_PROVIDER', 'mimo').toLowerCase() as RuntimeConfig['aiFallbackProvider']),
    aiEnableWebSearch: readEnv('AI_ENABLE_WEB_SEARCH', 'true') !== 'false',
    aiEnableMultimodal: readEnv('AI_ENABLE_MULTIMODAL', 'true') !== 'false',
    aiCacheTtlMinutes: Math.max(1, Number(process.env.AI_CACHE_TTL_MINUTES || 30)),
    adminUsername: readEnv('ADMIN_USERNAME', 'admin'),
    adminPassword: readEnv('ADMIN_PASSWORD', 'admin_worldcup2026'),
    adminSessionTtlMs: Number(process.env.ADMIN_SESSION_TTL_MS || 12 * 60 * 60 * 1000),
    predictionLockMinutes: Number(process.env.PREDICTION_LOCK_MINUTES || 5),
    syncIntervalMinutes: Number(process.env.SYNC_INTERVAL_MINUTES || 5),
    activityMaxEntries: Math.max(100, Number(process.env.ACTIVITY_MAX_ENTRIES || 1000)),
    activityArchiveFile: readEnv('ACTIVITY_ARCHIVE_FILE', 'db.activities.archive.json'),
    defaultRoomId: readEnv('DEFAULT_ROOM_ID', 'room-1'),
  };
}

export function hasProviderKey(key: string) {
  return Boolean(key && !key.startsWith('YOUR_') && !key.startsWith('MY_'));
}

export function summarizeProviderConfig(config: RuntimeConfig) {
  return {
    fixtures: { configured: true, env: 'ESPN（免费无需Key）' },
    odds: { configured: hasProviderKey(config.theOddsApiKey), env: 'THE_ODDS_API_KEY' },
    deepseek: {
      configured: hasProviderKey(config.deepSeekApiKey),
      env: 'DEEPSEEK_API_KEY',
      model: config.deepSeekModel,
    },
    mimo: {
      configured: hasProviderKey(config.mimoApiKey) && Boolean(config.mimoBaseUrl),
      env: 'MIMO_API_KEY',
      model: config.mimoDefaultModel,
      baseUrlConfigured: Boolean(config.mimoBaseUrl),
    },
    geminiText: {
      configured: hasProviderKey(config.geminiApiKey),
      env: 'GEMINI_API_KEY',
      model: config.geminiTextModel,
    },
    geminiImage: {
      configured: hasProviderKey(config.geminiApiKey),
      env: 'GEMINI_API_KEY',
      model: config.geminiImageModel,
    },
  };
}
