# 2026 世界杯竞猜局 - 项目信息文档

## 一、项目概览

| 项目 | 信息 |
|------|------|
| 项目名称 | 2026 美加墨世界杯朋友群观赛竞猜站 |
| 项目类型 | 全栈 Web 应用（SSR + SPA） |
| 核心功能 | 世界杯赛事竞猜、AI 分析、实时赔率、排行榜、管理后台 |
| 源文件数 | 40 个（src/ 目录下 .tsx/.ts/.css） |
| 总代码行数 | ~25,464 行（src/） + 2,130 行（server.ts） |
| API 路由数 | 60 个 |

---

## 二、技术栈

### 前端
| 技术 | 版本 | 用途 |
|------|------|------|
| React | ^19.0.1 | UI 框架 |
| TypeScript | ~5.8.2 | 类型安全 |
| Vite | ^6.2.3 | 构建工具 + 开发服务器 |
| Tailwind CSS | ^4.1.14 | 原子化 CSS |
| Motion (Framer Motion) | ^12.23.24 | 动画库 |
| Lucide React | ^0.546.0 | 图标库 |
| Recharts | ^3.8.1 | 图表库 |

### 后端
| 技术 | 版本 | 用途 |
|------|------|------|
| Express | ^4.21.2 | HTTP 服务器 |
| tsx | ^4.21.0 | TypeScript 执行器 |
| esbuild | ^0.25.0 | 生产构建打包 |
| dotenv | ^17.2.3 | 环境变量 |
| @google/genai | ^2.4.0 | Gemini AI SDK |

### AI 提供商
| 提供商 | 模型 | 用途 |
|--------|------|------|
| DeepSeek | deepseek-chat / deepseek-v4-pro | 主要 AI 分析 |
| Mimo | mimo-v2.5-pro / mimo-v2.5 / mimo-v2-flash | 多模态 + 联网搜索 |
| Gemini | gemini-2.5-flash / gemini-2.5-flash-image-preview | 备用 AI + 图像 |

### 外部数据源
| 服务 | 用途 |
|------|------|
| API-Football | 赛程/比分/阵容同步 |
| The Odds API | 实时赔率同步 |

---

## 三、项目目录结构

