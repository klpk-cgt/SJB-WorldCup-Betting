---
name: homepage-sentiment-activity-reorder
overview: 首页新增"群内倾向"卡片（焦点战投注分布三条进度条），将"群内动态"移到底部改为默认2条可展开20条的胶囊按钮交互。
todos:
  - id: sentiment-fetch
    content: 在 HomeTab.tsx 新增 sentiment state 和 useEffect，调用 GET /api/matches/:id 获取焦点战投注倾向数据
    status: pending
  - id: sentiment-card
    content: 在 AIPredictionCard 下方插入群内倾向卡片 JSX（三条 emerald/slate/cyan 进度条，与 MatchDetailPage 样式一致）
    status: pending
    dependencies:
      - sentiment-fetch
  - id: activity-reorder
    content: 将群内动态卡片从当前位置（第 483 行）移动到问答模块下方（第 638 行之后），添加 activityExpanded state 和胶囊展开/收起按钮，默认 limit=2 展开后 limit=20
    status: pending
  - id: verify-test
    content: 重启开发服务器，本地预览验证群内倾向数据展示和群内动态展开交互是否正常
    status: pending
    dependencies:
      - sentiment-card
      - activity-reorder
---

## 用户需求

### 1. 首页新增"群内倾向"模块

- 位置：放在"今日AI娱乐预测"卡片下方
- 内容：展示焦点战（focusMatch）的群友投注倾向
- 数据：主胜/平局/客胜 三条百分比进度条
- 样式：与 MatchDetailPage 比赛详情页的 sentiment 模块保持一致
- 数据来源：复用 `GET /api/matches/:id` 接口的 `sentiment` 字段，用 `unifiedFeaturedMatch.id` 获取

### 2. "群内动态"调整

- 默认仅显示 2 条动态
- 添加胶囊样式展开按钮，点击后展开全部 20 条
- 展开后按钮变为"收起"字样
- 整个卡片移到首页最底部（每日足球问答模块下方）

## 技术方案

### 实现策略

所有改动集中在 `src/components/HomeTab.tsx` 单一文件中，不新增组件文件。利用现有 API 和组件能力实现：

- **群内倾向**：新增 `sentiment` state，在 `useEffect` 中调用 `GET /api/matches/:id` 获取焦点战投注分布数据，UI 直接参考 MatchDetailPage 第 441-458 行实现
- **群内动态展开**：ActivityFeed 组件已有 `limit` prop，新增 `activityExpanded` boolean state 控制 `limit={expanded ? 20 : 2}`

### 关键数据结构

```ts
// 新增 state
const [sentiment, setSentiment] = useState<{ home: number; draw: number; away: number } | null>(null);
const [sentimentLoading, setSentimentLoading] = useState(true);
const [activityExpanded, setActivityExpanded] = useState(false);

// API 返回的 sentiment 结构（来自 matches.ts 第 148-155 行）
// { home: number, draw: number, away: number }  // 百分比整数，无投注时默认 { home: 45, draw: 10, away: 45 }
```

### 修改文件

#### `src/components/HomeTab.tsx`（唯一修改文件）

**修改点 1**：新增 sentiment 数据获取 useEffect（在现有 useEffect 之后）

```
useEffect(() => {
  if (!unifiedFeaturedMatch?.id) return;
  setSentimentLoading(true);
  apiRequest(`/api/matches/${unifiedFeaturedMatch.id}`)
    .then((data) => setSentiment(data.sentiment || null))
    .catch(() => setSentiment(null))
    .finally(() => setSentimentLoading(false));
}, [unifiedFeaturedMatch?.id]);
```

**修改点 2**：在 AIPredictionCard（第 481 行）之后插入 sentiment 卡片 JSX

```
{sentiment && focusMatch && !sentimentLoading && (
  <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
    <div className="flex items-center gap-2 mb-4">
      <Users className="h-4.5 w-4.5 text-cyan-500" />
      <h3 className="text-sm font-black text-slate-900">群内倾向</h3>
      <span className="text-[10px] font-semibold text-slate-400">
        焦点战
      </span>
    </div>
    <div className="space-y-3">
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-600">
          <span>{focusMatch.homeTeam?.name} 支持率</span>
          <span>{sentiment.home}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${sentiment.home}%` }} />
        </div>
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-600">
          <span>平局支持率</span>
          <span>{sentiment.draw}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-slate-500 transition-all" style={{ width: `${sentiment.draw}%` }} />
        </div>
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-600">
          <span>{focusMatch.awayTeam?.name} 支持率</span>
          <span>{sentiment.away}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-cyan-500 transition-all" style={{ width: `${sentiment.away}%` }} />
        </div>
      </div>
    </div>
  </section>
)}
```

**修改点 3**：将群内动态卡片（第 483-503 行）移动到第 638 行之后（问答 section 结束之后），并修改为可展开模式

- 移除 `limit={6}` → 改为 `limit={activityExpanded ? 20 : 2}`
- 在活动列表下方添加胶囊展开/收起按钮
- 卡片整体移到问答模块下方（`</section>` 即第 638 行之后、`<AnimatePresence>` 即第 640 行之前）

**修改点 4**：引入 `Users` 图标（lucide-react 已有此图标，需在 import 中添加）

### 性能考虑

- sentiment 数据仅在 `unifiedFeaturedMatch.id` 变化时请求，无额外轮询
- API 复用现有端点，零后端改动
- ActivityFeed 渲染 list 已用 useMemo 切片，展开 20 条无性能问题
- 条件渲染避免无数据时显示空卡片