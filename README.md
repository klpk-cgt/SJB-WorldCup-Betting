# 2026 美加墨世界杯朋友群观赛竞猜站

一个专为朋友群设计的世界杯竞猜娱乐平台，支持赛事竞猜、AI 分析、实时赔率、排行榜和管理后台。

## 项目简介

这是一个全栈 Web 应用，为 2026 年美加墨世界杯打造的观赛竞猜平台。支持 48 支参赛球队的完整数据展示、实时比分追踪、AI 智能分析、多维度竞猜玩法和社交排行榜功能。

## 核心功能

### 1. 赛事竞猜系统
- **单场竞猜**：胜平负、准确比分、总进球数、晋级球队
- **长线竞猜**：冠军预测、金靴奖、金球奖
- **实时赔率**：基于 API-Football 和 The Odds API 的双数据源
- **竞猜卡片**：生成精美分享卡片，一键分享到群聊

### 2. AI 智能分析
- **多 AI 提供商路由**：DeepSeek / Mimo / Gemini 智能切换
- **赛前预测**：基于历史数据、球队状态、赔率变化的综合分析
- **赛后复盘**：比赛结果解读、竞猜回顾、经验总结
- **智能推荐**：根据用户偏好和风险承受能力推荐投注方案

### 3. 实时数据追踪
- **WebSocket 实时推送**：比分更新、竞猜结果即时通知
- **比赛状态机**：自动管理比赛生命周期（未开始 → 进行中 → 已结束 → 已结算）
- **自动结算**：比赛结束后自动计算竞猜结果和积分变动
- **赔率冻结**：比赛开始前自动冻结赔率，防止恶意投注

### 4. 社交排行榜
- **多维度排行**：总积分、胜率、连胜记录、活跃天数
- **AI 点评**：AI 对排行榜玩家进行趣味点评
- **成就徽章**：解锁各种成就徽章（预言家、常胜将军、欧皇等）
- **动态时间线**：实时展示群内竞猜动态和精彩时刻

### 5. 历史长廊
- **22 届世界杯数据**：完整的历史冠军年表、经典球队、传奇球星
- **世界纪录**：世界杯历史纪录和里程碑事件
- **球队详情**：48 支参赛球队的详细资料（阵容、历史战绩、关键球员）
- **对阵历史**：历史交锋记录和数据分析

### 6. 管理后台
- **用户管理**：创建/删除账号、分配登录码、设置 PIN
- **积分管理**：手动调账、充值、扣款
- **比赛管理**：手动同步赛程、强制结算、修改比分
- **数据备份**：一键备份数据库、导出 JSON 文件
- **系统监控**：实时查看系统状态、内存使用、API 调用统计

### 7. 其他特色功能
- **PWA 支持**：可安装为桌面应用，支持离线访问
- **签到系统**：每日签到获得积分奖励
- **道具卡系统**：使用翻倍卡、保险卡等道具增强竞猜体验
- **淘汰赛对阵图**：可视化展示晋级路径和实时比分
- **统计页面**：群聊投注热度分析、市场分布图表

## 技术栈

### 前端
- **React 19** + **TypeScript**：现代化前端框架
- **Vite**：极速开发构建工具
- **Tailwind CSS**：原子化 CSS 框架
- **Motion (Framer Motion)**：流畅动画效果
- **Recharts**：数据可视化图表
- **Socket.io Client**：WebSocket 实时通信
- **Lucide React**：现代化图标库

### 后端
- **Express** + **TypeScript**：企业级 Node.js 框架
- **tsx**：TypeScript 运行时，支持热重载
- **Prisma**：现代化 ORM，支持 MySQL/PostgreSQL
- **Socket.io**：实时双向通信
- **node-cron**：定时任务调度
- **CORS**：跨域资源共享支持

### AI 集成
- **DeepSeek API**：主力 AI 提供商，性价比高
- **Mimo API**：备用 AI 提供商，支持多模态
- **Gemini API**：Google AI，图像生成能力强
- **AI 路由策略**：自动故障转移、负载均衡

### 数据存储
- **JSON 文件数据库**：轻量级方案，适合小型部署（db.json）
- **MySQL 数据库**：生产环境推荐，支持 Prisma ORM
- **文件存储**：球员头像、分享卡片图片

### 部署方案
- **Docker Compose**：一键容器化部署
- **PM2**：Node.js 进程管理
- **Nginx**：反向代理、SSL 证书、静态资源缓存
- **宝塔面板**：可视化服务器管理

## 项目结构

