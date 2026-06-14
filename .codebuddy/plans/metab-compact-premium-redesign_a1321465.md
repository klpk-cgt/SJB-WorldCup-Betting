---
name: metab-compact-premium-redesign
overview: 将"我的资料"(MeTab)页面按紧凑版预览HTML重构：体育场深色头图+玻璃身份卡、极简统计卡片、双栏徽章+战报布局、旗帜对称结算行、紧凑间距全局优化。
todos:
  - id: add-font
    content: 在 index.html 添加 Bebas Neue 字体 CDN 链接
    status: completed
  - id: inject-css
    content: 在 MeTab.tsx 组件顶部注入毛玻璃、体育场背景、头像光环等CSS class
    status: completed
  - id: rewrite-header
    content: 重写身份卡区域(第377-476行)：体育场暗色背景+毛玻璃悬浮卡片+紧凑头像/名字/称号/积分
    status: completed
    dependencies:
      - inject-css
  - id: compact-stats
    content: 重写 StatTile 和统计2x2区域(第187-224行, 478-483行)：去掉进度条和副文字，极简横排布局
    status: completed
    dependencies:
      - inject-css
  - id: compact-tabnav
    content: 紧凑化Tab导航(第485-502行)：缩小字体和间距
    status: completed
  - id: dualcolumn-overview
    content: 重写总览Tab(第504-556行)：徽章进度+最近战报双栏布局，缩小间距
    status: completed
    dependencies:
      - compact-stats
      - compact-tabnav
  - id: flag-settlement
    content: 重写 SettlementRow(第658-683行)：旗帜对称布局，去掉日期和副标题
    status: completed
  - id: compact-other-tabs
    content: 收紧战报/徽章/道具Tab的间距和内边距(第559-652行)
    status: completed
    dependencies:
      - compact-tabnav
  - id: bottom-actions
    content: 在return末尾(AnimatePresence之前)添加底部操作栏(保存战绩图+退出按钮)
    status: completed
  - id: verify
    content: 重启dev服务器，本地预览验证新布局完整性、Tab切换、分享截图功能
    status: completed
    dependencies:
      - rewrite-header
      - compact-stats
      - dualcolumn-overview
      - flag-settlement
      - compact-other-tabs
      - bottom-actions
---

## 用户需求

将"我的资料"页面按紧凑版预览HTML重构为游戏化高端设计。

### 核心改动

1. **体育场暗色背景头图(280px)**：深绿到深蓝径向渐变+网格纹理，替代当前白底极淡渐变
2. **毛玻璃悬浮身份卡**：`backdrop-blur`玻璃拟态卡片，金色PLATINUM II段位标签，头像从66px缩小到60px，名字从text-xl缩小到text-2xl，Bebas Neue字体用于数字
3. **统计2x2极简化**：去掉每个StatTile的进度条和副文字行，改为icon+大字+标签的横排紧凑布局
4. **Tab导航紧凑化**：字体缩小到text-[11px]，内边距从p-1减小，active态深色底
5. **总览Tab双栏布局**：徽章进度(左3/7)+最近战报(右4/7)并排显示，用grid-cols-7
6. **战报旗帜对称布局**：每行格式改为"🇶🇦 3:1 🇧🇷 命中 +1240"，去掉日期、副标题、国旗缩写
7. **全局间距收紧**：section间距从space-y-4→space-y-2，卡片内边距从p-4/p-5→p-3
8. **底部操作栏**：暗色"保存战绩图"主按钮+浅色"退出"次按钮
9. **保留所有数据逻辑**：API调用、useMemo计算、Tab切换、html2canvas分享功能不做任何修改

### 视觉效果

- 深色体育场背景拉开层次感
- 毛玻璃卡片悬浮有景深
- 金色点缀(段位、称号)提升质感
- 极简统计卡片减少视觉噪音
- 双栏布局大幅压缩纵向滚动距离(约节省40%)

## 技术方案

### 实现策略

改动集中在2个文件：`index.html`(添加字体) 和 `src/components/MeTab.tsx`(重构JSX)。保留所有数据逻辑层代码不变，仅重写渲染层。

### 修改文件

#### 1. index.html — 添加Bebas Neue字体

在`<head>`内添加Google Fonts CDN链接：

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Bebas+Neue&display=swap" rel="stylesheet"/>
```

#### 2. src/components/MeTab.tsx — 核心重构

**保留不变的部分**：

- 所有imports(类型、工具函数、子组件) + 添加Bebas Neue相关无需额外import
- 所有state定义(transactions, predictions, tournamentBets等)
- 所有useMemo计算(stats, recentSettlements, profileSummary等)
- loadProfileCenter函数
- handleShareCard函数
- 所有子组件函数(SettlementRow, TransactionList, BadgeCard, BadgeProgress, CardInventoryGrid, TournamentBetStrip)
- formatSigned, formatCompact, getTitleCopy等工具函数
- TONE_CLASS, TABS常量

**重写的部分**：

- 主组件return的JSX(第377-654行)
- StatTile组件(第187-224行)的JSX
- SettlementRow组件(第658-683行)的JSX

**新增的CSS class**(通过组件内`<style>`标签注入)：

```css
.stadium-bg { background: linear-gradient(...) + radial-gradient(...); }
.glass-card { background: rgba(255,255,255,0.48); backdrop-filter: blur(22px); ... }
.avatar-ring { box-shadow: 0 0 22px rgba(16,185,129,0.45); }
.bar-animate { transition: width 1s cubic-bezier(0.22, 0.61, 0.36, 1); }
```

### 关键设计决策

- **字体方案**：Bebas Neue仅用于数字(`font-display`)，中文保留Inter(`font-sans`)
- **毛玻璃降级**：`@supports not (backdrop-filter)`时用`rgba(255,255,255,0.85)`作为fallback
- **分享截图**：html2canvas需要捕获新布局，ref保持绑定在`shareCardRef`上
- **移动端适配**：双栏布局在小屏(`@container`或`md:`断点)降级为上下堆叠
- **段位计算**：复用`profileSummary.featuredBadge?.label`，映射到PLATINUM等段位