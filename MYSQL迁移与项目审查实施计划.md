# 项目审查与 MySQL 迁移实施计划

## 1. 审查结论摘要

当前项目是一个 `React + Vite + Express + TypeScript` 的前后端同仓应用，后端数据层并未使用 ORM 或关系型数据库，而是通过 `src/db/db_service.ts` 将整份 `db.json` 缓存在内存中，再用同步/异步文件写回的方式持久化。

这套方案适合原型期或单机演示，但已经不适合继续扩展到正式部署，尤其不适合以下场景：

- 多用户同时下注、签到、调账、结算
- 多房间/多管理员并发操作
- 需要稳定审计、回滚、统计分析
- 需要多实例部署或容器化部署
- 需要正式迁移到 MySQL

结论：建议先完成“数据访问层抽象 + 安全加固 + 模型收口”，再执行 MySQL 迁移和部署切换。不要直接把现有 `dbService` 的文件写法替换成 SQL 零散调用，否则后续维护成本会很高。

## 2. 已确认的项目现状

### 2.1 技术栈

- 前端：React 19 + Vite + TypeScript + Tailwind
- 后端：Express + TypeScript
- 数据：`db.json`
- AI/外部集成：DeepSeek / Gemini / Mimo / API-Football / The Odds API

### 2.2 数据现状

基于当前 `db.json` 实际内容，核心数据规模大致如下：

- `rooms`: 2
- `users`: 1
- `wallets`: 1
- `transactions`: 3
- `teams`: 51
- `matches`: 104
- `matchOdds`: 72
- `predictions`: 2
- `aiContents`: 12
- `syncLogs`: 120
- `players`: 1288
- `teamHistory`: 47
- `activities`: 2

`db.json` 当前文件大小约 `1.0 MB`，规模不大，适合一次性导入 MySQL。

### 2.3 构建基线

已验证：

- TypeScript 类型检查可通过
- 前端 `vite build` 可通过

已发现：

- 生产构建存在大包告警，主 JS 包约 `1.19 MB`

## 3. 主要问题清单

以下问题按优先级排序，前 4 项建议在迁移前优先处理。

### P0. 用户认证实际上等同于“只要知道登录码即可冒充”

相关位置：

- `src/server/helpers.ts:125-133`
- `src/utils/api.ts:10-20`
- `src/server/routes/auth.ts:17-49`

现状：

- 登录接口只校验一次 `loginCode + pin`
- 后续接口并没有用户 session / JWT
- 用户态请求只在 `Authorization` 中传登录码
- `query.loginCode` 也可以直接作为认证来源

影响：

- 任何知道登录码的人都可以直接调用接口冒充用户
- 无法满足正式部署的最基本安全要求
- 迁移到 MySQL 后，这个问题会被放大，而不是被解决

建议：

- 用户端改为 `session token` 或 `JWT`
- 登录码只用于登录，不再作为长期凭证
- 禁止通过 query string 透传认证信息

### P0. 敏感信息明文存储，管理员默认口令风险高

相关位置：

- `src/server/routes/auth.ts:31-38`
- `src/server/routes/admin.ts:47-58`
- `src/server/helpers.ts:46-71`
- `.env.example`

现状：

- 用户 `pinHash` 实际上是明文 PIN
- 管理员密码直接读环境变量明文
- 管理员 session 落盘到 `admin_sessions.json`
- `.env.example` 中存在默认管理员口令示例

影响：

- 不满足生产安全要求
- 一旦仓库、服务器或备份泄漏，风险很高

建议：

- 用户 PIN 使用 `bcrypt/argon2`
- 管理员密码使用哈希校验
- 管理员 session 落库，并增加过期/撤销机制
- 删除默认弱口令示例

### P0. 整库内存缓存 + 整文件写回，不具备并发一致性

相关位置：

- `src/db/db_service.ts:42-306`
- `src/server/routes/matches.ts:173-315`
- `src/server/helpers.ts:549-845`

现状：

