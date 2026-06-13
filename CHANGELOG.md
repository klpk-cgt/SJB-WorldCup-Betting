# 更新日志 (Changelog)

## v2.3.1 - 2026-06-13

### 赔率系统修复与增强

- **修复 oddsDecimal 恒为 1 的 bug**：`resolveOddsSnapshot()` 中 market 大小写不匹配（前端传 `h2h`，代码检查 `H2H`），添加 `.toUpperCase()` 归一化处理
- **修复赔率同步 422 错误**：The Odds API 不支持 `correct_score` market，移除该参数，仅使用 `h2h,totals`
- **新增手动赔率同步路由**：`POST /api/admin/sync/odds` — 全量同步赔率，不自动触发以节省 API 调用次数（免费版 500次/月）
- **The Odds API Key 集成测试**：验证 Key 可用，68 场比赛成功同步 67 场真实赔率

### 代码质量优化 (审查驱动)

- **TypeScript 严格模式**：启用 `strictNullChecks`、`noUnusedLocals`、`noFallthroughCasesInSwitch`
- **Props 类型修复**：4 个组件（PredictionTab/MeTab/HomeTab/LeaderboardTab）Props 从 `any` 改为 `User | null` 和 `Wallet | null`
- **catch 块类型安全**：22 处 `catch (e: any)` → `catch (e: unknown)` + `instanceof Error` 安全访问 `.message`
- **`helpers.ts` 瘦身**：~700 行题库数据提取到独立 `quiz_data.ts`（100题）
- **`room-1` 硬编码配置化**：添加 `DEFAULT_ROOM_ID` 环境变量，`ai.ts` 使用 `getRuntimeConfig()` 动态读取
- **console.log → logger**：替换 `helpers.ts` 中残留的 console.log

### 性能优化

- **Vite 代码分割**：添加 `manualChunks` 配置，将 react/motion/recharts/socket.io/html2canvas 分离为独立 chunk
- **React.lazy + Suspense**：7 个非首页组件懒加载（AdminPanel/BracketPage/HistoryHall/MatchDetail/Stats/WatchGuide/AIRecommend），首屏体积减少 60%+
- **排行榜性能**：O(n×(P+T)) → O(P+T+U)，预聚合 Map 单次遍历替代每用户重复 filter

### 项目清理

- **PWA 移除**：删除 `manifest.json`、`sw.js`、相关 meta 标签和 Service Worker 注册（仅手机浏览器使用）
- **根目录清理**：删除 15 个测试残留文件（admin-*.txt/health-check.txt/test-*.cjs 等）、临时图片、metadata.json
- **脚本归类**：7 个 `.cjs` 工具脚本移至 `scripts/`
- **文档归档**：6 篇冗余旧文档移至 `docs/archive/`

### 部署优化

- **Dockerfile 瘦身**：移除生产不需要的 `scripts/` 复制，添加 `npm prune --production` 减少镜像体积
- **Dockerfile 健康检查**：添加 `HEALTHCHECK` 指令监控服务状态

### 文档

- **新增 `项目维护文档.md`**：完整的 12 章节维护手册（技术栈/API/数据库/部署/业务逻辑/运维操作指南）

---

## v2.3.0 - 2026-06-13

### 赔率同步修复与降级安全增强

- **赔率API同步失败根因定位**：`.env` 中 `API_FOOTBALL_KEY` 和 `THE_ODDS_API_KEY` 均为空，导致所有同步走降级逻辑，赔率全部使用兜底模板。需管理员填入有效 API Key 后才能启用实时赔率同步
- **统一两套 `generateDefaultOdds`**：删除 `sync.ts` 中的重复版本，统一使用 `utils/odds.ts` 中基于 FIFA 排名差异化的版本
- **新增 `scaleCorrectScoreOdds` 算法**：根据 h2h 隐含概率缩放 correctScore 模板赔率，强队主胜比分赔率降低，弱队客胜比分赔率升高
- **赔率 WebSocket 推送接通**：`syncOddsForMatches` 更新赔率后自动触发 `broadcastOddsChange`，变化超过 0.05 阈值时推送
- **前端 WebSocket 实时刷新**：HomeTab 新增 `wsScoreUpdate`/`wsOddsChange` props，比分和赔率变动时局部更新本地状态，无需重新请求全量
- **比分未知标识**：降级模式下 FT 比赛不再广播虚假 0:0 比分，新增 `scoreUnknown` 标记，前端显示"待确认"

