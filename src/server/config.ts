export interface RuntimeConfig {
  apiFootballKey: string;
  theOddsApiKey: string;
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
}

function readEnv(name: string, fallback = '') {
  return (process.env[name] || fallback).trim();
}

export function getRuntimeConfig(): RuntimeConfig {
  return {
    apiFootballKey: readEnv('API_FOOTBALL_KEY'),
    theOddsApiKey: readEnv('THE_ODDS_API_KEY'),
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
  };
}

export function hasProviderKey(key: string) {
  return Boolean(key && !key.startsWith('YOUR_') && !key.startsWith('MY_'));
}

export function summarizeProviderConfig(config: RuntimeConfig) {
  return {
    fixtures: { configured: hasProviderKey(config.apiFootballKey), env: 'API_FOOTBALL_KEY' },
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