- 所有写操作都是“读内存对象 -> 修改数组 -> 整体保存”
- 下注、调账、结算、签到都没有事务
- 没有行级锁、乐观锁、唯一约束

影响：

- 多请求并发时可能出现余额覆盖、重复结算、下注冲突
- 无法安全扩容为多实例部署
- 迁移到 MySQL 的核心价值会被当前业务写法抵消

建议：

- 迁移前先引入 Repository / Service 层
- 钱包扣减、下注写入、结算必须走数据库事务
- 为关键业务增加唯一索引和状态机约束

### P1. 房间维度设计不完整，存在硬编码 `room-1`

相关位置：

- `src/server/routes/admin.ts:259`
- `src/server/routes/admin.ts:524`

现状：

- 某些逻辑默认回落到 `room-1`
- AI stale 标记直接写死 `room-1`

影响：

- 多房间部署后容易串数据
- 房间隔离会在迁移后暴露更多问题

建议：

- 全面梳理 `groupId/roomId`
- 统一房间主键命名
- 所有业务都从上下文显式带入房间 ID

### P1. 批量创建账号未校验登录码唯一性

相关位置：

- `src/server/routes/admin.ts:168-214`
- 对比：`src/server/routes/admin.ts:247-253`

现状：

- 批量创建用户时，随机生成 `WC####`
- 未校验与已有用户是否冲突

影响：

- 小规模概率低，但属于真实线上风险
- 数据迁移后应交给数据库唯一索引兜底

建议：

- 增加 `users.login_code` 唯一索引
- 批量创建时循环重试或预生成并校验

### P1. Base64 头像直接写入主业务库

相关位置：

- `src/server/routes/admin.ts:335-365`

现状：

- 头像以 Base64 直接存到 `user.avatarUrl`

影响：

- 不利于数据库存储与备份
- 容易造成行数据膨胀
- 后续 CDN、缓存、对象存储都不方便

建议：

- 改为对象存储或本地静态文件
- 数据库存 URL/相对路径，不存原始 Base64

### P1. 运行时数据结构未完全收口

相关位置：

- `src/db/db_service.ts`
- `src/server/badge_service.ts:225-226`
- `src/server/badge_service.ts:285-295`

现状：

- 实际数据中存在 `userTitles`
- 徽章逻辑中使用 `(db as any).checkinLog`
- 这些结构没有完整进入 `DatabaseSchema`

影响：

- 迁移时容易漏表、漏字段、漏数据
- 后续类型系统无法提供完整保护

建议：

- 先补齐领域模型与类型定义
- 再映射到 MySQL 表结构

### P2. 统计与列表接口大量全表扫描

相关位置：

- `src/server/routes/matches.ts`
- `src/server/routes/users.ts`
- `src/server/routes/admin.ts`

现状：

- 排行榜、趋势、竞猜记录、好友下注分布大量依赖数组过滤与排序

影响：

- 当前数据量还小，但迁移后如果仍沿用这种写法，数据库性能也会差

建议：

- 将统计逻辑改写为聚合 SQL
- 建立覆盖索引
- 对高频排行榜做缓存

### P2. 前端主包偏大

现状：

- `vite build` 成功，但有 chunk 过大告警

建议：

- 对管理后台、历史资料库、详情页做按路由拆包
- 减少首屏静态数据注入

## 4. MySQL 迁移目标

目标不是“把 JSON 换成 MySQL”这么简单，而是完成以下 5 个能力升级：

1. 数据一致性：下注、调账、结算具备事务保障
2. 安全性：认证、口令、会话达到可部署标准
3. 可维护性：数据访问逻辑统一，不再散落在路由里
4. 可扩展性：支持多房间、多管理员、多实例部署
5. 可审计性：日志、流水、状态变更可追踪

## 5. 推荐改造原则

### 5.1 架构原则

- 路由层只做参数校验和响应包装
- 业务规则放入 Service 层
- 数据操作统一进入 Repository/DAO 层
- 所有余额、下注、结算都必须事务化

### 5.2 技术建议