### 结算安全防护

- **结算服务无比分保护**：`settlement_service` 中无比分比赛结算时明确提示"降级模式下需管理员手动录入比分"，不再以 0:0 错误结算
- **降级逻辑不再广播虚假比分**：`sync_scheduler_service` 中 FT 状态无比分时标记 `scoreUnknown: true`，不广播 0:0
- **自动结算跳过 scoreUnknown 比赛**：`autoSettleFinishedMatches` 对比分未知的 FT 比赛记录管理员提醒日志

### 备份恢复功能

- **新增管理端备份恢复 API**：
  - `GET /api/admin/backups` — 列出所有备份
  - `POST /api/admin/backups` — 手动创建备份
  - `POST /api/admin/backups/restore` — 从备份恢复（支持全量恢复和精确恢复单个用户）
  - `GET /api/admin/backups/:fileName/users` — 从备份中列出可恢复的用户
- **精确用户恢复**：支持从备份中提取单个用户及其关联数据（钱包、交易、预测、卡牌、徽章、称号），不影响其他用户数据
- **全量恢复安全保护**：全量恢复前自动创建当前数据库备份

### 同步健康监控

- **新增 `GET /api/health/sync` 端点**：无需管理员认证，返回各同步模块健康状态（healthy/degraded）
- **连续失败告警**：赛程/赔率/比分同步连续失败 3 次时记录 ERROR 日志并推送系统通知
- **启动时立即执行初始同步**：服务启动后立即执行一次同步 tick，不等待 cron 下一分钟

### 其他

- `serializeMatch` 新增 `scoreUnknown`、`oddsSyncStatus`、`oddsSource`、`oddsLastSyncedAt` 字段
- `initial_data.ts` 赔率初始化使用基于 FIFA 排名的差异化版本

## v2.2.0 - 2026-06-13

### 阶段一：基础修复与通知系统

- **history_scholar 徽章修复**：新增 `HISTORY_VISIT` 活动类型，历史长廊访问时自动记录，访问 3 次以上解锁"历史学者"徽章
- **活动记录接口**：新增 `POST /api/activities/record` 接口，支持前端记录用户活动事件
- **轻量 Toast 通知系统**：新增 `celebrate`（庆祝）和 `badge`（徽章解锁）两种通知类型，WebSocket 实时推送自动弹出 Toast（比分更新/竞猜命中/比赛结算/徽章解锁/连胜达成）

### 阶段二：功能补全

- **分享功能落地**：安装 html2canvas，个人中心新增"保存战绩"按钮，一键截图身份卡区域保存为 PNG
- **问答题库扩充**：从 15 题扩充到 100 题，涵盖世界杯历史、球星知识、球队文化、足球规则、趣闻纪录、2026 专题
- **AI 每日自动生成新题**：支持 DeepSeek/Gemini 双提供商，混合出题模式（2 道静态 + 1 道 AI），管理端触发接口 `POST /api/quiz/generate-ai`

### 阶段三：数据可视化增强

- **群内预测准确率排行**：统计页新增准确率排行卡片，按命中率排名，进度条+百分比+排名徽章
- **淘汰赛对阵图实时更新**：晋级（绿色+勾号）、淘汰（删除线+半透明）、进行中（脉冲动画）状态标记，WebSocket 自动刷新

### 阶段四：动态更新

- **小组积分榜 API**：新增 `GET /api/group-standings`，返回 12 个小组实时积分榜（赛/胜/平/负/净胜/积分）
- **观赛攻略出线形势**：小组分析展开时显示实时积分榜表格，前 2 名出线区绿色高亮

### 其他改进

- **比赛详情页增强**：MatchDetailPage 大幅优化（+229 行）
- **管理面板调整**：AdminPanel 细节优化
- **日志系统增强**：logger 模块扩展
- **结算服务调整**：settlement_service 更新