```
klpk-cgt-s-Org v2/
├── server.ts                    # Express 主服务器（2130行，60个API路由）
├── vite.config.ts               # Vite 配置（代理 /api → localhost:3000）
├── tsconfig.json                # TypeScript 配置
├── package.json                 # 依赖管理
├── index.html                   # SPA 入口 HTML
├── .env.example                 # 环境变量模板
├── .gitignore
├── public/
│   ├── manifest.json            # PWA 配置
│   ├── sw.js                    # Service Worker
│   ├── stadium-bg.svg           # 球场背景
│   └── player-avatars/          # 56 个球员头像（7国 × 8人）
├── src/
│   ├── main.tsx                 # React 入口
│   ├── App.tsx                  # 根组件（路由 + 登录 + 导航）
│   ├── types.ts                 # 全局类型定义（499行）
│   ├── index.css                # 全局样式 + Tailwind
│   ├── vite-env.d.ts
│   ├── components/              # UI 组件（19个文件）
│   │   ├── home/                # 首页子组件
│   │   │   ├── FlagBadge.tsx    # 国旗徽章
│   │   │   ├── FocusMatchCard.tsx # 焦点战卡片
│   │   │   ├── TeamPanel.tsx    # 球队面板
│   │   │   └── focusMatch.ts    # 焦点战数据模型
│   │   ├── AdminPanel.tsx       # 管理后台面板
│   │   ├── BracketBoard.tsx     # 淘汰赛对阵图
│   │   ├── BracketPage.tsx      # 淘汰赛页面
│   │   ├── GroupStandings.tsx   # 小组积分榜
│   │   ├── HistoryHallPage.tsx  # 历史长廊
│   │   ├── HomeTab.tsx          # 首页 Tab
│   │   ├── LeaderboardTab.tsx   # 排行榜 Tab
│   │   ├── MatchDetailPage.tsx  # 比赛详情页
│   │   ├── MatchesTab.tsx       # 赛程 Tab
│   │   ├── MeTab.tsx            # 个人中心 Tab
│   │   ├── PredictionTab.tsx    # 竞猜 Tab
│   │   ├── SmartAvatar.tsx      # 智能头像组件
│   │   ├── StatsPage.tsx        # 统计页
│   │   ├── TeamDetailDrawer.tsx # 球队详情抽屉
│   │   └── ToastProvider.tsx    # Toast 通知系统
│   ├── data/                    # 静态数据
│   │   ├── historyHall.ts       # 历史长廊数据
│   │   ├── playerAvatars.ts     # 球员头像映射
│   │   └── squads.ts            # 球队阵容 + 元数据
│   ├── db/                      # 数据层
│   │   ├── db_service.ts        # JSON 文件数据库服务（431行）
│   │   ├── initial_data.ts      # 种子数据
│   │   └── team_details_seed.ts # 球队详情种子
│   ├── server/                  # 服务端逻辑
│   │   ├── ai.ts                # AI 内容生成（1260行+）
│   │   ├── config.ts            # 运行时配置（85行）
│   │   ├── operations.ts        # 比赛生命周期管理（74行）
│   │   └── sync.ts              # 外部数据同步（382行）
│   └── utils/                   # 工具函数
│       ├── achievements.ts      # 成就系统（141行）
│       ├── api.ts               # API 请求封装（64行）
│       ├── flags.ts             # 国旗映射
│       ├── matchDisplay.ts      # 比赛展示工具
│       ├── odds.ts              # 赔率计算
│       └── playerAvatar.ts      # 球员头像解析
```

---

## 四、API 路由清单

### 公开路由
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/rooms | 获取房间列表 |
| GET | /api/me | 当前用户信息 |
| GET | /api/me/profile-summary | 用户成就摘要 |
| GET | /api/checkin/status | 签到状态 |
| POST | /api/checkin | 签到 |
| GET | /api/quiz/status | 问答状态 |
| GET | /api/quiz/daily | 每日问答 |
| POST | /api/quiz/answer | 回答问答 |
| POST | /api/auth/login | 用户登录 |
| POST | /api/auth/claim | 认领账号 |
| GET | /api/teams | 球队列表 |
| GET | /api/teams/:id | 球队详情 |
| GET | /api/teams/:id/players | 球队球员 |
| GET | /api/teams/:id/history | 球队历史 |
| GET | /api/teams/:id/detail | 球队扩展详情 |
| GET | /api/matches | 比赛列表 |
| GET | /api/matches/today | 今日比赛 |
| GET | /api/matches/:id | 比赛详情 |
| GET | /api/bracket | 淘汰赛对阵图 |
| GET | /api/matches/:id/friend-picks | 好友投注分布 |
| GET | /api/predictions/snapshot/:matchId | 竞猜快照 |
| GET | /api/predictions/me | 我的竞猜 |
| POST | /api/predictions | 下注竞猜 |
| GET | /api/tournament-bets | 长线竞猜市场 |
| POST | /api/tournament-bets/champion | 冠军竞猜 |
| POST | /api/tournament-bets/golden-boot | 金靴竞猜 |
| POST | /api/tournament-bets/golden-ball | 金球竞猜 |
| GET | /api/leaderboards | 排行榜 |
| GET | /api/stats/summary | 统计摘要 |
| GET | /api/ai/match/:id/prediction | AI 预测 |
| GET | /api/ai/match/:id/analysis | AI 分析 |
| GET | /api/ai/leaderboard/:roomId | AI 榜单点评 |
| GET | /api/ai/daily | AI 每日推荐 |
| GET | /api/ai/match/:id | AI 内容 |
| POST | /api/ai/generate | 生成 AI 内容 |
| POST | /api/ai/match/:id/preview | AI 赛前速览 |
| POST | /api/ai/share/bet | 竞猜分享卡 |
| GET | /api/me/transactions | 交易记录 |
| GET | /api/users/:userId/trend | 用户趋势 |

