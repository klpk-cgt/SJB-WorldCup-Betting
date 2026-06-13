module.exports = {
  apps: [
    {
      name: 'worldcup',
      script: 'dist/server.cjs',
      env_production: {
        NODE_ENV: 'production',
      },
      // 从 .env 文件加载环境变量（统一使用 .env）
      node_args: '--env-file=.env',
      max_memory_restart: '512M',
      instances: 1,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
};
