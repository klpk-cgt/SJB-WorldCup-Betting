---
name: post-match-battle-report
overview: 新增"赛后群战报"功能：首页群内动态上方显示最近1场战报卡片、比赛详情页新增战报Tab、导航抽屉新增战报墙页面、后端补齐最准预言家/反向明灯/群体倾向/AI点评数据。
design:
  architecture:
    framework: react
  styleKeywords:
    - Glassmorphism
    - Warm amber accents
    - Group chat card
    - Rounded corners
    - Chinese typography
  fontSystem:
    fontFamily: PingFang SC
    heading:
      size: 20px
      weight: 900
    subheading:
      size: 13px
      weight: 700
    body:
      size: 12px
      weight: 500
  colorSystem:
    primary:
      - "#F59E0B"
      - "#FBBF24"
      - "#D97706"
    background:
      - "#FFFFFF"
      - "#F8FAFC"
      - "#FFFBEB"
    text:
      - "#0F172A"
      - "#475569"
      - "#64748B"
    functional:
      - "#10B981"
      - "#EF4444"
      - "#3B82F6"
todos:
  - id: enhance-report-service
    content: 增强 post_match_report_service.ts：PostMatchReport 新增 exactPredictor/darkHorse/darkHorseStreak/popularOpinion 字段，generatePostMatchReport() 补齐最准预言家/反向明灯/群体倾向计算逻辑，调用AI生成 aiCommentary
    status: completed
  - id: add-battle-reports-api
    content: 在 routes/matches.ts 新增 GET /api/battle-reports 分页接口，返回全部已结算比赛完整战报列表
    status: completed
    dependencies:
      - enhance-report-service
  - id: create-battle-report-card
    content: 使用 [skill:Impeccable（前端设计工具集）] 新建 BattleReportCard.tsx 组件，支持精简/完整两种模式，渲染比分/最大赢家/最惨玩家/最准预言家/反向明灯/AI点评
    status: completed
  - id: integrate-home-tab
    content: 在 HomeTab.tsx 群内动态 section 上方插入战报卡片，调用 /api/matches/recent-reports?limit=1 获取最近1场，点击跳转详情页战报Tab
    status: completed
    dependencies:
      - create-battle-report-card
      - add-battle-reports-api
  - id: add-report-tab-detail
    content: 在 MatchDetailPage.tsx 新增 'report' Tab（TAB_META + MatchDetailTab 类型），仅在 FT/AET/PEN 状态显示，渲染完整 BattleReportCard
    status: completed
    dependencies:
      - create-battle-report-card
  - id: create-wall-and-route
    content: 新建 BattleReportWall.tsx 页面 + 修改 App.tsx（PageTab/drawerItems/懒加载/路由），展示全部战报时间线
    status: completed
    dependencies:
      - create-battle-report-card
      - add-battle-reports-api
---

## 产品概述

在项目中新增"赛后群战报"功能，在比赛结算后自动生成一份朋友群风格的战报卡片，包含最大赢家、最惨玩家、最准预言家、反向明灯和AI趣味点评。战报在三个位置展示：首页最近1场卡片、比赛详情页战报Tab、导航抽屉战报墙页面。

## 核心功能

- **首页战报卡片**：在"群内动态"模块上方，展示最近结算的1场比赛的战报精简卡片（标题+比分+最大赢家+AI点评摘要），点击可跳转详情页战报Tab
- **比赛详情页战报Tab**：新增"战报"Tab（仅在比赛已结算后显示），展示该场比赛的完整战报（最大赢家、最惨玩家、最准预言家、反向明灯、AI点评全文）
- **战报墙页面**：导航抽屉新增入口，按时间倒序展示所有已结算比赛的完整战报列表，支持滚动浏览
- **AI点评**：调用现有AI服务生成趣味点评，包含群体倾向分析（如"70%看好荷兰"）

## 技术栈

- 后端：Node.js + TypeScript + Express（已有）
- 前端：React + TypeScript + Tailwind CSS + motion/react（已有）
- AI：复用现有 DeepSeek→Mimo→Gemini 降级链
- 数据存储：db.postMatchReports（已有）

## 实施策略

### 后端改动（3处）

**1. 增强 PostMatchReport 类型和 generatePostMatchReport()**

- 新增字段：`exactPredictor`（最准预言家，猜中CORRECT_SCORE者）、`darkHorse`（反向明灯，连败最多者）、`darkHorseStreak`（连续猜错场次）、`popularOpinion`（群体倾向文本如"70%看好荷兰"）
- 填充已有但为空的 `bestPredictor` 字段（标记为猜中比分的最准预言家）
- 实现逻辑：遍历该场 predictions，找 `market=CORRECT_SCORE && status=WON` 的玩家 → exactPredictor；遍历参与用户的近期（按时间排序最近20条）predictions 计算连败 → darkHorse；统计各选项人数 → popularOpinion
- 调用现有 `generateAIContent()` 模式（复用 `buildLeaderboardPrompt` 的 structured JSON prompt 方式）生成 aiCommentary，失败则使用模版兜底

**2. 新增战报墙 API**

- `GET /api/battle-reports?limit=20&offset=0`：返回分页的全部已结算比赛的完整战报列表（按结算时间倒序）

**3. 赛后战报懒加载触发**

- 保持现有模式：首次请求时懒生成，结算完成后通过 API 请求触发