建议优先选型：

- ORM：`Prisma`
- 数据库：`MySQL 8`
- 迁移工具：`Prisma Migrate`
- 密码哈希：`bcrypt` 或 `argon2`

原因：

- 项目是 TypeScript，全栈类型联动收益高
- 当前数据模型比较清晰，Prisma 落地速度快
- 后续维护门槛低于手写 SQL 散落方案

## 6. 建议的 MySQL 表结构

### 6.1 核心主表

- `rooms`
- `users`
- `wallets`
- `transactions`
- `teams`
- `matches`
- `match_odds`
- `predictions`
- `tournament_bets`

### 6.2 扩展业务表

- `activities`
- `user_badges`
- `user_titles`
- `card_inventories`
- `share_cards`
- `ai_contents`
- `sync_logs`
- `admin_overrides`
- `admin_sessions`

### 6.3 静态/资料表

- `players`
- `team_history`

### 6.4 建议的关键约束

- `users.login_code` 唯一
- `wallets.user_id` 唯一
- `predictions.id` 主键
- `matches.id` 主键
- `transactions.id` 主键
- `match_odds.match_id` 唯一
- `user_titles.user_id` 唯一
- `card_inventories.user_id` 唯一

### 6.5 建议索引

- `predictions(user_id, placed_at desc)`
- `predictions(match_id, status)`
- `predictions(group_id, match_id)`
- `transactions(user_id, created_at desc)`
- `matches(start_time_utc, status)`
- `matches(stage, start_time_utc)`
- `ai_contents(match_id, type, created_at desc)`
- `sync_logs(sync_type, created_at desc)`
- `activities(group_id, created_at desc)`

## 7. 推荐实施路线

## 阶段 0：冻结基线与备份

目标：先把现状固定住，避免一边迁移一边继续漂移。

任务：

- 冻结 `db.json` 当前快照
- 导出一份结构说明文档
- 梳理所有读写 `dbService` 的文件
- 确定迁移窗口、回滚窗口、验证窗口

产出：

- `db.json` 备份
- 字段清单
- 接口清单

## 阶段 1：补齐领域模型

目标：先把“现在到底有哪些数据”定义准确。

任务：

- 补齐 `DatabaseSchema`
- 将 `userTitles`、`checkinLog` 等运行时字段正式建模
- 统一 `groupId/roomId` 命名
- 明确哪些字段应该拆表、哪些字段保留 JSON

产出：

- 完整 TS 类型
- 关系模型草图

## 阶段 2：抽象数据访问层

目标：先把“文件存储实现”与“业务逻辑”拆开。

任务：

- 新建 `repositories/` 或 `modules/*/repo.ts`
- 为以下领域封装接口：
  - 用户
  - 钱包
  - 交易
  - 比赛
  - 赔率
  - 竞猜
  - AI 内容
  - 活动流
- 路由层停止直接操作 `db.predictions.push(...)` 这类写法

产出：

- `JsonRepository` 实现
- 可替换的 `MySqlRepository` 接口

## 阶段 3：设计并创建 MySQL Schema

目标：正式落地数据库结构。

任务：

- 引入 Prisma
- 编写 `schema.prisma`
- 生成首版 migration
- 为核心表补齐唯一索引、外键、非空约束

产出：

- 首版 MySQL schema
- migration 脚本

## 阶段 4：编写 JSON -> MySQL 导入脚本

目标：把现有数据安全导入。

任务：

- 编写 `scripts/migrate-json-to-mysql.ts`
- 按依赖顺序导入：
  1. `rooms`
  2. `users`
  3. `wallets`
  4. `teams`
  5. `matches`
  6. `match_odds`
  7. `predictions`
  8. `transactions`
  9. 其余扩展表
- 导入后做校验：
  - 记录数一致
  - 用户余额一致
  - 比赛/赔率主键一致
  - 竞猜状态与结算金额一致

产出：

- 可重复执行的导入脚本
- 导入校验报告

## 阶段 5：业务切库改造

