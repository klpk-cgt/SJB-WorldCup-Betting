# 资料页重构：徽章/道具图标分级显示 + 交互增强

## Summary

分两步执行：**第一步**创建独立HTML预览原型，展示4种稀有度徽章的视觉差异（光效/边框/尺寸/动画）和道具卡设计，供用户确认效果；**第二步**用户批准后将原型效果移植到React组件实施。

## 实施流程

### Step 1: 创建HTML预览原型（先执行，供用户确认效果）

**新建文件**: `prototype/profile-badges-preview.html`

独立的HTML文件，内联CSS+JS，无需构建，浏览器直接打开即可预览。展示以下效果：

1. **4种稀有度徽章卡片对比**
   - Legendary（金色渐变边框 + 脉冲光效动画 + 56px图标 + 金色光晕背景）
   - Epic（紫色渐变边框 + 微光呼吸 + 48px图标 + 紫色背景）
   - Rare（青色边框 + 44px图标 + 青色淡背景）
   - Common（灰色边框 + 40px图标 + 灰色背景）
   - 每种展示"已解锁"和"未解锁（灰度+锁图标）"两种状态

2. **徽章网格布局**
   - 2列/3列响应式网格
   - 每个卡片：图标 + 名称 + 稀有度标签 + 进度条
   - 点击卡片展开详情弹窗（底部抽屉）

3. **道具卡展示**
   - 4种道具卡（免亏🛡️/双倍⚡/反悔↩️/保底🛟）
   - 渐变背景 + 数量角标 + 悬停tooltip

4. **稀有度动效演示**
   - Legendary 脉冲动画
   - Epic 微光呼吸
   - 尊重 prefers-reduced-motion

原型使用真实徽章数据（从badge_service.ts的35个徽章中取样展示），图标用emoji模拟。

### Step 2: 用户确认效果后，移植到React组件实施

用户确认HTML原型效果后，再执行以下实施：

#### Part A: 新建统一图标渲染组件 BadgeIcon
**新建文件**: `src/components/profile/BadgeIcon.tsx`
- 按稀有度分级渲染（Legendary/Epic用CSS光效，Rare/Common用emoji+色环）
- 图标优先级：PNG（如有且非重复）→ emoji fallback
- 未解锁：灰度滤镜 + 锁图标角标

#### Part B: 新建徽章详情弹窗 BadgeDetailModal
**新建文件**: `src/components/profile/BadgeDetailModal.tsx`
- 底部抽屉式弹窗，移动端友好
- 大图标(96px) + 完整描述 + 进度详情 + 解锁时间
- 稀有度专属动效

#### Part C: 重构 BadgeCard 组件
**修改文件**: `src/components/MeTab.tsx` L972-1004
- 用BadgeIcon替代ProfileImageIcon
- 清理重复映射（BADGE_ICON_SRC）
- 稀有度卡片样式（渐变边框/阴影）
- 添加onClick打开弹窗
- 简化卡片信息，响应式grid-cols-2 sm:grid-cols-3

#### Part D: 重构道具卡展示
**修改文件**: `src/components/MeTab.tsx` L1006+
- 类型安全修复（any → UserCardInventory）
- 清理大小写三重映射
- 视觉升级（渐变背景 + 数量角标 + tooltip）

#### Part E: 稀有度动效CSS
**修改文件**: `src/components/MeTab.tsx` METAB_CSS区域
- legendary-pulse / epic-glow 关键帧动画
- prefers-reduced-motion 支持

## Current State Analysis

