# 首页“今晚焦点战”卡片 UI 补充需求

## 1. 目标

在首页顶部增加一个高质量的“今晚焦点战”卡片组件，用于展示当天最值得关注的一场比赛。

该组件需要参考![ChatGPT Image 2026年6月6日 11_57_54](H:\世界杯娱乐项目\klpk-cgt-s-Org\ChatGPT Image 2026年6月6日 11_57_54.png)视觉风格，但不能直接把整张图片当背景贴上去。需要用真实前端组件实现，方便后续绑定真实比赛数据。

背景的素材可以直接用以下现成的素材：

![ChatGPT Image 2026年6月6日 12_06_26](H:\世界杯娱乐项目\klpk-cgt-s-Org\ChatGPT Image 2026年6月6日 12_06_26.png)

------

## 2. 视觉风格

整体风格要求：

- 深蓝色体育科技风
- 世界杯比赛预告卡片
- 玻璃拟态 + HUD 科技边框
- 体育场灯光氛围
- 蓝色 / 青色霓虹光效
- 少量橙色用于热门、指数数字和强调信息
- 视觉丰富，但信息层级清晰
- 手机端优先，同时适配桌面端



------

## 3. 卡片尺寸与布局

### 3.1 外层容器

卡片放在首页顶部。

移动端：

```text
宽度：100%
圆角：24px
内边距：16px
最小高度：520px
```

桌面端：

```text
最大宽度：960px
居中显示
圆角：28px
内边距：24px
```

外层样式建议：

```text
background: 深蓝渐变
border: 1px cyan/blue 半透明边框
box-shadow: 蓝色外发光 + 内部暗光
overflow: hidden
position: relative
```

------

## 4. 卡片结构

卡片从上到下分为 7 个区域：

1. 顶部赛事标签区
2. 大标题区
3. 双方球队对阵区
4. 比赛基础信息区
5. 双方数据芯片区
6. 竞猜指数区
7. CTA + 底部快捷入口区

------

## 5. 顶部赛事标签区

顶部中间显示：

```text
🏆 2026 世界杯
```

右上角显示热门标签：

```text
🔥 热门
```

要求：

- “2026” 使用青蓝色高亮
- “世界杯” 使用白色
- 热门标签使用橙红渐变
- 标签带轻微发光和边框

------

## 6. 大标题区

标题文本：

```text
今晚焦点战
```

要求：

- 居中
- 大字号
- 字重 900
- 金属白 / 冰蓝渐变效果
- 有轻微蓝色阴影
- 移动端字号约 40px
- 桌面端字号约 64px
- 不要使用图片文字，必须是真实文本

Tailwind 参考：

```text
text-5xl md:text-7xl font-black tracking-tight
bg-gradient-to-b from-white via-slate-100 to-cyan-200
bg-clip-text text-transparent
drop-shadow
```

------

## 7. 双方球队对阵区

### 7.1 数据结构

组件接收数据：

```ts
type FocusMatch = {
  id: string;
  stage: string;
  groupName?: string;
  startTimeBeijing: string;
  countdownText?: string;
  homeTeam: {
    name: string;
    flagCode?: string;
    crestUrl?: string;
    primaryColor?: string;
    stats?: {
      goals?: number;
      avgGoals?: number;
      worldRank?: number;
    };
  };
  awayTeam: {
    name: string;
    flagCode?: string;
    crestUrl?: string;
    primaryColor?: string;
    stats?: {
      goals?: number;
      avgGoals?: number;
      worldRank?: number;
    };
  };
  odds?: {
    homeWin?: number;
    draw?: number;
    awayWin?: number;
  };
};
```

### 7.2 球队展示

左右各一个球队模块：

每个球队模块包含：

- 球队盾牌 / 国旗 / 默认队徽
- 球队中文名
- 数据芯片

如果 `crestUrl` 不存在，使用 `flag-icons` 根据 `flagCode` 显示国旗。

如果 `flagCode` 也不存在，显示默认盾牌图标。

### 7.3 中间 VS

中间显示大型：

```text
VS
```

要求：

- 金属感
- 蓝橙渐变
- 居中
- 有轻微发光
- 不要过度复杂

------

## 8. 比赛基础信息区

在球队名称下方显示：

```text
北京时间 03:00
小组赛 A组
```

要求：

- 使用小图标：
  - 时钟图标
  - 足球 / 赛事图标
