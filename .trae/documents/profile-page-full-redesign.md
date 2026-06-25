# 资料页整体美化重构计划

## Summary

将资料页（MeTab）从「功能可用但视觉扁平」升级为「玻璃态升级版」：保留现有浅色体育场背景+毛玻璃主卡的基调，强化视觉层次、稀有度动效、收益曲线图，并补齐4个tab的差异化设计。

执行分两步：
- **Step 1**：创建一个**完整资料页HTML预览原型**（覆盖Header + 4个tab），用户在浏览器中预览确认效果。
- **Step 2**：用户确认后，将原型移植到React组件，拆分MeTab.tsx为多个子组件。

## Current State Analysis

资料页位于 [src/components/MeTab.tsx](file:///h:/世界杯娱乐项目/back/klpk-cgt-s-Org%20v2/src/components/MeTab.tsx)（1093行），含4个tab：

| Tab | 当前内容 | 痛点 |
|-----|---------|------|
| Header（共用） | 92px头像+昵称+称号+积分/净收益/Lv进度条 | 装饰弱、等级条1.5px偏细、称号文案被截断 |
| overview 总览 | 2x2 StatTileLight + 徽章进度卡 + 最近战报 + 长期预测 | 统计卡同质化、无趋势箭头、视觉层次扁平 |
| reports 战报 | 结算列表 + 积分流水（纯文字） | **无图表**、与"战报"定位不符 |
| badges 徽章 | 按category分组的2列BadgeCard网格 | 稀有度区分弱（仅9px小标签）、无点击交互、无动效 |
| items 道具 | 2列道具卡 + 长线竞猜 | 道具卡视觉单薄、无卡牌感、无稀有度边框 |

**已有原型**：[prototype/profile-badges-preview.html](file:///h:/世界杯娱乐项目/back/klpk-cgt-s-Org%20v2/prototype/profile-badges-preview.html) 仅覆盖徽章+道具，浅色背景。本次需扩展为完整资料页。

**依赖可用**：recharts ^3.8.1 已在 package.json 中（战报曲线图可直接用）。

## Proposed Changes

### Step 1: 完整资料页HTML预览原型

**新建文件**：`prototype/profile-full-preview.html`

独立HTML文件，内联CSS+JS，模拟移动端（390x844）资料页完整效果。包含：

#### 1.1 Header（所有tab共用）
- 浅色体育场渐变背景（保留 metab-stadium-bg 风格）
- 毛玻璃主卡 metab-glass：
  - 92px头像（带绿色认证角标 + 等级光环）
  - 昵称 + featuredBadge 标签 + currentTitle 称号
  - 称号文案（2行 ellipsis，不截断）
  - 底部三列：当前积分 / 净收益（带↑↓趋势色） / Lv等级条（加粗2.5px + 等级徽章图标）
- 右上角装饰：奖杯+足球SVG放大（opacity 0.6，32px）

#### 1.2 Tab导航
- 4个tab：总览/战报/徽章/道具
- active状态：胶囊背景（emerald渐变）+ 图标
- inactive：白底+灰字
- 切换时fadeIn动画

#### 1.3 overview 总览
- **统计卡升级**：2x2网格，每张卡：
  - 大数字 + 趋势箭头（↑绿/↓红）+ 对比基线小字
  - 图标盒放大（44x44）+ 色彩主题（emerald/rose/amber/cyan）
  - hover上浮阴影
- **徽章进度卡**：最近3个未解锁徽章 + 进度条 + "查看全部"链接
- **最近战报卡**：前3条结算行（国旗+比分+命中标签+收益色）
- **长期预测卡**：2列锦标赛简卡

#### 1.4 reports 战报（重点升级）
- **净收益曲线图**（顶部）：
  - 用纯SVG绘制sparkline-style曲线（不依赖recharts，原型用纯SVG）
  - X轴时间、Y轴积分，渐变填充区域
  - 当前值大字标注 + 峰值/谷值标记
  - 配色：emerald渐变（正收益）/ rose渐变（负收益）
- **最近结算列表**：5条，每条=国旗emoji+比分+市场标签+命中/未中+收益
- **积分流水列表**：5条，每条=时间+类型图标+金额（+绿/-红）+余额

#### 1.5 badges 徽章（复用现有原型，优化布局）
- 顶部统计条：已解锁 X / 总数 Y + 稀有度分布mini bar
- 代表徽章高亮卡（featuredBadge，amber渐变+光晕）
- 按category分组的3列网格（移动端2列）：
  - 稀有度视觉差异（Legendary金色脉冲/Epic紫色微光/Rare青色边框/Common灰色）
  - 已解锁/未解锁状态
  - 点击弹出底部抽屉详情弹窗（复用现有原型逻辑）

#### 1.6 items 道具
- 道具卡2列网格：
  - 渐变背景（emerald/amber/rose/cyan）+ 稀有度边框
  - 大图标 + 数量角标 + 简短描述
  - 点击展示tooltip说明
- 长线竞猜strip：横向滚动卡，每卡=国旗+赛事+赔率+状态

#### 1.7 底部操作栏
- 保存战绩图（emerald渐变按钮）+ 退出登录（灰边按钮）
- 与glass风格统一

#### 1.8 全局
- 浅色背景 `linear-gradient(180deg, #f8fafc, #f1f5f9)`
- prefers-reduced-motion 支持
- 内嵌示例数据（用户「哥文达」Lv.4，10000积分）

### Step 2: React组件实施（用户确认预览后执行）

**拆分MeTab.tsx为子组件**，降低单文件复杂度：

| 新文件 | 职责 | 来源 |
|--------|------|------|
| `src/components/profile/ProfileHeader.tsx` | Header用户卡+等级+称号 | MeTab Header部分 |
| `src/components/profile/StatTile.tsx` | 升级版统计卡（趋势箭头） | StatTileLight |
| `src/components/profile/NetProfitChart.tsx` | 净收益曲线图（recharts） | 新增 |
| `src/components/profile/BadgeCard.tsx` | 稀有度分级徽章卡 | BadgeCard内联 |
| `src/components/profile/BadgeDetailModal.tsx` | 底部抽屉详情弹窗 | 新增 |
| `src/components/profile/CardInventoryGrid.tsx` | 道具卡网格（升级） | CardInventoryGrid内联 |
| `src/components/profile/ProfileTabs.tsx` | Tab导航（胶囊active） | TABS+setActiveTab |

**修改文件**：
- `src/components/MeTab.tsx`：引用新子组件，删除内联定义，保留数据加载逻辑
- `src/components/profile/profileStyles.css`：抽出METAB_CSS为独立CSS文件 + 新增稀有度动效keyframes（legendary-pulse / epic-glow）

**关键改动点**：
1. BadgeCard：4种稀有度CSS类（badge-legendary/epic/rare/common），传说级脉冲动画
2. BadgeDetailModal：底部抽屉，translateY动画，96px大图标
3. StatTile：加趋势箭头props（trend?: 'up'|'down'）+ 对比基线
4. NetProfitChart：用recharts的AreaChart + emerald/rose渐变
5. ProfileTabs：active胶囊背景 + fadeIn切换
6. 等级条：加粗为3px + 等级图标徽章

## Assumptions & Decisions

1. **视觉风格**：玻璃态升级版（用户确认），保留浅色体育场背景+毛玻璃，不改深色
2. **收益曲线**：HTML原型用纯SVG绘制（不引外部库）；React实施用recharts（已在依赖）
3. **稀有度方案**：分级混合（Legendary/Epic用动效光晕，Rare/Common用边框色）— 沿用已批准方案
4. **不破坏现有数据流**：所有API调用、useGameContext、profileSummary结构不变
5. **CSS策略**：原型内联CSS；React实施抽独立CSS文件（避免CSS modules引入复杂度，用BEM命名前缀 `profile-`）
6. **不引入新依赖**：recharts已存在，不新增其他库
7. **顺序**：必须先完成Step1 HTML预览并获用户确认，才执行Step2
8. **保留功能**：html2canvas分享卡、退出登录、管理员入口、加载更多等现有功能全部保留

## Verification Steps

### Step 1 验证
1. 在Chrome打开 `prototype/profile-full-preview.html`
2. 检查4个tab切换正常、fadeIn动画
3. 检查Header等级条、称号文案显示完整
4. 检查战报tab收益曲线图渲染
5. 检查徽章tab4种稀有度视觉差异 + 点击弹窗
6. 检查道具卡渐变+数量角标
7. 移动端390px宽度下无横向滚动
8. 截图4个tab分别发给用户确认

### Step 2 验证
1. `npm run dev` 启动dev server（端口3001）
2. 登录用户YDM，进入资料页
3. 4个tab视觉与HTML预览一致
4. 徽章点击弹窗正常、稀有度动画正常
5. 战报tab收益曲线图正常渲染
6. html2canvas分享卡功能不受影响
7. `npm run lint`（tsc --noEmit）无类型错误
8. 无控制台报错
