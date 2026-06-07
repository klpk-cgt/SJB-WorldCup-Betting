# 2026 美加墨世界杯朋友群观赛竞猜站

一个专为朋友群设计的世界杯竞猜娱乐平台，支持赛事竞猜、AI 分析、实时赔率、排行榜和管理后台。

## 功能特性

- 赛事竞猜：单场竞猜（胜平负/比分/总进球/晋级）+ 长线竞猜（冠军/金靴/金球）
- AI 智能分析：多 AI 提供商路由（DeepSeek / Mimo / Gemini），赛前预测与赛后复盘
- 实时赔率：API-Football + The Odds API 双数据源
- 排行榜系统：多维度排行 + AI 点评
- 管理后台：账号创建/删除、头像上传、积分调账、比赛结算
- 历史长廊：22 届世界杯完整数据（冠军年表、经典球队、传奇球星、世界纪录）
- PWA 支持：可安装为桌面应用

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Tailwind CSS + Vite + Motion |
| 后端 | Express + TypeScript + tsx |
| AI | DeepSeek / Mimo / Gemini 多提供商路由 |
| 数据 | JSON 文件数据库（db.json）|

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 生产构建
npm run build
```

## 环境变量

复制 `.env.example` 为 `.env`，配置以下变量：

| 变量 | 说明 |
|------|------|
| API_FOOTBALL_KEY | API-Football 赛程数据 Key |
| THE_ODDS_API_KEY | The Odds API 赔率 Key |
| DEEPSEEK_API_KEY | DeepSeek AI Key |
| GEMINI_API_KEY | Gemini AI Key |
| MIMO_API_KEY | Mimo AI Key |
| ADMIN_PASSWORD | 管理员密码 |

## 项目结构

```
├── server.ts              # Express 主服务器
├── src/
│   ├── App.tsx            # 根组件
│   ├── components/        # UI 组件
│   ├── data/              # 静态数据
│   ├── db/                # 数据层
│   ├── server/            # 服务端逻辑
│   └── utils/             # 工具函数
├── public/                # 静态资源
│   └── player-avatars/    # 球员头像
└── db.json                # 数据库文件
```

## 更新日志

详见 [CHANGELOG.md](./CHANGELOG.md)

## 许可证

Apache-2.0