- 时间数字使用青蓝色突出
- 小组赛信息使用浅灰白色

------

## 9. 倒计时模块

显示：

```text
距离开赛
06 : 42 : 18
时  分  秒
```

要求：

- 使用独立 HUD 小卡片
- 数字使用等宽字体
- 蓝色边框
- 半透明深蓝背景
- 支持没有倒计时时隐藏

倒计时不需要第一版实时精确到秒，可以先根据当前时间和开赛时间前端计算。

------

## 10. 双方数据芯片区

每队下方展示三个数据芯片。

法国示例：

```text
进球 12
场均 2.00
世界排名 3
```

德国示例：

```text
进球 11
场均 1.83
世界排名 12
```

样式要求：

- 小圆角卡片
- 深蓝透明背景
- 青蓝边框
- 数值使用橙色
- 图标使用浅色
- 移动端可以横向滚动或缩小

------

## 11. 竞猜指数区

标题：

```text
竞猜指数
```

左侧有柱状图图标和 info 图标。

右侧展示三个指数卡片：

```text
主胜 1.67
平局 3.50
客胜 5.20
```

要求：

- 不能出现“赔率”“下注”等字样
- 数字大而清晰
- 主胜和客胜数字使用橙色
- 平局数字使用青蓝色
- 三个卡片看起来可以点击，但第一版点击后跳转到比赛详情页或竞猜页

------

## 12. CTA 按钮

按钮文本：

```text
查看详情
```

点击行为：

```text
跳转到 /matches/[id]
```

样式要求：

- 蓝色渐变
- 中间高亮
- 右侧箭头
- 鼠标 hover 时有轻微发光
- 移动端按钮高度不小于 48px

------

## 13. 底部快捷入口区

底部显示 4 个快捷入口：

```text
赛程
阵容
实时比分
排行榜
```

每个入口包含：

- 图标
- 标题
- 小描述

示例：

```text
赛程 / 完整赛程
阵容 / 首发预测
实时比分 / 即时更新
排行榜 / 球队排名
```

要求：

- 不要太抢眼
- 作为卡片底部信息条
- 移动端可 4 列，也可横向滚动
- 使用细分割线

------

## 14. 背景装饰

卡片背景需要包含：

- 深蓝渐变
- 体育场氛围
- 泛光灯效果
- 球场草地线条
- 少量粒子点
- 细 HUD 边框线

实现方式：

不要使用真实体育场图片。
使用 CSS 渐变、伪元素、径向光斑和简单线条实现。

可使用：

```css
radial-gradient
linear-gradient
absolute div
blur
opacity
```

------

## 15. 推荐颜色 Token

在组件中尽量统一使用这些颜色：

```ts
const focusCardTheme = {
  bgDark: "#050B1F",
  bgPanel: "#071633",
  borderBlue: "#1D9BF0",
  cyan: "#22D3EE",
  blue: "#2563EB",
  orange: "#F59E0B",
  redOrange: "#F97316",
  textPrimary: "#F8FAFC",
  textSecondary: "#CBD5E1",
  muted: "#64748B",
};
```

Tailwind 颜色方向：

```text
slate-950
blue-950
cyan-400
sky-400
orange-400
amber-400
white
slate-300
```

------

## 16. 响应式要求

移动端：

- 卡片宽度 100%
- 球队队徽可以缩小
- 标题不换行优先，必要时缩小字号
- 数据芯片可以两行排列
- 指数区三列展示
- 底部入口四列或横向滑动

桌面端：

- 卡片最大宽度 960px
- 左右球队更宽
- 中间 VS 和倒计时更突出
- 底部入口横向展开

------

## 17. 图标建议

使用 `lucide-react` 图标库。

建议使用：

```text
Trophy
Flame
Clock
CalendarDays
Shirt
Tv
BarChart3
Info
Target
Activity
Medal
ChevronRight
```

------

## 18. 数据兜底

如果没有真实数据，组件使用 mock 数据：

```ts
const mockFocusMatch = {
  id: "demo-france-germany",
  stage: "小组赛",
  groupName: "A组",
  startTimeBeijing: "03:00",
  countdownText: "06 : 42 : 18",
  homeTeam: {
    name: "法国",
    flagCode: "fr",
    stats: {
      goals: 12,
      avgGoals: 2.0,
      worldRank: 3,
    },
  },
  awayTeam: {
    name: "德国",
    flagCode: "de",
    stats: {
      goals: 11,
      avgGoals: 1.83,
      worldRank: 12,
    },
  },
  odds: {
    homeWin: 1.67,
    draw: 3.5,
    awayWin: 5.2,
  },
};
```

