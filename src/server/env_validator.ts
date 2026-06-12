/**
 * 环境变量启动校验
 * 确保生产环境必需的变量已配置
 */
import logger from './logger';

interface EnvRule {
  name: string;
  required: boolean;
  description: string;
  default?: string;
}

const ENV_RULES: EnvRule[] = [
  { name: 'PORT', required: false, description: '服务端口', default: '3000' },
  { name: 'APP_SECRET', required: true, description: '应用密钥（用于JWT签名等）' },
  { name: 'ADMIN_PASSWORD', required: false, description: '管理员密码', default: 'admin_worldcup2026' },
  { name: 'DATABASE_URL', required: false, description: 'MySQL连接字符串（JSON模式可选）' },
  { name: 'APP_STORAGE_MODE', required: false, description: '存储模式(json/mysql)', default: 'json' },
  { name: 'APP_CORS_ORIGIN', required: false, description: 'CORS允许的域名' },
];

export function validateEnv(): void {
  const isProd = process.env.NODE_ENV === 'production';
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const rule of ENV_RULES) {
    const value = process.env[rule.name];

    if (!value && rule.required) {
      if (rule.default) {
        warnings.push(`${rule.name} 未设置，使用默认值: ${rule.default}`);
      } else {
        missing.push(`${rule.name} (${rule.description})`);
      }
    }
  }

  // 生产环境额外检查
  if (isProd) {
    if (!process.env.APP_CORS_ORIGIN) {
      warnings.push('生产环境建议设置 APP_CORS_ORIGIN 限制跨域来源');
    }
    if (process.env.ADMIN_PASSWORD === 'admin_worldcup2026') {
      warnings.push('生产环境请修改默认管理员密码 (ADMIN_PASSWORD)');
    }
    if (process.env.APP_SECRET === 'worldcup2026_prod_secret_key_change_me' || !process.env.APP_SECRET) {
      warnings.push('生产环境请修改默认 APP_SECRET');
    }
  }

  // 输出警告
  if (warnings.length > 0) {
    logger.warn('Environment warnings:', { warnings });
  }

  // 缺失必需变量时直接退出
  if (missing.length > 0) {
    logger.error('Missing required environment variables:', { missing });
    process.exit(1);
  }

  logger.info('Environment validation passed');
}