### 新增文件

- `docs/screenshots/homepage.png` - 首页预览截图

## v2.1.6 - 2026-06-13

### 功能改进

- **AI 预测卡片 B+C 缓存策略**：启动时预热缓存 + 每3小时后台刷新 + 本地文件兜底（`runtime/prediction-data.json`），离线重启也能展示预测
- **数据源改为 jsDelivr CDN**：`cdn.jsdelivr.net` 国内可直接访问，替代原 Vercel API 和 GitHub Raw
- **比赛 ID 匹配**：data.json 通过 id 与本地比赛数据匹配（`m-1` → id:1），替代队名模糊匹配
- **只显示1场焦点战预测**：优先焦点战 > 信心等级 > 开赛时间，卡片更聚焦
- **预测数据丰富化**：新增进球预期（totalGoals）、半全场（htft）、赛果（result）字段展示
- **管理面板增强**：系统状态卡片、一键运维、窗口同步、强制重算按钮
- **焦点战选择逻辑重构**：统一 `homeMatchSelection` 工具函数，支持进行中/即将开赛/完赛

### 新增文件

- `src/server/services/home_ai_prediction_service.ts` - AI 预测服务层（独立模块）
- `src/utils/homeMatchSelection.ts` - 首页焦点战选择逻辑
- `scripts/check-home-ai-prediction.mjs` - AI 预测调试脚本
- `vitest.config.ts` - 测试配置

## v2.1.5 - 2026-06-13

### 功能改进

- **AI 预测卡片数据源重构**：新增 GitHub Pages 爬取作为主要数据源（国内服务器可访问），替代原 Vercel API
- **三级降级策略**：GitHub Pages 爬取 → Vercel API → 本地赔率预测，确保任何网络环境都能展示
- **丰富预测数据展示**：新增竞彩 SPF 赔率、伤停信息、比赛场馆、焦点战标记、标签（揭幕战/死亡之组）
- **信心等级颜色区分**：铁胆(绿)、稳胆(青)、大概率(橙)、中等(灰)，视觉更直观
- **队名智能匹配**：爬取数据与本地比赛数据通过中英文队名模糊匹配

### 文件变更

- 重写 `src/server/routes/home.ts` - 新增 HTML 爬取、解析、队名匹配逻辑
- 重写 `src/components/home/AIPredictionCard.tsx` - 新增伤停/场馆/标签/赔率展示，信心等级颜色化

## v2.1.4 - 2026-06-13

### 功能改进

- **焦点战智能选择**：`HomeTab.tsx` 重构焦点战匹配逻辑，优先级：进行中比赛 > 当前比赛窗口(3h内) > 即将开赛 > 最近完赛，不再依赖固定数据
- **比赛状态分类**：新增 `FINISHED_STATUSES`/`LIVE_STATUSES` 集合，精确区分完赛/进行中/未开赛
- **倒计时格式化**：新增 `formatCountdown()` 和 `formatBeijingTime()` 工具函数
- **阶段中文标签**：新增 `stageLabel()` 映射比赛阶段为中文

### 文件变更

- 修改 `src/components/HomeTab.tsx` - 焦点战智能选择逻辑重构

## v2.1.3 - 2026-06-13

### Bug 修复

- **比赛列表排序**：`matches.ts` 比赛列表和今日比赛接口返回数据按开赛时间排序，新增 `sortMatchesByStartTime()` 工具函数
- **竞猜锁定状态分类**：`PredictionTab.tsx` 新增 `LOCKED` 分类，已锁定比赛单独展示，不再混入可下注列表

### 功能改进

- **AI 预测卡片优化**：标题改为"今日 AI 娱乐预测"，变量命名规范化
- **首页路由增强**：`home.ts` 大幅重构，AI 预测卡片接口支持多提供商降级、缓存、错误处理
- **db-storage 脚本优化**：`db-storage.mjs` 读写操作增强 utf8mb4 字符集保障
- **调试脚本**：新增 `scripts/debug-match-order.mjs`，`package.json` 添加 `ops:debug:matches` 命令

