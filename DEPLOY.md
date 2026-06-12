# 世界杯竞猜平台 - 宝塔面板部署指南 V2

## 更新内容
- ✅ 阶段一：稳定性优化（错误处理/日志/定时任务/env校验）
- ✅ 阶段二：WebSocket 实时推送 + 搜索功能
- ✅ 阶段三：数据仪表盘 + 用户管理 + 并发安全
- ✅ 阶段四：AI 推荐跟投 + CDN 缓存策略

---

## 前置条件

| 项目 | 要求 | 状态 |
|------|------|------|
| Node.js | >= 18 | ✅ 已安装 v24.16 |
| PM2 | 任意版本 | ✅ 已安装 v7.0 |
| MySQL | >= 5.7 | ✅ 已安装 |
| 域名 | sjb.chenguantai.top | ✅ 已配置 |
| 端口 | 5600 | ✅ 已配置 |

---

## 部署步骤

### 第一步：上传文件到服务器

通过 SCP 或宝塔面板文件管理器，上传以下到 `/www/wwwroot/sjb.chenguantai.top/`：

```
dist/              ← 构建后的生产文件
prisma/            ← Prisma schema
package.json       ← 依赖配置
package-lock.json  ← 锁定依赖版本
.env.production    ← 生产环境配置
migration_data.sql ← 数据库迁移文件
deploy.sh          ← 部署脚本
```

**注意**：不要上传 `node_modules/`、`.env`（本地）、`src/`、`db.json`

### 第二步：MySQL 密码问题处理（重要！）

你的密码 `@^31^2|8kvIift82` 包含 `|`（管道符）和 `^` 等特殊字符，在 bash 中会被解析。

**方案 A（推荐）：在宝塔面板修改密码为简单密码**
1. 宝塔 → 数据库 → SJB → 权限 → 修改密码
2. 改为：`sjb2026secure`（字母+数字即可）
3. 修改 `.env.production` 和 `deploy.sh` 中的密码

**方案 B：保持原密码，用单引号包裹**
部署脚本已用单引号包裹密码，但 Prisma 连接字符串需要 URL 编码：
```
DATABASE_URL="mysql://SJB_1:%40%5E31%5E2%7C8kvIift82@localhost:3306/SJB"
```

### 第三步：SSH 执行部署

```bash
ssh root@你的服务器IP
cd /www/wwwroot/sjb.chenguantai.top
chmod +x deploy.sh
./deploy.sh
```

部署脚本会自动：
1. 检查 Node.js/PM2 环境
2. 安装生产依赖
3. 加载 `.env.production` 配置
4. 测试 MySQL 连接（带详细错误提示）
5. 如果数据库为空，导入 `migration_data.sql`
6. Prisma 同步数据库表结构
7. PM2 启动服务并设置开机自启

### 第四步：宝塔面板配置

1. **安全** → 放行端口 `5600`（如果还没放行）
2. **网站** → 点击 `sjb.chenguantai.top` → 设置：
   - **反向代理**：目标 URL 填 `http://127.0.0.1:5600`
   - **SSL**：申请 Let's Encrypt 证书，开启强制 HTTPS
3. **计划任务**（可选）：
   - 类型：Shell 脚本
   - 执行周期：每天 03:00
   - 脚本内容：`mysqldump -uSJB_1 -p'你的密码' SJB > /www/backup/sjb_$(date +\%Y\%m\%d).sql`

---

## 验证部署

```bash
# 检查 PM2 状态
pm2 status

# 查看日志
pm2 logs worldcup-app --lines 50

# 健康检查
curl http://localhost:5600/api/health

# 测试搜索
curl "http://localhost:5600/api/matches/search?q=巴西&limit=3"

# 测试 AI 推荐
curl http://localhost:5600/api/ai/recommendations
```

---

## 常见问题

### 1. MySQL 连接失败
```
ERROR 1045 (28000): Access denied for user 'SJB_1'@'localhost'
```
- 检查密码是否正确（注意特殊字符）
- 测试命令：`mysql -uSJB_1 -p'你的密码' SJB -e 'SELECT 1'`
- 确认用户在宝塔中已授权 localhost 访问

### 2. PM2 启动失败
```
pm2 logs worldcup-app --err
```
查看错误日志，通常是：
- 端口被占用：`lsof -i:5600` 查看占用进程
- 数据库连接失败：检查 `DATABASE_URL`

### 3. 前端页面 404
- 确认 `dist/` 目录已上传且包含 `index.html`
- 反向代理配置正确

---

## 更新项目

当有新功能需要部署时：

```bash
# 1. 本地构建
npm run build

# 2. 上传更新的文件
# 上传 dist/ 和任何新增的后端文件

# 3. SSH 执行
cd /www/wwwroot/sjb.chenguantai.top
pm2 restart worldcup-app
```

---

## 数据库管理

```bash
# 备份数据库
mysqldump -uSJB_1 -p'你的密码' SJB > backup_$(date +%Y%m%d).sql

# 查看表结构
mysql -uSJB_1 -p'你的密码' SJB -e "SHOW TABLES;"

# 查看数据量
mysql -uSJB_1 -p'你的密码' SJB -e "
  SELECT 'users' as tbl, COUNT(*) FROM users
  UNION ALL SELECT 'matches', COUNT(*) FROM matches
  UNION ALL SELECT 'predictions', COUNT(*) FROM predictions;
"
```
