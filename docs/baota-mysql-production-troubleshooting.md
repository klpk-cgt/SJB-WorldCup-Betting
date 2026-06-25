# 宝塔 + Node + MySQL 生产排障说明

## 1. 先看系统状态

1. 打开后台的系统状态和同步状态接口：
   - `GET /api/admin/system/status`
   - `GET /api/admin/sync-state`
2. 重点确认：
   - `storage.mode` 是否为 `mysql`
   - `matches.byStatus`
   - `matches.unsettledFinishedMatches`
   - `matches.scoreUnknownMatches`
   - `odds.bySource`
   - `sync.latest / latestFixtures / latestOdds`

## 2. 最新赛程或积分榜不更新

1. 先执行：
   - `npm run ops:diagnose`
2. 再检查后台：
   - 手动同步赛程 `POST /api/admin/sync/fixtures`
   - 手动同步积分榜 `POST /api/admin/sync/sporttery-standings`
3. 重点看：
   - `recentSyncLogs`
   - `providers`
   - `mysql.variables`
4. 若外部 API 失败，先确认：
   - `API_FOOTBALL_KEY`
   - `THE_ODDS_API_KEY`
   - `SPORTTERY_API_BASE_URL` 相关配置是否可访问

## 3. 比分不刷新

1. 先确认比赛状态是否已经进入 `LIVE` 或 `HT`。
2. 手动触发：
   - `POST /api/admin/sync/live-scores`
3. 如果没有更新：
   - 检查该比赛日期是否正确
   - 检查 `providerMeta.apiFootballFixtureId`
   - 检查最近 `fixtures` 同步日志是否报错

## 4. 赔率异常

1. 先查看后台系统状态里的 `odds.bySource`。
2. 手动触发：
   - `POST /api/admin/sync/odds`
3. 如果某场赔率明显不对：
   - 再触发 `POST /api/admin/sync/matches/:id`
   - 查看该场 `unsyncedReasons`
4. 当前赔率优先级是：
   - `Sporttery`
   - `The Odds API`
   - 本地兜底

## 5. 自动结算没触发

1. 先看比赛是否已经有明确比分。
2. 如果状态是 `FT/AET/PEN` 但仍未结算：
   - 检查 `scoreUnknownMatches`
   - 检查 `unsettledFinishedMatches`
3. 手动操作：
   - 正式结算 `POST /api/admin/matches/:id/settle`
   - 强制重算 `POST /api/admin/matches/:id/settle?forceResettle=true`

## 6. MySQL 空间暴涨

1. 先运行：
   - `npm run ops:audit:mysql`
2. 重点看：
   - `mysql.binaryLogs`
   - `mysql.variables.log_bin`
   - `mysql.variables.binlog_expire_logs_seconds`
   - `mysql.variables.general_log`
   - `mysql.variables.slow_query_log`
   - `mysql.topTableSizes`
   - `runtime.logDirectorySize`
3. 如果 `binaryLogs.totalSize` 很大：
   - 先做数据库备份
   - 再按 MySQL 运维规范清理历史 binlog
   - 同时设置合理保留期
4. 如果 `runtime/logs` 持续增大：
   - 检查是否有异常报错刷屏
   - 确认日志轮转配置已生效

## 7. 发布前建议检查

1. `npm run lint`
2. `npm run build`
3. `npm test`
4. `npm run ops:diagnose`
5. 后台手动验证：
   - 同步赛程
   - 同步比分
   - 同步赔率
   - 同步积分榜
   - 单场结算