### 管理路由（需 Admin Token）
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/admin/login | 管理员登录 |
| GET | /api/admin/dashboard | 管理面板数据 |
| GET | /api/admin/integrations/status | 集成状态 |
| POST | /api/admin/integrations/test-sync | 测试同步 |
| GET | /api/admin/users | 用户列表 |
| POST | /api/admin/users/bulk | 批量创建用户 |
| PUT | /api/admin/users/:id | 编辑用户 |
| POST | /api/admin/users/:id/adjust-points | 调整积分 |
| PUT | /api/admin/matches/:id | 编辑比赛 |
| PUT | /api/admin/matches/:id/odds | 编辑赔率 |
| POST | /api/admin/matches/:id/settle | 结算比赛 |
| POST | /api/admin/sync/fixtures | 同步赛程 |
| POST | /api/admin/sync/today | 同步今日数据 |
| POST | /api/admin/sync/matches/:id | 同步单场比赛 |
| POST | /api/admin/ai/match/:id/pre | AI 预生成 |
| POST | /api/admin/ai/match/:id/regenerate | AI 重新生成 |
| POST | /api/admin/ai/match/:id/enhance-search | AI 搜索增强 |
| POST | /api/admin/ai/match/:id/enhance-multimodal | AI 多模态增强 |
| POST | /api/admin/ai/leaderboard/:roomId/regenerate | AI 榜单重生成 |
| GET | /api/admin/sync-logs | 同步日志 |

---

## 五、核心业务模块

| 模块 | 说明 |
|------|------|
| 用户系统 | 登录码 + PIN 认证，管理员分配账号，状态管理（UNCLAIMED/CLAIMED/LOCKED/DISABLED） |
| 钱包系统 | 娱乐积分余额，交易记录，管理员调整 |
| 竞猜系统 | 单场竞猜（胜平负/比分/总进球/晋级），长线竞猜（冠军/金靴/金球） |
| 赔率系统 | API 实时赔率 + 手动赔率 + FIFA 排名推导默认赔率 |
| 结算系统 | 自动结算（比赛结束后），支持重结（先回滚再重算） |
| AI 系统 | 多提供商路由（DeepSeek → Mimo → Gemini → Local Fallback），缓存 + 过期 + 强制刷新 |
| 同步系统 | API-Football 赛程同步，The Odds API 赔率同步，带重试和日志 |
| 成就系统 | 6 枚成就徽章 + 6 种玩家称号 |
| 排行榜 | 多维度排行（总资产/今日/命中率/连中/盈利），AI 点评 |
| 淘汰赛对阵图 | 自动从比赛数据生成 Bracket，支持占位符 |

---

## 六、待优化问题清单

### 严重（高优先级）

| # | 问题 | 位置 | 说明 |
|---|------|------|------|
| 1 | **server.ts 巨型文件** | server.ts (2130行) | 所有 60 个 API 路由、业务逻辑、中间件集中在一个文件，极难维护。应拆分为路由模块（如 `routes/auth.ts`、`routes/predictions.ts`、`routes/admin.ts` 等） |
| 2 | **JSON 文件数据库无并发保护** | db_service.ts | 使用 `fs.writeFileSync` 同步写 JSON 文件，多请求并发时存在数据丢失风险。建议加文件锁或迁移到 SQLite |
| 3 | **PIN 明文存储** | db_service.ts:88 | 注释写 "store simple text for demo"，但 `pinHash` 字段实际存储明文 PIN，存在安全隐患 |
| 4 | **Admin 密码硬编码默认值** | config.ts:63 | `ADMIN_PASSWORD` 默认值为 `admin_worldcup2026`，虽然可通过环境变量覆盖，但默认值过于简单 |
| 5 | **无输入验证/参数校验** | server.ts 全局 | API 路由直接从 `req.body` 取值，无 schema 验证（如 zod/joi），恶意输入可能导致异常 |