### 资料页现状
- 主组件：[MeTab.tsx](file:///h:/世界杯娱乐项目/back/klpk-cgt-s-Org%20v2/src/components/MeTab.tsx)（1093行）
- 4个Tab：overview(总览) / reports(战报) / badges(徽章) / items(道具)

### 徽章系统现状
- **总数**: 35个徽章（定义在 [badge_service.ts](file:///h:/世界杯娱乐项目/back/klpk-cgt-s-Org%20v2/src/server/badge_service.ts)）
- **稀有度分布**: common 4个 / rare 14个 / epic 11个 / legendary 6个
- **图标映射**: `BADGE_ICON_SRC`（MeTab.tsx L69-89）仅配了19个key，16个徽章无PNG只能显示裸emoji
- **重复映射**: 4个连红徽章共用1张PNG、4个不同语义徽章共用 big-win-trophy.png
- **稀有度视觉**: 仅小标签颜色差异（slate/cyan/violet/amber），边框/阴影/尺寸完全相同

### 道具系统现状
- **4种道具卡**: NO_LOSS(免亏🛡️) / DOUBLE(双倍⚡) / REGRET(反悔↩️) / FLOOR(保底🛟)
- 已有4个PNG图标，`CARD_ICON_SRC` 有大小写三重映射（历史遗留）

### 闲置资源
- `public/assets/player-profile/` 下有5个未使用的badge SVG：badge-underdog/target/streak/platinum + golden-boot
- `public/profile-icons/` 有16个PNG（部分可用）

### BadgeCard 当前结构（MeTab.tsx L972-1004）
- `grid-cols-2` 网格布局
- 图标 40x40 + 标签 + 稀有度标签 + 极性标签 + 描述(line-clamp-2) + 进度条
- **无点击交互**，所有信息硬塞卡片，长label被truncate

## Proposed Changes

### Part A: 新建统一图标渲染组件 BadgeIcon

**新建文件**: `src/components/profile/BadgeIcon.tsx`

按稀有度分级渲染图标的统一组件：

```typescript
interface BadgeIconProps {
  badge: AchievementBadgeSummary;
  size?: number;        // 基础尺寸
  unlocked: boolean;
  onClick?: () => void; // 点击打开详情
}
```

**分级渲染策略**（不依赖额外SVG资源，用CSS光效差异化）：

| 稀有度 | 图标来源 | 视觉效果 | 尺寸 |
|--------|---------|---------|------|
| **Legendary** | PNG(如有)→emoji | 金色渐变边框 + 脉冲光效动画 + 金色背景光晕 | 56px |
| **Epic** | PNG(如有)→emoji | 紫色渐变边框 + 微光效 + 紫色背景 | 48px |
| **Rare** | PNG(如有)→emoji | 青色实线边框 + 青色淡背景 | 44px |
| **Common** | emoji | 灰色边框 + 灰色淡背景 | 40px |

**图标优先级**: PNG（如有且非重复映射）→ emoji fallback

**未解锁状态**: 灰度滤镜(opacity-50 + grayscale) + 锁图标角标

### Part B: 新建徽章详情弹窗 BadgeDetailModal

**新建文件**: `src/components/profile/BadgeDetailModal.tsx`

点击徽章卡片时弹出详情弹窗（底部抽屉式，移动端友好）：

- **大图标展示**（96px，带稀有度光效）
- **徽章名称**（大字号）
- **稀有度标签** + **极性标签** + **分类标签**
- **完整描述**（不截断）
- **进度条**（大尺寸，含当前/目标数值）
- **解锁状态**：已解锁显示解锁时间，未解锁显示获取条件
- **稀有度专属动效**：Legendary 闪光、Epic 微光

**交互**：点击遮罩或关闭按钮关闭，支持滑动手势关闭

### Part C: 重构 BadgeCard 组件

**修改文件**: [src/components/MeTab.tsx](file:///h:/世界杯娱乐项目/back/klpk-cgt-s-Org%20v2/src/components/MeTab.tsx) L972-1004

**改动点**：

1. **替换图标渲染**：用 `BadgeIcon` 组件替代 `ProfileImageIcon`，自动按稀有度分级
2. **清理重复映射**：删除 `BADGE_ICON_SRC` 中重复的映射（如4个连红共用1张），改为每类用独立emoji
3. **稀有度卡片样式**：
   - Legendary: `border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-amber-200/50 shadow-lg`
   - Epic: `border-violet-300 bg-gradient-to-br from-violet-50 to-purple-50 shadow-violet-200/40 shadow-md`
   - Rare: `border-cyan-200 bg-cyan-50/50`
   - Common: `border-slate-200 bg-slate-50`
4. **添加点击交互**：`onClick` 打开 `BadgeDetailModal`
5. **简化卡片信息**：卡片只显示图标+名称+稀有度标签+进度条，完整信息移到弹窗
6. **响应式布局**：`grid-cols-2` → `grid-cols-2 sm:grid-cols-3`（减少拥挤）

### Part D: 重构道具卡展示 CardInventoryGrid

**修改文件**: [src/components/MeTab.tsx](file:///h:/世界杯娱乐项目/back/klpk-cgt-s-Org%20v2/src/components/MeTab.tsx) L1006+

**改动点**：

1. **类型安全修复**：`cardInventory: any` → `cardInventory: UserCardInventory | null`
2. **清理大小写三重映射**：`CARD_ICON_SRC` 统一用大写key，删除 `no_loss`/`'no-loss'` 等冗余
3. **道具卡视觉升级**：
   - 卡片增加渐变背景（按 tone 字段）
   - 图标增加稀有度光效（道具统一为 rare 级光效）
   - 数量角标（右上角显示拥有数量）
4. **道具详情**：点击道具卡显示简短 tooltip（道具效果说明）

### Part E: 稀有度动效 CSS

**修改文件**: [src/components/MeTab.tsx](file:///h:/世界杯娱乐项目/back/klpk-cgt-s-Org%20v2/src/components/MeTab.tsx) 的 `METAB_CSS` 区域

新增 CSS 动画：
- `@keyframes legendary-pulse`：金色脉冲光晕（legendary 徽章专用）
- `@keyframes epic-glow`：紫色微光呼吸（epic 徽章专用）
- `.badge-legendary`：应用脉冲动画
- `.badge-epic`：应用微光动画

动效尊重 `prefers-reduced-motion`：用户开启减弱动画时禁用脉冲/闪光。

## Assumptions & Decisions

1. **不生成新SVG资源**：利用CSS光效/动画实现稀有度差异化，避免额外设计工作量。已有PNG保留使用，无PNG的用emoji
2. **不删除旧 achievements.ts**：虽然旧版6徽章已弃用，但避免本次重构范围扩大，仅在前端不引用
3. **弹窗用底部抽屉**：移动端友好，与现有 TeamDetailDrawer 风格一致
4. **道具卡不增加详情弹窗**：道具信息量少（仅4种），用tooltip足够
5. **不修改后端**：badge_service.ts 和 prediction_card_service.ts 不变，仅重构前端展示

## Verification Steps

1. **视觉验证**：
   - 4种稀有度徽章视觉差异明显（边框/光效/尺寸）
   - Legendary 徽章有金色脉冲动画
   - Epic 徽章有紫色微光
   - 未解锁徽章灰度+锁图标
2. **交互验证**：
   - 点击任意徽章弹出详情弹窗
   - 弹窗显示完整信息（描述不截断）
   - 点击遮罩/关闭按钮关闭弹窗
3. **道具验证**：
   - 4种道具卡正确显示图标和数量
   - 鼠标悬停显示效果说明tooltip
4. **响应式**：
   - 徽章网格在窄屏2列、宽屏3列
   - 弹窗在移动端底部抽屉、桌面居中
5. **TypeScript编译**：`npx tsc --noEmit` 无错误（修复 any 类型）
6. **无回归**：overview/reports tab 功能不受影响

## 实施顺序

1. Part A: 新建 BadgeIcon 组件（统一图标渲染）
2. Part B: 新建 BadgeDetailModal 组件（详情弹窗）
3. Part E: 添加稀有度动效 CSS
4. Part C: 重构 BadgeCard（集成 A+B+E）
5. Part D: 重构 CardInventoryGrid（类型安全+视觉升级）
6. TypeScript 编译检查 + 预览验证
