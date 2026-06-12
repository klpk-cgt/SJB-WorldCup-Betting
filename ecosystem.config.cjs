module.exports = {
  apps: [
    {
      name: 'worldcup',
      script: 'dist/server.cjs',
      env_production: {
        NODE_ENV: 'production',
      },
      // 从 .env.production 文件加载环境变量
      node_args: '--env-file=.env.production',
      max_memory_restart: '512M',
      instances: 1,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
};