### 重要（中优先级）

| # | 问题 | 位置 | 说明 |
|---|------|------|------|
| 6 | **前端 `any` 类型泛滥** | App.tsx, HomeTab.tsx, PredictionTab.tsx 等 | `user: any`、`wallet: any` 等多处使用 any，丧失类型安全。应替换为具体类型 |
| 7 | **无错误边界（Error Boundary）** | App.tsx | React 组件无 Error Boundary 包裹，任何子组件渲染异常会导致整个应用白屏 |
| 8 | **AI 模块缓存策略复杂** | ai.ts (1260行+) | 缓存键构建、版本计算、刷新窗口逻辑交织，缺少清晰的缓存策略文档和单元测试 |
| 9 | **无 API 限流（Rate Limiting）** | server.ts | 所有 API 无请求频率限制，竞猜下注、AI 生成等接口易被滥用 |
| 10 | **前端无状态管理库** | App.tsx | 用户/钱包状态通过 props 逐层传递（prop drilling），组件层级深时维护困难。建议引入 Context 或 Zustand |
| 11 | **Service Worker 未实现离线缓存** | public/sw.js | PWA manifest 已配置但 sw.js 内容未查看，需确认离线缓存策略是否完善 |
| 12 | **缺少 CORS 配置** | server.ts | Express 未配置 CORS，当前通过 Vite 代理绕过，但生产部署时需显式配置 |

### 一般（低优先级）

| # | 问题 | 位置 | 说明 |
|---|------|------|------|
| 13 | **PWA 图标缺失** | public/ | manifest.json 引用 `pwa-192.png` 和 `pwa-512.png`，但 public/ 目录下未见这些文件 |
| 14 | **Google Fonts 外部依赖** | index.css:1 | 直接从 Google Fonts CDN 加载字体，国内用户可能加载缓慢或失败。建议本地化字体文件 |
| 15 | **无单元测试/集成测试** | 项目全局 | 项目没有任何测试文件，核心结算逻辑、赔率计算、AI 输出解析等应有测试覆盖 |
| 16 | **`remove_api_key.js` 残留脚本** | 项目根目录 | 清理 API Key 的辅助脚本，不应保留在正式项目中 |
| 17 | **`.git-rewrite/` 目录** | 项目根目录 | Git 重写历史残留目录，应清理 |
| 18 | **中文文档散落** | 项目根目录 | `焦点对战UI参考补充.md`、`补充优化v4.md`、`第二版补充.txt` 等开发过程文档散落在根目录 |
| 19 | **无日志系统** | server.ts | 仅使用 `console.log/error`，无结构化日志。生产环境应引入 winston/pino |
| 20 | **定时同步逻辑在主进程** | server.ts | `runScheduledMaintenance` 在 Express 主进程中运行，可能阻塞请求处理。建议用 Worker 或独立进程 |
| 21 | **db.json 未版本化但可能很大** | .gitignore | 数据库文件已加入 .gitignore，但无备份策略。生产环境需定期备份 |
| 22 | **缺少请求超时配置** | server.ts | AI 调用等外部请求无超时设置，可能导致请求挂起 |
| 23 | **前端组件文件过大** | HomeTab.tsx, AdminPanel.tsx 等 | 部分组件文件行数过多，应进一步拆分为子组件 |
| 24 | **TypeScript 严格模式未启用** | tsconfig.json | 缺少 `strict: true`，未启用严格类型检查（如 `noImplicitAny`、`strictNullChecks`） |

---

