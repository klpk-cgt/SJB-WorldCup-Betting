# 宝塔 MySQL 迁移脚本说明

## 1. 适用场景

适用于你已经把项目文件夹上传到宝塔服务器，准备直接在宝塔终端执行迁移，不使用 Docker。

## 2. 前置条件

宝塔服务器需要先具备：

1. Node.js / npm
2. MySQL 8
3. 已创建数据库、账号、密码
4. 项目目录已经上传完成

## 3. 环境文件

复制：

```bash
cp .env.production.example .env.production
```

至少修改这些字段：

```env
NODE_ENV=production
PORT=3000
APP_URL=https://你的域名

APP_STORAGE_MODE=mysql
APP_DATA_DIR=./runtime
IMPORT_DB_JSON_PATH=./runtime/db.json

DATABASE_URL=mysql://数据库用户:数据库密码@127.0.0.1:3306/数据库名?charset=utf8mb4

ADMIN_USERNAME=你的管理员账号
ADMIN_PASSWORD=高强度管理员密码
```

说明：

- `APP_DATA_DIR=./runtime` 表示运行数据目录放在项目内的 `runtime/`
- `IMPORT_DB_JSON_PATH=./runtime/db.json` 表示默认从 `runtime/db.json` 导入

## 4. 放置旧数据

把旧项目的 `db.json` 放到：

```text
项目根目录/runtime/db.json
```

## 5. 执行迁移脚本

给脚本加执行权限：

```bash
chmod +x scripts/baota-mysql-migrate.sh
```

直接执行：

```bash
bash scripts/baota-mysql-migrate.sh
```

## 6. 常用执行方式

默认执行：

```bash
bash scripts/baota-mysql-migrate.sh
```

指定环境文件：

```bash
bash scripts/baota-mysql-migrate.sh --env .env.production
```

指定其他 `db.json` 源文件：

```bash
bash scripts/baota-mysql-migrate.sh --source ./db.json
```

只建表，不导入：

```bash
bash scripts/baota-mysql-migrate.sh --skip-import
```

跳过依赖安装：

```bash
bash scripts/baota-mysql-migrate.sh --skip-install
```

## 7. 脚本会做什么

脚本会自动执行以下步骤：

1. 加载 `.env.production`
2. 检查 `node`、`npm`、`DATABASE_URL`
3. 创建 `runtime/` 和 `runtime/backups/`
4. 安装依赖
5. 生成 Prisma Client
6. 用 `prisma db push` 建表
7. 备份导入前 `db.json`
8. 导入 `db.json` 到 MySQL
9. 校验 MySQL 导入结果
10. 构建生产文件

## 8. 迁移成功后的启动

命令行启动：

```bash
npm run start
```

如果用宝塔 Node 项目管理，启动命令填写：

```bash
npm run start
```

## 9. 验证方式

访问：

```text
/api/health
```

确认返回类似：

```json
{
  "ok": true,
  "db": "mysql"
}
```

## 10. 回滚方式

如果导入后想回滚：

1. 把 `APP_STORAGE_MODE` 改回 `json`
2. 用 `runtime/backups/` 里的备份文件恢复 `runtime/db.json`
3. 重启服务

## 11. 相关文件

- [scripts/baota-mysql-migrate.sh](</H:/世界杯娱乐项目/back/klpk-cgt-s-Org v2/scripts/baota-mysql-migrate.sh>)
- [MySQL迁移说明文档.md](</H:/世界杯娱乐项目/back/klpk-cgt-s-Org v2/MySQL迁移说明文档.md>)
- [.env.production.example](</H:/世界杯娱乐项目/back/klpk-cgt-s-Org v2/.env.production.example>)
