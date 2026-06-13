# 2026 世界杯竞猜平台 - 补充说明文档

> 版本：v2.1.0 | 更新日期：2026-06-13

## 一、项目概述

本项目是一个专为朋友群设计的 **2026 美加墨世界杯观赛竞猜平台**，采用全栈架构（React + Express + Prisma），支持 48 支参赛球队的完整数据展示、实时比分追踪、AI 智能分析、多维度竞猜玩法和社交排行榜功能。

## 二、系统架构

```
┌─────────────────────────────────────────────────┐
│                   前端 (React 19)                │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  │ 首页 │ │ 赛程 │ │ 竞猜 │ │ 排行 │ │ 管理 │  │
│  └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘  │
│     └────────┴────────┴────────┴────────┘       │
│              Socket.io Client + Fetch            │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────┐
│              后端 (Express + TypeScript)          │
│  ┌─────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  Routes  │→│ Services  │→│  DB Service    │  │
│  │ (API层)  │  │ (业务层)  │  │ (数据访问层)   │  │
│  └─────────┘  └──────────┘  └───────────────┘  │
│       ↑              ↑                           │
│  ┌────┴────┐   ┌─────┴──────┐                   │
│  │ AI 路由  │   │ 定时调度器  │                   │
│  └─────────┘   └────────────┘                   │
└──────────────────────┬──────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
    ┌────┴────┐               ┌─────┴─────┐
    │  MySQL  │               │ JSON 文件  │
    │ (生产)   │               │ (开发/轻量) │
    └─────────┘               └───────────┘
```

## 三、核心模块说明

### 3.1 前端模块

| 模块 | 文件 | 说明 |
|------|------|------|
| 首页 | `HomeTab.tsx` | 焦点战卡片 + AI 预测卡片 + 最近赛程 |
| 赛程 | `MatchesTab.tsx` | 比赛列表，支持筛选和搜索 |
| 竞猜 | `PredictionTab.tsx` | 单场竞猜 + 长线竞猜 |
| 排行榜 | `LeaderboardTab.tsx` | 多维度排行 + AI 点评 |
| 个人中心 | `MeTab.tsx` | 钱包、竞猜记录、成就 |
| 管理后台 | `AdminPanel.tsx` | 用户/积分/比赛管理 |
| 历史长廊 | `HistoryHallPage.tsx` | 22 届世界杯历史数据 |
| 淘汰赛 | `BracketPage.tsx` | 对阵图 + 晋级路径 |
| 观赛攻略 | `WatchGuidePage.tsx` | 小组分析 + 必看比赛 + 新军首秀 |
| 统计 | `StatsPage.tsx` | 投注热度 + 市场分布 |

### 3.2 后端服务层

v2.1.0 重构后的服务层架构：

```
src/server/services/
├── transaction_guard.ts          # 事务包装器（保证原子性）
├── wallet_service.ts             # 钱包服务（余额变动唯一入口）
├── prediction_service.ts         # 下注服务
├── settlement_service.ts         # 结算服务
├── card_transaction_service.ts   # 卡牌交易服务
├── quiz_service.ts               # 每日问答服务
├── sync_scheduler_service.ts     # 动态同步调度
└── post_match_report_service.ts  # 赛后战报服务
```

**关键设计原则**：
- **钱包服务统一入口**：所有余额变动必须通过 `wallet_service.ts`，禁止直接修改 `wallet.balance`
- **事务保护**：涉及钱包、竞猜、卡牌的操作必须通过 `transaction_guard.ts` 的 `runBusinessTransaction` 执行
- **动态同步调度**：根据比赛阶段自动调整同步频率（LOW → NORMAL → HIGH → LIVE）

### 3.3 AI 集成

| 提供商 | 用途 | 模型 |
|--------|------|------|
| DeepSeek | 主力 AI（赛前预测、赛后复盘） | deepseek-chat |
| Gemini | 备用 AI + 图像生成 | gemini-2.5-flash |
| Mimo | 备用 AI | mimo-v2.5-pro |
| 第三方 API | 首页 AI 预测卡片数据源 | worldcup-2026-sigma API |

AI 路由策略：DeepSeek → Mimo → Gemini，自动故障转移。

### 3.4 数据存储

支持双模式切换（通过 `APP_STORAGE_MODE` 环境变量）：

- **JSON 模式**：轻量级，适合开发和小型部署，数据存储在 `db.json`
- **MySQL 模式**：生产环境推荐，通过 Prisma ORM 访问，支持 `utf8mb4` 字符集

## 四、API 接口一览