```
SJB-WorldCup-Betting/
├── server.ts                    # Express 主服务器入口
├── package.json                 # 项目依赖和脚本
├── vite.config.ts              # Vite 构建配置
├── tsconfig.json               # TypeScript 配置
├── docker-compose.yml          # Docker 编排文件
├── Dockerfile                  # Docker 镜像构建
├── deploy.sh                   # 自动化部署脚本
├── DEPLOY.md                   # 部署指南文档
├── CHANGELOG.md                # 更新日志
│
├── prisma/
│   └── schema.prisma           # Prisma 数据库模型定义
│
├── src/
│   ├── App.tsx                 # React 根组件
│   ├── main.tsx                # React 入口文件
│   ├── index.css               # 全局样式
│   ├── types.ts                # TypeScript 类型定义
│   │
│   ├── components/             # React 组件
│   │   ├── HomeTab.tsx         # 首页（焦点战、最近赛程）
│   │   ├── MatchesTab.tsx      # 赛程列表
│   │   ├── MatchDetailPage.tsx # 比赛详情页
│   │   ├── PredictionTab.tsx   # 竞猜页
│   │   ├── LeaderboardTab.tsx  # 排行榜
│   │   ├── MeTab.tsx           # 个人中心
│   │   ├── AdminPanel.tsx      # 管理后台
│   │   ├── AdminDashboard.tsx  # 管理仪表盘
│   │   ├── HistoryHallPage.tsx # 历史长廊
│   │   ├── BracketPage.tsx     # 淘汰赛对阵图
│   │   ├── StatsPage.tsx       # 统计页面
│   │   ├── AIRecommendations.tsx # AI 推荐
│   │   ├── SearchBar.tsx       # 搜索栏
│   │   ├── ActivityFeed.tsx    # 动态时间线
│   │   ├── GroupStandings.tsx  # 小组积分榜
│   │   ├── TeamDetailDrawer.tsx # 球队详情抽屉
│   │   ├── ErrorBoundary.tsx   # 错误边界
│   │   ├── ToastProvider.tsx   # Toast 提示
│   │   └── home/               # 首页子组件
│   │       ├── FocusMatchCard.tsx  # 焦点战卡片
│   │       ├── TeamPanel.tsx       # 球队面板
│   │       ├── FlagBadge.tsx       # 国旗徽章
│   │       └── focusMatch.ts       # 焦点战逻辑
│   │
│   ├── data/                   # 静态数据
│   │   ├── historyHall.ts      # 世界杯历史数据
│   │   ├── squads.ts           # 球队阵容数据
│   │   ├── playerAvatars.ts    # 球员头像映射
│   │   └── worldcup/
│   │       ├── teams/          # 48 支球队数据
│   │       │   ├── argentina.ts
│   │       │   ├── brazil.ts
│   │       │   ├── france.ts
│   │       │   └── ... (48 个球队文件)
│   │       └── headToHead/     # 对阵历史数据
│   │
│   ├── db/                     # 数据层
│   │   ├── db_service.ts       # 数据库服务（JSON/MySQL 双模式）
│   │   ├── initial_data.ts     # 初始化数据
│   │   └── team_details_seed.ts # 球队详情种子数据
│   │
│   ├── server/                 # 服务端逻辑
│   │   ├── config.ts           # 配置管理
│   │   ├── helpers.ts          # 辅助函数
│   │   ├── logger.ts           # 日志系统
│   │   ├── middleware.ts       # 中间件
│   │   ├── env_validator.ts    # 环境变量校验
│   │   ├── backup.ts           # 数据备份
│   │   ├── scheduler.ts        # 定时任务
│   │   ├── sync.ts             # 数据同步
│   │   ├── websocket.ts        # WebSocket 服务
│   │   ├── ai.ts               # AI 服务（多提供商路由）
│   │   ├── activity_service.ts # 动态服务
│   │   ├── badge_service.ts    # 徽章服务
│   │   ├── prediction_card_service.ts # 竞猜卡片服务
│   │   └── routes/             # API 路由
│   │       ├── auth.ts         # 认证路由
│   │       ├── users.ts        # 用户路由
│   │       ├── matches.ts      # 比赛路由
│   │       ├── teams.ts        # 球队路由
│   │       ├── checkin.ts      # 签到路由
│   │       ├── ai.ts           # AI 路由
│   │       ├── admin.ts        # 管理路由
│   │       ├── activities.ts   # 动态路由
│   │       ├── cards.ts        # 卡片路由
│   │       └── admin_dashboard.ts # 管理仪表盘路由
│   │
│   ├── hooks/                  # React Hooks
│   │   └── useWebSocket.ts     # WebSocket Hook
│   │
│   ├── utils/                  # 工具函数
│   │   ├── api.ts              # API 请求封装
│   │   ├── flags.ts            # 国旗映射
│   │   ├── odds.ts             # 赔率计算
│   │   ├── achievements.ts     # 成就系统
│   │   ├── playerAvatar.ts     # 球员头像工具
│   │   └── matchDisplay.ts     # 比赛显示工具
│   │
│   └── types/                  # TypeScript 类型
│       └── worldcup.ts         # 世界杯相关类型
│
├── public/                     # 静态资源
│   ├── manifest.json           # PWA 清单
│   ├── sw.js                   # Service Worker
│   └── player-avatars/         # 球员头像图片
│
├── scripts/                    # 脚本工具
│   ├── backup-db-json.ts       # 数据库备份脚本
│   ├── db-storage.mjs          # 存储模式切换
│   ├── import-db-json-to-mysql.mjs # JSON 导入 MySQL
│   ├── verify-mysql-import.mjs # 验证导入结果
│   ├── production-diagnostics.mjs # 生产环境诊断
│   └── baota-mysql-migrate.sh  # 宝塔迁移脚本
│
├── deploy/                     # 部署配置
│   └── nginx/
│       ├── default.conf.template        # Nginx 配置模板
│       └── default-ssl.conf.example     # SSL 配置示例
│
└── db.json                     # JSON 数据库文件（自动生成）
```

