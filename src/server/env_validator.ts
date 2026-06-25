import logger from './logger';

interface EnvRule {
  name: string;
  required: boolean;
  description: string;
  default?: string;
}

const ENV_RULES: EnvRule[] = [
  { name: 'PORT', required: false, description: 'service port', default: '3000' },
  { name: 'APP_SECRET', required: true, description: 'application secret' },
  { name: 'DATABASE_URL', required: true, description: 'MySQL connection string' },
  { name: 'ADMIN_PASSWORD', required: false, description: 'admin password', default: 'admin_worldcup2026' },
  { name: 'APP_STORAGE_MODE', required: false, description: 'storage mode', default: 'mysql' },
  { name: 'APP_CORS_ORIGIN', required: false, description: 'allowed CORS origin' },
];

export function validateEnv(): void {
  const isProd = process.env.NODE_ENV === 'production';
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const rule of ENV_RULES) {
    const value = process.env[rule.name];

    if (!value && rule.required) {
      if (rule.default) {
        warnings.push(`${rule.name} not set, using default ${rule.default}`);
      } else {
        missing.push(`${rule.name} (${rule.description})`);
      }
    }
  }

  const storageMode = String(process.env.APP_STORAGE_MODE || 'mysql').trim().toLowerCase();
  if (storageMode && storageMode !== 'mysql') {
    missing.push('APP_STORAGE_MODE (this release only supports mysql)');
  }

  if (isProd) {
    if (!process.env.APP_CORS_ORIGIN) {
      missing.push('APP_CORS_ORIGIN (required in production)');
    }
    if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === 'admin_worldcup2026') {
      missing.push('ADMIN_PASSWORD (must not use the default production password)');
    }
    if (!process.env.APP_SECRET || process.env.APP_SECRET === 'worldcup2026_prod_secret_key_change_me') {
      missing.push('APP_SECRET (must not use the default production secret)');
    }
  }

  if (warnings.length > 0) {
    logger.warn('Environment warnings', { warnings });
  }

  if (missing.length > 0) {
    logger.error('Missing required environment variables', { missing });
    process.exit(1);
  }

  logger.info('Environment validation passed', {
    storageMode: 'mysql',
    databaseConfigured: Boolean(process.env.DATABASE_URL),
  });
}