目标：应用层从 JSON 仓储切到 MySQL 仓储。

任务：

- 登录、用户、钱包、竞猜、结算、调账切到 MySQL
- 定时同步与 AI 内容改为数据库读写
- 活动流、徽章、称号、卡牌库存切库
- 删除业务中对 `dbService.getData()` 的直接依赖

重点先后顺序：

1. 用户/钱包/交易
2. 比赛/赔率/竞猜
3. 管理后台
4. AI / 活动流 / 徽章 / 卡牌

## 阶段 6：安全与一致性加固

目标：避免“数据库换了，但风险还在”。

任务：

- 用户登录改为 token/session
- PIN 改哈希存储
- 管理员 session 入库
- 钱包扣减与下注插入放进同一事务
- 结算改为事务 + 幂等控制
- 为批量操作增加唯一性保护

## 阶段 7：部署与切换

目标：完成生产部署。

任务：

- 配置 MySQL 连接池
- 增加环境变量：
  - `DATABASE_URL`
  - `MYSQL_HOST`
  - `MYSQL_PORT`
  - `MYSQL_DB`
  - `MYSQL_USER`
  - `MYSQL_PASSWORD`
- 启用数据库健康检查
- 新增启动前 migration 流程
- 切换生产配置从 JSON 模式到 MySQL 模式

建议：

- 初次切换使用“只读旧库 + 导入新库 + 冒烟验证 + 正式切流”

## 8. 关键优化点

### 8.1 钱包与下注必须事务化

推荐事务边界：

- 校验用户
- 校验比赛状态
- 校验余额
- 扣减钱包
- 新增竞猜
- 新增交易流水

任何一步失败，全部回滚。

### 8.2 结算必须幂等

推荐做法：

- 给比赛增加结算版本号或结算锁
- 只允许 `PENDING -> SETTLED`
- 重结算先走显式回滚逻辑
- 所有结算流水保留审计记录

### 8.3 图片不要继续入库为 Base64

推荐做法：

- 头像上传到对象存储或本地静态目录
- 用户表只存 URL

### 8.4 排行榜与统计做聚合优化

推荐做法：

- 高并发排行榜使用 SQL 聚合
- 热门榜可做短 TTL 缓存
- 用户趋势改增量查询，不做全量扫描

## 9. 风险与回滚方案

### 9.1 主要风险

- 旧数据结构不规范，迁移时漏字段
- 余额与交易流水不一致
- 多房间维度遗漏
- 结算逻辑迁移后结果偏差
- 用户认证改造影响前端现有调用

### 9.2 回滚策略

- 保留切换前 `db.json` 完整备份
- 首次发布保留 JSON 只读兜底模式
- 切换当天禁止后台大批量改数据
- 若出现严重问题，回退到：
  - 上一版应用
  - 切换前 `db.json`
  - 切换前环境变量

## 10. 推荐实施工期

按 1 名熟悉 TS/Node 的开发估算：

- 阶段 0-1：1 到 2 天
- 阶段 2：2 到 4 天
- 阶段 3-4：2 到 3 天
- 阶段 5：3 到 5 天
- 阶段 6-7：2 到 3 天

总计建议：`10 到 17 个工作日`

如果需要不中断线上使用，建议按两周以上计划执行。

## 11. 建议的下一步

最推荐的执行顺序：

1. 先新增 Prisma 和 MySQL schema
2. 抽象 Repository，停止路由层直接改 `db`
3. 优先改造认证、钱包、竞猜、结算
4. 编写 JSON 导入脚本
5. 做一次测试环境全量迁移演练
6. 通过后再执行正式部署切换

## 12. 本次检查结论

这个项目具备继续演进到 MySQL 的基础，但不建议只做“数据库替换”。正确做法是把这次工作视为一次“小型后端工程化升级”：

- 先收口模型
- 再抽象数据层
- 再切数据库
- 最后做安全与部署加固

这样迁移后系统才会真正稳定，而不是把 JSON 模式下的问题搬进 MySQL。