### 部署支持

- **PM2 生态配置**：新增 `ecosystem.config.cjs`，自动加载 `.env.production`
- **.gitignore 修复**：排除 `src/assets/*.png`，修复构建时缺少球场背景图

### 文件变更

- 修改 `src/server/routes/matches.ts` - 比赛列表按开赛时间排序
- 修改 `src/server/routes/home.ts` - AI 预测卡片接口重构
- 修改 `src/server/helpers.ts` - 新增 sortMatchesByStartTime
- 修改 `src/components/PredictionTab.tsx` - 新增 LOCKED 状态分类
- 修改 `src/components/home/AIPredictionCard.tsx` - 标题和变量优化
- 修改 `scripts/db-storage.mjs` - 字符集保障增强
- 修改 `package.json` - 新增调试命令
- 新增 `ecosystem.config.cjs` - PM2 配置

## v2.1.2 - 2026-06-13

### Bug 修复

- **AI 预测卡片未渲染**：`HomeTab.tsx` 中 `AIPredictionCard` 已 import 但未在 JSX 中渲染，现已添加到首页焦点战卡片与群内动态之间
- **useScrollReveal 未使用**：GSAP 动画系统的 `useScrollReveal` hook 已定义但无组件调用，现已应用到统计页和排行榜

### 功能完善

- **统计页滚动动画**：`StatsPage.tsx` 4 个图表 section 均添加 `useScrollReveal`，滚动时渐入动画
- **排行榜头部动画**：`LeaderboardTab.tsx` 头部区域添加 `useScrollReveal`，配合已有 `useStaggerReveal` 列表行交错动画
- **ChartCard 组件重构**：改为 `React.forwardRef` 支持外部 ref 传递

### 文件变更

- 修改 `src/components/HomeTab.tsx` - 添加 `<AIPredictionCard />` 渲染
- 修改 `src/components/StatsPage.tsx` - 引入 useScrollReveal，4 个 section 添加 ref
- 修改 `src/components/LeaderboardTab.tsx` - 引入 useScrollReveal，头部添加 ref

## v2.1.1 - 2026-06-13

### Bug 修复

- **事务回滚机制**：`transaction_guard.ts` 新增快照回滚，业务事务失败时自动恢复数据状态，防止脏数据写入
- **下注扣款顺序修复**：`prediction_service.ts` 调整为先扣款再消耗卡牌，避免卡牌消耗后扣款失败导致数据不一致
- **结算卡牌效果金额修复**：`settlement_service.ts` 统一卡牌效果处理逻辑，修复卡牌效果金额计算错误，中奖+卡牌效果合并为单笔交易记录
- **每日问答时区修复**：`helpers.ts` 使用 `toBeijingDateKey()` 替代 `new Date().toISOString()`，确保北京时间日期正确

### 性能优化

- **移除请求级维护调用**：`matches.ts` 路由移除所有 `runScheduledMaintenance()` 调用，避免每次 API 请求都执行维护逻辑，显著提升响应速度

### 功能改进

- **观赛攻略入口**：`App.tsx` 新增观赛攻略页面导航入口（Eye 图标）
- **连接状态优化**：WebSocket 连接状态"离线"改为"延迟"，移除脉冲动画减少视觉干扰
- **MySQL 字符集保障**：`db-storage.mjs` 读写操作强制使用 `utf8mb4` 字符集，事务内设置 `SET NAMES utf8mb4`

### 代码质量

- **db_service 增强**：新增 `saveOrThrow()`、`createSnapshot()`、`restoreSnapshot()` 方法，提取 `persistCurrentState()` 私有方法
- **代码格式化**：`settlement_service.ts` 和 `prediction_service.ts` 代码格式化，移除冗余注释
- **清理废弃文档**：删除 `NAVIGATION_HUB_IMPLEMENTATION_PLAN.md`

### 文件变更