### 前端改动（4处）

**4. 新建 BattleReportCard 组件**

- 可复用的战报卡片组件，接收 `PostMatchReport` 数据
- 精简模式（首页用）：标题+比分+最大赢家一行+AI点评首句
- 完整模式（详情页用）：全部字段渲染，类群聊卡片风格
- 使用项目现有设计语言：rounded-[28px]、gradient bg、shadow、中文排版

**5. 首页 HomeTab 集成**

- 在"群内动态"section（第667行）前插入战报卡片 section
- 调用 `/api/matches/recent-reports?limit=1` 获取最近1场
- 无已结算比赛时不显示
- 点击卡片跳转到 `match-detail` 页面并定位到 `report` Tab

**6. 比赛详情页新增战报Tab**

- `MatchDetailTab` 类型新增 `'report'`
- `TAB_META` 新增 `{ key: 'report', label: '战报', icon: <Trophy /> }`
- 仅在比赛状态为 FT/AET/PEN 时显示该Tab
- Tab内容渲染完整 BattleReportCard

**7. 新建 BattleReportWall 页面 + App.tsx 路由**

- 新建 `src/components/BattleReportWall.tsx`：懒加载页面，调用 `/api/battle-reports` 获取全部战报列表
- `PageTab` 新增 `'battle-reports'`
- `drawerItems` 新增"战报墙"条目
- 添加懒加载 import 和路由渲染

## 架构设计

```
数据流：
  结算完成 → 首次API请求 → generatePostMatchReport()
    ├── 统计最大赢家/最惨玩家（已有）
    ├── 计算最准预言家/反向明灯/群体倾向（新增）
    ├── 调用AI生成 aiCommentary（新增）
    └── 存入 db.postMatchReports

前端展示：
  HomeTab ← GET /api/matches/recent-reports?limit=1 → BattleReportCard(精简)
  MatchDetailPage Tab:report ← GET /api/matches/:id/post-report → BattleReportCard(完整)
  BattleReportWall ← GET /api/battle-reports → BattleReportCard 列表
```

## 目录结构

```
src/
├── types.ts                                          # [MODIFY] 无需改动（PostMatchReport 在 service 内定义）
├── server/
│   ├── services/
│   │   └── post_match_report_service.ts              # [MODIFY] 增强类型+生成逻辑+AI点评
│   └── routes/
│       └── matches.ts                               # [MODIFY] 新增 GET /api/battle-reports
├── components/
│   ├── BattleReportCard.tsx                          # [NEW] 可复用的战报卡片组件
│   ├── BattleReportWall.tsx                          # [NEW] 战报墙页面
│   ├── HomeTab.tsx                                   # [MODIFY] 群内动态上方插入战报卡片
│   └── MatchDetailPage.tsx                           # [MODIFY] 新增战报Tab + TAB_META
└── App.tsx                                           # [MODIFY] PageTab/drawerItems/懒加载/路由
```

## 设计风格

延续项目现有的轻量玻璃质感和群聊氛围。战后战报卡片采用暖色调渐变（amber/gold系），与比赛结束的"揭晓"感呼应，同时保留项目整体 slate 底色 + 白色卡片 + rounded-3xl 的语言一致性。

## 战报卡片设计（BattleReportCard）

### 精简模式（首页）

- 卡片容器：rounded-[28px] border border-slate-200 bg-white shadow-lg，顶部左侧点缀冠军奖杯图标
- 标题行：比赛比分大号加粗（text-2xl font-black），下方队名小字
- 快速信息行：一行展示"最大赢家：阿强 +3200 PTS"，绿色高亮积分
- AI点评首句：底部淡色区域，斜体引号样式，最多2行截断
- 整体高度控制在紧凑的 140-160px

### 完整模式（详情页Tab / 战报墙）

- 与精简模式同框框架，展开全部字段
- 4行数据网格（2列）：最大赢家 | 最惨玩家 / 最准预言家 | 反向明灯
- 每行数据：左侧 emoji 或迷你标签，右侧用户名+积分变动（绿色+/红色-）
- AI点评区：灰色圆角底框，左上角"AI 点评"标签，正文正常行距排版
- 群体倾向短条：若存在 popularOpinion，展示为一行小型 pill 标签

## 战报墙页面

- 顶部标题栏："战报墙" + 已结算比赛计数
- 纵向滚动列表，每张卡片之间有 12px 间距
- 空状态：无已结算比赛时展示温和提示

## 交互

- 首页卡片整体可点击，跳转到比赛详情页战报Tab
- 战报墙卡片整体可点击，同样跳转
- Tab 切换使用项目已有的 pill 按钮模式

## 技能扩展

### Skill

- **Impeccable（前端设计工具集）**
- 用途：为 BattleReportCard 组件生成高品质的卡片 UI 设计，确保视觉风格与项目现有 glassmorphism 语言一致，同时创造独特的"群聊战报"视觉个性
- 预期结果：产出 BattleReportCard.tsx 的完整代码，包含精简/完整两种模式、Tailwind CSS 样式、动画微交互

- **前端开发**
- 用途：实现 BattleReportWall 页面、HomeTab 集成、MatchDetailPage Tab 集成、App.tsx 路由改动
- 预期结果：所有前端改动文件完整实现，热更新兼容，零 lint 错误