------

## 19. 组件拆分建议

不要把所有代码写在一个超长组件里。

建议拆分：

```text
FocusMatchCard
FocusMatchHeader
TeamPanel
MatchInfo
CountdownBox
TeamStatsChips
OddsIndexBar
FocusCardFooterNav
```

------

## 20. 验收标准

完成后需要满足：

1. 首页能看到“今晚焦点战”大卡片。
2. 视觉风格接近参考图。
3. 所有中文文字是真实 HTML 文本，不是图片。
4. 队伍、时间、指数、数据可以通过 props 传入。
5. 移动端显示正常。
6. 桌面端居中显示，最大宽度合理。
7. 没有使用官方 FIFA Logo 或受版权保护的队徽。
8. 没有出现“赔率、下注、博彩、盈利、提现”等字样。
9. 点击“查看详情”可以跳转比赛详情页。
10. 没有真实数据时可以使用 mock 数据正常展示。

------

# 四、给 Codex 的直接执行提示词

你可以直接复制下面这段给 Codex：

请基于项目现有 Next.js + Tailwind CSS 技术栈，实现首页“今晚焦点战”组件。

参考图放在：

```text
/public/design/focus-match-card-reference.png
```

请不要直接把参考图作为背景图片使用，而是用真实 HTML、Tailwind CSS、lucide-react 图标和 CSS 渐变实现一个可复用的前端组件。

组件要求：

1. 创建 `/components/home/FocusMatchCard.tsx`。
2. 创建必要的子组件：
   - `FocusMatchHeader`
   - `TeamPanel`
   - `CountdownBox`
   - `OddsIndexBar`
   - `FocusCardFooterNav`
3. 在首页引入并展示该组件。
4. 使用 mock 数据展示：
   - 法国 VS 德国
   - 北京时间 03:00
   - 小组赛 A组
   - 法国：进球 12、场均 2.00、世界排名 3
   - 德国：进球 11、场均 1.83、世界排名 12
   - 竞猜指数：主胜 1.67、平局 3.50、客胜 5.20
5. 组件必须支持后续通过 props 接入真实比赛数据。
6. 视觉风格要求：
   - 深蓝体育科技风
   - 体育场灯光氛围
   - 玻璃拟态卡片
   - 青蓝色霓虹边框
   - 少量橙色强调
   - 标题“今晚焦点战”要有强视觉冲击
   - CTA 按钮“查看详情”要明显
7. 禁止出现：
   - 赔率
   - 下注
   - 博彩
   - 充值
   - 提现
   - 返奖
8. 页面文案统一使用：
   - 竞猜指数
   - 娱乐积分
   - 查看详情
9. 移动端优先，桌面端最大宽度 960px 居中。
10. 所有中文文字必须是真实文本，不能做成图片。
11. 如果项目没有 `lucide-react`，请安装并使用。
12. 如果项目已经有 `flag-icons`，用国旗；如果没有，就先用通用盾牌样式占位，不要使用真实官方队徽。

实现完成后，请确保：

```bash
npm run dev
npm run lint
npm run build
```

可以正常通过。



------

# 六、为了稳定，还要告诉 Codex “不要做什么”

这段也很重要，可以加到提示词最后：

```markdown
## 不要做

- 不要直接使用参考图作为整张背景。
- 不要生成不可维护的大段绝对定位代码。
- 不要把中文标题做成图片。
- 不要使用真实 FIFA 官方 Logo。
- 不要使用真实国家队官方队徽。
- 不要写死所有数据到 JSX 中，应使用 mock 数据对象。
- 不要引入复杂动画库。
- 不要做 3D canvas。
- 不要使用外部图片链接。
- 不要让用户访问页面时请求第三方 API。
```

## 

第一步只做：

> **静态 FocusMatchCard 组件 + mock 数据 + 移动端适配**



![ChatGPT Image 2026年6月6日 11_57_54](H:\世界杯娱乐项目\klpk-cgt-s-Org\ChatGPT Image 2026年6月6日 11_57_54.png)![ChatGPT Image 2026年6月6日 12_06_26](H:\世界杯娱乐项目\klpk-cgt-s-Org\ChatGPT Image 2026年6月6日 12_06_26.png)