## 七、环境变量清单

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| API_FOOTBALL_KEY | 否 | 空 | API-Football 赛程数据 Key |
| THE_ODDS_API_KEY | 否 | 空 | The Odds API 赔率 Key |
| DEEPSEEK_API_KEY | 否 | 空 | DeepSeek AI Key |
| GEMINI_API_KEY | 否 | 空 | Gemini AI Key |
| MIMO_API_KEY | 否 | 空 | Mimo AI Key |
| MIMO_BASE_URL | 否 | https://api.xiaomimimo.com/v1 | Mimo API 地址 |
| MIMO_DEFAULT_MODEL | 否 | mimo-v2.5-pro | Mimo 默认模型 |
| MIMO_MULTIMODAL_MODEL | 否 | mimo-v2.5 | Mimo 多模态模型 |
| MIMO_FAST_MODEL | 否 | mimo-v2-flash | Mimo 快速模型 |
| DEEPSEEK_MODEL | 否 | deepseek-v4-pro | DeepSeek 模型 |
| GEMINI_TEXT_MODEL | 否 | gemini-2.5-flash | Gemini 文本模型 |
| GEMINI_IMAGE_MODEL | 否 | gemini-2.5-flash-image-preview | Gemini 图像模型 |
| AI_PRIMARY_PROVIDER | 否 | deepseek | AI 主提供商 |
| AI_FALLBACK_PROVIDER | 否 | mimo | AI 备用提供商 |
| AI_ENABLE_WEB_SEARCH | 否 | true | AI 联网搜索 |
| AI_ENABLE_MULTIMODAL | 否 | true | AI 多模态 |
| ADMIN_USERNAME | 否 | admin | 管理员用户名 |
| ADMIN_PASSWORD | 否 | admin_worldcup2026 | 管理员密码 |
| ADMIN_SESSION_TTL_MS | 否 | 43200000 (12h) | 管理员会话有效期 |
| PREDICTION_LOCK_MINUTES | 否 | 5 | 开赛前锁定分钟数 |
| SYNC_INTERVAL_MINUTES | 否 | 5 | 定时同步间隔 |
| PORT | 否 | 3000 | 服务端口 |
| DISABLE_HMR | 否 | false | 禁用 HMR（agent 编辑时用） |

---

## 八、数据库 Schema（db.json）

| 集合 | 类型 | 说明 |
|------|------|------|
| rooms | GroupRoom[] | 群聊房间 |
| users | User[] | 用户 |
| wallets | Wallet[] | 钱包 |
| transactions | Transaction[] | 交易记录 |
| teams | Team[] | 球队 |
| matches | Match[] | 比赛 |
| matchOdds | Record<string, MatchOdds> | 赔率（按 matchId 索引） |
| predictions | Prediction[] | 竞猜记录 |
| tournamentBets | TournamentBet[] | 长线竞猜 |
| aiContents | AIContent[] | AI 生成内容 |
| shareCards | ShareCardRecord[] | 分享卡记录 |
| bracketState | BracketState | 淘汰赛对阵状态 |
| syncLogs | SyncLog[] | 同步日志（最多 120 条） |
| adminOverrides | AdminOverride[] | 管理员操作记录 |
| players | Player[] | 球员 |
| teamHistory | TeamHistoryResult[] | 球队历史战绩 |

---

## 九、优化建议优先级路线图

### Phase 1 - 安全与稳定性
1. 拆分 server.ts 为模块化路由
2. PIN 哈希存储（bcrypt）
3. 添加 API 参数校验（zod）
4. 添加请求限流（express-rate-limit）
5. 启用 TypeScript strict 模式

### Phase 2 - 代码质量
6. 消除前端 any 类型
7. 添加 React Error Boundary
8. 引入前端状态管理（Zustand 或 Context）
9. 添加核心逻辑单元测试
10. 拆分过大的组件文件

### Phase 3 - 生产就绪
11. 数据库迁移（JSON → SQLite）
12. 结构化日志系统
13. CORS 配置
14. 请求超时配置
15. PWA 图标补全 + 离线缓存策略

### Phase 4 - 性能与体验
16. 字体本地化
17. 定时任务独立进程
18. AI 缓存策略优化与文档化
19. 数据库备份策略
20. 清理项目残留文件
