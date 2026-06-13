# MySQL 迁移说明文档

## 1. 迁移目标

本项目已支持通过 `Prisma + MySQL 8` 持久化运行，并默认按单房间模式归一化数据。  
本次迁移保留现有前端 API 路径，迁移重点是把 `db.json` 数据导入 MySQL，并把运行主数据源切换为 MySQL。

## 2. 迁移前备份

1. 备份当前 `db.json`。
2. 备份当前 `.env`。
3. 如线上已有运行目录，同时备份 `runtime/`、`backups/`。

推荐命令：

```bash
cp db.json db.json.bak.$(date +%F-%H%M%S)
```

## 3. Prisma 初始化

项目已包含：

- `prisma/schema.prisma`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run db:import:mysql`
- `npm run db:verify:mysql`

说明：

- 当前仓库已经具备 MySQL Schema 和导入脚本。
- 首次全新环境可先使用 `prisma db push` 建表。
- 后续版本升级建议使用 `prisma migrate deploy`。

## 4. MySQL 建库

如果使用本文附带的 `docker-compose.yml`，MySQL 会自动创建：

- 数据库：`${MYSQL_DATABASE}`
- 用户：`${MYSQL_USER}`

如果手动建库，可执行：

```sql
CREATE DATABASE worldcup_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'worldcup_user'@'%' IDENTIFIED BY 'CHANGE_ME_DB_PASSWORD';
GRANT ALL PRIVILEGES ON worldcup_app.* TO 'worldcup_user'@'%';
FLUSH PRIVILEGES;
```

## 5. 首次初始化数据库结构

首次部署时，先建表：

```bash
docker compose --env-file .env.production exec app npx prisma db push
```

后续已有 migration 文件的版本，改用：

```bash
docker compose --env-file .env.production exec app npm run prisma:migrate
```

## 6. JSON 数据导入

### 6.1 放置迁移源文件

将旧项目的 `db.json` 放到：

```text
./runtime/db.json
```

容器内会通过：

```text
/app/runtime/db.json
```

读取该文件。

### 6.2 执行导入

```bash
docker compose --env-file .env.production exec app npm run db:import:mysql
```

导入顺序已经内置在脚本中，覆盖范围包括：

- 基础表
- 比赛与赔率
- 钱包与流水
- 竞猜与结算结果
- AI 内容、同步日志、活动流、徽章、称号、卡牌库存、管理员会话、签到日志

## 7. 导入校验

执行：

```bash
docker compose --env-file .env.production exec app npm run db:verify:mysql
```

脚本会输出：

- 关键表记录数
- 钱包/流水/竞猜摘要
- 不一致字段列表

如果需要仅查看当前 MySQL 摘要：

```bash
docker compose --env-file .env.production exec app npm run db:summary:mysql
```

## 8. 切换主数据源

确认 `.env.production` 中：

```env
APP_STORAGE_MODE=mysql
DATABASE_URL=mysql://worldcup_user:CHANGE_ME_DB_PASSWORD@mysql:3306/worldcup_app?charset=utf8mb4
APP_DATA_DIR=/app/runtime
```

然后重启应用：

```bash
docker compose --env-file .env.production up -d --build
```

应用健康接口会返回：

```json
{
  "db": "mysql"
}
```

## 9. 回滚步骤

如需回滚：

1. 停止应用写入。
2. 导出当前 MySQL 备份。
3. 将 `APP_STORAGE_MODE` 改回 `json`。
4. 用迁移前备份的 `runtime/db.json` 覆盖当前文件。
5. 重启服务。

回滚示例：

```bash
cp runtime/db.json.bak.2026-06-11-120000 runtime/db.json
docker compose --env-file .env.production up -d --build
```

## 10. 迁移后核对清单

- 用户数一致
- 钱包数一致
- 流水数一致
- 比赛数与赔率数一致
- 已结算竞猜数一致
- AI 内容可读取
- 活动流可读取
- 球员与历史资料可读取
- 后台可登录
- 健康检查返回 `db=mysql`