### 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/admin/login` | 管理员登录 |
| GET | `/api/me` | 获取当前用户信息 |

### 比赛
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/matches` | 获取比赛列表 |
| GET | `/api/matches/:id` | 获取比赛详情 |
| POST | `/api/admin/matches/sync` | 同步比赛数据 |

### 竞猜
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/predictions` | 创建竞猜 |
| GET | `/api/predictions` | 获取竞猜记录 |
| POST | `/api/predictions/:id/cancel` | 取消竞猜 |

### 首页
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/home/ai-prediction-card` | 获取 AI 预测卡片数据 |

### AI
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/ai/predict` | AI 比赛预测 |
| POST | `/api/ai/review` | AI 赛后复盘 |
| POST | `/api/ai/recommend` | AI 推荐方案 |

### 管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/dashboard` | 管理仪表盘数据 |
| POST | `/api/admin/users` | 创建用户 |
| DELETE | `/api/admin/users/:id` | 删除用户 |
| POST | `/api/admin/adjust-balance` | 积分调账 |

## 五、环境变量配置

### 必需配置
```bash
NODE_ENV=production
PORT=3000
APP_STORAGE_MODE=mysql              # json 或 mysql
DATABASE_URL=mysql://user:pass@localhost:3306/worldcup
```

### 数据源
```bash
API_FOOTBALL_KEY=your_key           # 赛程数据
THE_ODDS_API_KEY=your_key           # 实时赔率
```

### AI 提供商（至少配置一个）
```bash
DEEPSEEK_API_KEY=your_key           # 主力 AI
GEMINI_API_KEY=your_key             # 备用 AI
MIMO_API_KEY=your_key               # 备用 AI
```

### 管理员
```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
ADMIN_SESSION_TTL_MS=43200000       # 12 小时
```

## 六、部署方案

### Docker Compose（推荐）
```bash
cp .env.production.example .env.production
# 编辑 .env.production
docker-compose up -d
```

### PM2
```bash
npm run build
pm2 start dist/server.cjs --name worldcup
pm2 startup && pm2 save
```

### 宝塔面板
详见 [DEPLOY.md](./DEPLOY.md)

## 七、数据库迁移

### JSON → MySQL
```bash
npm run db:backup                    # 备份 JSON 数据
npm run db:import:mysql              # 导入到 MySQL
npm run db:verify:mysql              # 验证导入结果
# 修改 .env: APP_STORAGE_MODE=mysql  # 切换模式
```

## 八、开发指南

### 本地开发
```bash
npm install
cp .env.example .env                # 配置环境变量
npm run prisma:generate             # 生成 Prisma 客户端
npm run db:push:mysql               # 推送数据库结构
npm run dev                          # 启动开发服务器
```

### 项目结构约定
- **路由层** (`src/server/routes/`)：只处理 HTTP 请求/响应，不包含业务逻辑
- **服务层** (`src/server/services/`)：封装业务逻辑，保证事务一致性
- **数据层** (`src/db/`)：数据库访问，支持 JSON/MySQL 双模式
- **组件层** (`src/components/`)：React UI 组件
- **数据层** (`src/data/`)：静态数据文件

### 添加新功能流程
1. 在 `src/types.ts` 定义类型
2. 在 `src/server/services/` 创建服务
3. 在 `src/server/routes/` 创建路由
4. 在 `src/components/` 创建 UI 组件
5. 在 `src/App.tsx` 注册路由

## 九、常见问题

**Q: 如何修改管理员密码？**
A: 修改 `.env` 中的 `ADMIN_PASSWORD`，重启服务。

**Q: 赔率数据不更新？**
A: 检查 `THE_ODDS_API_KEY` 配置，系统每 5 分钟自动同步。

**Q: AI 分析不可用？**
A: 确保至少配置一个 AI 提供商的 API Key，系统自动故障转移。

**Q: 如何备份数据？**
A: JSON 模式直接备份 `db.json`；MySQL 模式使用 `mysqldump` 或管理后台导出。

**Q: 首页 AI 预测卡片数据从哪来？**
A: 来自第三方预测 API（`worldcup-2026-sigma`），3 小时缓存一次，不消耗 DeepSeek 额度。

## 十、版本历史

| 版本 | 日期 | 主要变更 |
|------|------|----------|
| v2.1.0 | 2026-06-13 | AI 预测卡片、观赛攻略、服务层重构、GSAP 动画 |
| v2.0.0 | 2026-06-07 | 管理后台升级、首字母登录、历史长廊扩充 |
| v1.0.0 | 2026-05-xx | 初始版本，基础竞猜功能 |

## 许可证

Apache-2.0