## 快速开始

### 环境要求
- Node.js 20+ 
- npm 或 yarn
- MySQL 8.0+（生产环境推荐）

### 开发模式

```bash
# 1. 克隆项目
git clone https://github.com/klpk-cgt/SJB-WorldCup-Betting.git
cd SJB-WorldCup-Betting

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填写必要的 API Key

# 4. 初始化数据库（MySQL）
npm run prisma:generate
npm run db:push:mysql

# 5. 启动开发服务器
npm run dev
```

访问 http://localhost:3000 查看应用

### 生产构建

```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## 环境变量配置

复制 `.env.example` 为 `.env`，配置以下变量：

### 基础配置
```bash
NODE_ENV=production          # 运行环境
PORT=3000                    # 服务端口
APP_URL=https://yourdomain.com
APP_STORAGE_MODE=mysql       # 存储模式：json 或 mysql
DATABASE_URL=mysql://user:password@localhost:3306/worldcup
```

### 数据源配置
```bash
# API-Football（赛程数据）
API_FOOTBALL_KEY=your_api_key

# The Odds API（实时赔率）
THE_ODDS_API_KEY=your_api_key
```

### AI 提供商配置
```bash
# DeepSeek（主力）
DEEPSEEK_API_KEY=your_api_key
DEEPSEEK_MODEL=deepseek-chat

# Gemini（备用）
GEMINI_API_KEY=your_api_key
GEMINI_TEXT_MODEL=gemini-2.5-flash
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image-preview

# Mimo（备用）
MIMO_API_KEY=your_api_key
MIMO_BASE_URL=https://api.xiaomimimo.com/v1
MIMO_DEFAULT_MODEL=mimo-v2.5-pro
```

### 管理员配置
```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
ADMIN_SESSION_TTL_MS=43200000  # 12 小时
```

## 部署指南

### 方案一：Docker Compose（推荐）

```bash
# 1. 配置环境变量
cp .env.production.example .env.production
nano .env.production

# 2. 启动服务
docker-compose up -d

# 3. 查看日志
docker-compose logs -f app
```

### 方案二：PM2 部署

```bash
# 1. 安装 PM2
npm install -g pm2

# 2. 构建项目
npm run build

# 3. 启动服务
pm2 start dist/server.cjs --name worldcup

# 4. 设置开机自启
pm2 startup
pm2 save
```

### 方案三：宝塔面板部署

详见 [DEPLOY.md](./DEPLOY.md)

## API 文档

### 认证相关
- `POST /api/auth/login` - 用户登录
- `POST /api/admin/login` - 管理员登录
- `GET /api/me` - 获取当前用户信息

### 比赛相关
- `GET /api/matches` - 获取比赛列表
- `GET /api/matches/:id` - 获取比赛详情
- `POST /api/admin/matches/sync` - 同步比赛数据

### 竞猜相关
- `POST /api/predictions` - 创建竞猜
- `GET /api/predictions` - 获取竞猜记录
- `POST /api/predictions/:id/cancel` - 取消竞猜

### 排行榜
- `GET /api/leaderboard` - 获取排行榜
- `GET /api/activities` - 获取动态时间线

### AI 功能
- `POST /api/ai/predict` - AI 比赛预测
- `POST /api/ai/review` - AI 赛后复盘
- `POST /api/ai/recommend` - AI 推荐方案

## 数据库迁移

### JSON 迁移到 MySQL

```bash
# 1. 备份当前 JSON 数据
npm run db:backup

# 2. 导入到 MySQL
npm run db:import:mysql

# 3. 验证导入结果
npm run db:verify:mysql

# 4. 切换到 MySQL 模式
# 修改 .env: APP_STORAGE_MODE=mysql
```

## 更新日志

详见 [CHANGELOG.md](./CHANGELOG.md)

## 常见问题

### Q: 如何修改管理员密码？
A: 修改 `.env` 中的 `ADMIN_PASSWORD`，重启服务即可。

### Q: 赔率数据不更新？
A: 检查 `THE_ODDS_API_KEY` 是否正确配置，系统每 5 分钟自动同步一次。

### Q: AI 分析功能不可用？
A: 确保至少配置了一个 AI 提供商的 API Key，系统会自动故障转移。

### Q: 如何备份数据？
A: 
- JSON 模式：直接备份 `db.json` 文件
- MySQL 模式：使用 `mysqldump` 或管理后台的导出功能

## 许可证

Apache-2.0

## 贡献者

- klpk-cgt

## 联系方式

如有问题或建议，请提交 Issue 或 Pull Request。