- 修改 `src/server/services/transaction_guard.ts` - 事务失败自动回滚
- 修改 `src/server/services/prediction_service.ts` - 扣款顺序修复 + 代码清理
- 修改 `src/server/services/settlement_service.ts` - 卡牌效果金额修复 + 代码格式化
- 修改 `src/server/helpers.ts` - 每日问答时区修复
- 修改 `src/server/routes/matches.ts` - 移除请求级维护调用
- 修改 `src/db/db_service.ts` - 新增快照/回滚方法
- 修改 `src/App.tsx` - 观赛攻略入口 + 连接状态优化
- 修改 `scripts/db-storage.mjs` - MySQL utf8mb4 字符集保障
- 删除 `NAVIGATION_HUB_IMPLEMENTATION_PLAN.md`

---

## v2.1.0 - 2026-06-13

### 新增功能

#### 1. AI 预测卡片（首页）
- 新增 `AIPredictionCard.tsx` 首页 AI 预测卡片组件
- 接入第三方预测 API，展示 1-3 场比赛的 AI 预测
- 支持信心等级展示、比分参考、预测理由
- 3 小时内存缓存，避免频繁调用第三方 API
- 投注化词汇自动映射为娱乐化表达（"铁胆"→"高信心"）

#### 2. 观赛攻略页面
- 新增 `WatchGuidePage.tsx` 2026 世界杯观赛全攻略页面
- 12 组小组深度分析 + 黑马预测
- 10 场必看对决推荐
- 4 支新军首秀故事（乌兹别克斯坦、约旦、库拉索、佛得角）
- 整体赛事格局预测

#### 3. 世界杯数据扩充
- 新增 `classicMatches.ts` - 20 场经典比赛回顾（1930-2022）
- 新增 `playerProfiles.ts` - 20 位球星趣味档案（10 传奇 + 10 当红）
- 新增 `tactics.ts` - 15 支球队战术分析
- 新增 `visualStats.ts` - 数据可视化静态数据集（各大洲夺冠分布、进球趋势、东道主成绩、点球大战胜率）
- 新增 `watchGuide2026.ts` - 观赛攻略完整数据

#### 4. GSAP 动画系统
- 新增 `src/animations/index.ts` 动画工具集
- `useReducedMotion()` - 无障碍动画偏好检测
- `useStaggerReveal()` - 子元素依次淡入动画
- `useScrollReveal()` - 滚动触发淡入动画
- `useFadeIn()` - 简单淡入动画

#### 5. 后端服务层重构
- 新增 `src/server/services/` 服务层目录，拆分业务逻辑
- `settlement_service.ts` - 统一结算服务
- `prediction_service.ts` - 统一下注服务
- `wallet_service.ts` - 统一钱包服务（所有余额变动唯一入口）
- `card_transaction_service.ts` - 统一卡牌交易服务
- `quiz_service.ts` - 每日问答服务
- `sync_scheduler_service.ts` - 动态同步调度（智能频率调整）
- `post_match_report_service.ts` - 赛后战报服务
- `transaction_guard.ts` - 业务事务包装器

#### 6. 首页路由
- 新增 `src/server/routes/home.ts` 首页 AI 预测卡片接口
- `GET /api/home/ai-prediction-card` 接口

#### 7. 球员头像扩充
- 新增大量球员头像图片（覆盖 48 支参赛队伍）
- 包括阿根廷、巴西、法国、德国、英格兰、日本、韩国、墨西哥等全部参赛国

### 技术改进

- 后端服务层模块化：将业务逻辑从路由中拆分到独立 service 文件
- 钱包服务统一入口：禁止其他模块直接修改 wallet.balance
- 动态同步调度：根据比赛阶段智能调整同步频率（LOW/NORMAL/HIGH/LIVE）
- 事务保护：`runBusinessTransaction` 保证数据一致性
- 赛后战报自动生成：结算后自动生成适合群聊传播的战报
- Prisma schema 更新：新增 quiz 相关表结构
- 环境变量校验增强

### 文件变更

