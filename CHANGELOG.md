# 更新日志 (Changelog)

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