- 新增 `src/animations/index.ts`
- 新增 `src/components/WatchGuidePage.tsx`
- 新增 `src/components/home/AIPredictionCard.tsx`
- 新增 `src/data/worldcup/classicMatches.ts`
- 新增 `src/data/worldcup/playerProfiles.ts`
- 新增 `src/data/worldcup/tactics.ts`
- 新增 `src/data/worldcup/visualStats.ts`
- 新增 `src/data/worldcup/watchGuide2026.ts`
- 新增 `src/server/routes/home.ts`
- 新增 `src/server/services/` 目录（8 个服务文件）
- 更新 `src/components/HomeTab.tsx` - 集成 AI 预测卡片
- 更新 `src/components/MatchDetailPage.tsx` - 比赛详情增强
- 更新 `src/components/MatchesTab.tsx` - 赛程页面优化
- 更新 `src/components/HistoryHallPage.tsx` - 历史长廊扩充
- 更新 `src/components/TeamDetailDrawer.tsx` - 球队详情增强
- 更新 `src/components/LeaderboardTab.tsx` - 排行榜优化
- 更新 `src/server/helpers.ts` - 辅助函数重构
- 更新 `src/server/routes/admin.ts` - 管理接口增强
- 更新 `src/server/routes/ai.ts` - AI 路由优化
- 更新 `src/server/routes/matches.ts` - 比赛路由重构
- 更新 `src/server/routes/cards.ts` - 卡牌路由优化
- 更新 `src/server/routes/checkin.ts` - 签到路由重构
- 更新 `src/server/scheduler.ts` - 调度器优化
- 更新 `src/db/db_service.ts` - 数据库服务增强
- 更新 `prisma/schema.prisma` - 数据模型更新
- 更新 `package.json` - 新增依赖
- 新增大量球员头像图片（`public/player-avatars/`）

---

## v2.0.0 - 2026-06-07

### 新增功能

#### 1. 管理后台全面升级
- **单个创建账号**：管理员可手动设置登录码、昵称、初始积分，无需 PIN 即可登录
- **删除账号**：支持删除用户及其关联数据（钱包、预测记录、交易记录），带全屏确认弹窗
- **头像上传**：支持 Base64 格式图片上传，直接存储在数据库中
- **积分调账**：管理员可手动调整用户积分，支持自定义调账原因
- **中文错误提示**：所有接口返回中文错误信息，便于管理员理解

#### 2. 首字母登录系统
- 拼音首字母转换：输入中文昵称自动生成首字母登录码（如"张三"→"ZS"）
- 无 PIN 登录：管理员创建的账号无需 PIN，直接用首字母登录
- 登录码唯一性校验：防止重复登录码

#### 3. 历史长廊全面扩充
- **冠军年表**：从 11 届扩充至 **22 届完整数据**（1930-2022），含决赛比分、金靴奖
- **经典球队**：从 4 支扩充至 **8 支**（新增 1970 巴西、1974 荷兰、1954 西德、1986 阿根廷）
- **传奇球星**：从 4 人扩充至 **10 人**（新增贝利、克洛泽、克鲁伊夫、方丹、穆勒、马特乌斯）
- **世界杯纪录**：从 4 条扩充至 **12 条**（新增最快进球、参赛最多、最年长进球者等）

#### 4. 长线竞猜优化
- 冠军、金靴、金球竞猜界面美化
- 同步显示球员头像 + 国家国旗
- 竞猜选项卡片化展示

### 技术改进

- 后端路由模块化：将 `server.ts` 拆分为 `routes/` 目录下的独立路由文件
- 添加 `getPinyinInitials` 拼音首字母转换工具函数
- 完善 TypeScript 类型定义

### 文件变更

- 新增 56 个球员头像图片（`public/player-avatars/`）
- 新增 FIFA 球员信息数据文件
- 更新 `src/components/AdminPanel.tsx` - 管理后台 UI
- 更新 `src/components/HistoryHallPage.tsx` - 历史长廊 UI
- 更新 `src/data/historyHall.ts` - 历史数据
- 更新 `src/server/helpers.ts` - 拼音转换工具
- 更新 `src/server/routes/admin.ts` - 管理接口
- 更新 `src/server/routes/auth.ts` - 无 PIN 登录支持
- 更新 `src/App.tsx` - 管理员登录入口
- 更新 `src/components/MeTab.tsx` - 管理后台入口按钮
