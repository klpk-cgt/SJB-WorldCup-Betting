# 资料页预览展示 + React 重构实施计划

## Summary

完整资料页HTML预览原型 `prototype/profile-full-preview.html`（857行）已创建完成，覆盖Header + 4个tab（总览/战报/徽章/道具）+ 底部操作栏 + 徽章详情弹窗，采用玻璃态升级版视觉风格。

本计划聚焦两个紧接的执行步骤：
- **Step A**：在Chrome中打开HTML原型，分别截图4个tab + 徽章弹窗，展示给用户确认效果。
- **Step B**：用户确认后，将原型移植到React组件，拆分MeTab.tsx（1093行）为7个子组件 + 独立CSS文件。

## Current State Analysis

### 已完成
- [prototype/profile-full-preview.html](file:///h:/世界杯娱乐项目/back/klpk-cgt-s-Org%20v2/prototype/profile-full-preview.html) — 完整资料页HTML原型
  - Header：体育场渐变背景 + 毛玻璃主卡 + 76px头像(旋转光环) + 等级徽章 + 积分/净收益(趋势色)/Lv等级条(7px加粗)
  - Tab导航：4个tab，active胶囊背景(emerald渐变)，fadeIn切换
  - overview：2x2统计卡(趋势箭头+色彩主题) + 徽章进度卡 + 最近战报卡
  - reports：纯SVG收益曲线图(emerald渐变填充+峰值标注) + 结算列表5条 + 积分流水5条
  - badges：统计条 + 代表徽章高亮卡 + 按category分组的3列网格(4种稀有度) + 点击弹窗
  - items：道具卡2列(渐变+稀有度边框) + 长线竞猜strip(横向滚动)
  - 底部操作栏 + 详情弹窗(底部抽屉translateY动画)
- [.trae/documents/profile-page-full-redesign.md](file:///h:/世界杯娱乐项目/back/klpk-cgt-s-Org%20v2/.trae/documents/profile-page-full-redesign.md) — 整体重构计划(已批准)
- Dev server后台运行于 http://localhost:3001 (job ID: job-26ed11a373954ba889589a91564f6093)

### 待完成
- 尚未在Chrome中向用户展示HTML原型截图
- React组件重构（Step 2）尚未开始
- `src/components/profile/` 目录不存在，需创建

### MeTab.tsx 现有结构（[src/components/MeTab.tsx](file:///h:/世界杯娱乐项目/back/klpk-cgt-s-Org%20v2/src/components/MeTab.tsx)）
| 行号 | 元素 | 重构去向 |
|------|------|---------|
| 41 | TONE_CLASS | 保留在MeTab |
| 50 | TABS | → ProfileTabs.tsx |
| 60 | STAT_ICON_SRC | → StatTile.tsx |
| 69 | BADGE_ICON_SRC | → BadgeCard.tsx |
| 91/104/111 | CATEGORY_LABEL/RARITY_LABEL/RARITY_CLASS | → BadgeCard.tsx |
| 118 | CARD_ICON_SRC | → CardInventoryGrid.tsx |
| 210 | ProfileImageIcon | 保留在MeTab |
| 251 | StatTileLight | → StatTile.tsx (升级) |
| 287 | METAB_CSS | → profileStyles.css |
| 345 | MeTab主组件 | 精简为编排层 |
| 922 | SettlementRow | 保留在MeTab（reports tab内联） |
| 949 | TransactionList | 保留在MeTab（reports tab内联） |
| 972 | BadgeCard | → BadgeCard.tsx (升级4稀有度) |
| 1006 | CardInventoryGrid | → CardInventoryGrid.tsx (升级渐变) |
| 1035 | TournamentBetStrip | 保留在MeTab（items tab内联） |

## Proposed Changes

### Step A: Chrome预览展示（只读，不修改文件）

**目标**：让用户看到完整资料页美化效果，确认视觉方向。

**执行步骤**：
1. 用Chrome DevTools MCP的 `navigate_page` 打开 `file:///h:/世界杯娱乐项目/back/klpk-cgt-s-Org%20v2/prototype/profile-full-preview.html`
2. 用 `resize_page` 设置为390x844（iPhone 12 Pro尺寸）
3. 截图5个状态：
   - **A1**：overview总览tab（默认激活）
   - **A2**：切换到reports战报tab（重点展示SVG收益曲线图）
   - **A3**：切换到badges徽章tab（展示4种稀有度+代表徽章卡）
   - **A4**：切换到items道具tab（展示渐变道具卡+长线竞猜strip）
   - **A5**：点击「十连红」徽章，展示底部抽屉详情弹窗
4. 将5张截图展示给用户，请用户确认：
   - 视觉风格是否符合预期
   - 4个tab的层次是否清晰
   - 收益曲线图效果
   - 稀有度视觉差异是否足够
   - 是否有需要调整的细节

**如用户要求调整**：修改 `prototype/profile-full-preview.html` 后重新截图，直到用户确认满意。

### Step B: React组件重构（用户确认预览后执行）

**目标**：将HTML原型效果移植到React，保持现有数据流和API不变。

#### B1. 创建目录与CSS文件
**新建** `src/components/profile/profileStyles.css`：
- 从MeTab.tsx的METAB_CSS（行287-343）抽出全部样式
- 新增稀有度动效keyframes：
  - `@keyframes legendary-pulse`（金色脉冲，2.5s）
  - `@keyframes epic-glow`（紫色微光，3s）
  - `@keyframes ring-rotate`（头像光环旋转，12s）
- 新增4种稀有度CSS类：`.badge-legendary` / `.badge-epic` / `.badge-rare` / `.badge-common`
- 新增玻璃态主卡样式：`.profile-glass-card`（backdrop-filter blur 18px）
- 新增收益曲线卡样式：`.profile-chart-card`
- 新增底部抽屉弹窗样式：`.profile-modal-overlay` + `.profile-modal-content`（translateY动画）
- 添加 `@media (prefers-reduced-motion: reduce)` 关闭动效

#### B2. 创建7个子组件

**新建** `src/components/profile/ProfileHeader.tsx`：
- Props: `{ user: User; wallet: Wallet; profileSummary?: UserProfileSummary }`
- 渲染体育场背景 + 毛玻璃主卡
- 头像76px + 旋转光环 + 等级徽章
- 昵称 + featuredBadge标签 + 称号（2行ellipsis）
- 三列统计：积分 / 净收益(趋势色) / Lv等级条(7px加粗)
- 用SmartAvatar组件替代硬编码头像

**新建** `src/components/profile/StatTile.tsx`：
- Props: `{ label: string; value: string; trend?: 'up'|'down'; trendText?: string; icon: string; tone: 'emerald'|'rose'|'amber'|'cyan' }`
- 升级StatTileLight：加趋势箭头 + 对比基线小字 + 图标盒色彩主题 + hover上浮

**新建** `src/components/profile/NetProfitChart.tsx`：
- Props: `{ transactions: Transaction[]; initialPoints: number }`
- 用recharts的AreaChart + emerald/rose渐变填充
- 计算累计净收益序列：从transactions按时间排序累加
- 当前值大字标注 + 峰值标记
- 正收益emerald渐变 / 负收益rose渐变

**新建** `src/components/profile/BadgeCard.tsx`：
- Props: `{ badge: AchievementBadgeSummary; unlocked: boolean; onClick?: () => void }`
- 4种稀有度CSS类映射（badge-legendary/epic/rare/common）
- 传说级脉冲动画 + 史诗级微光
- 已解锁/未解锁状态（灰度+锁图标）
- 进度条 + 稀有度标签

**新建** `src/components/profile/BadgeDetailModal.tsx`：
- Props: `{ badge: AchievementBadgeSummary | null; unlocked: boolean; onClose: () => void }`
- 底部抽屉弹出（translateY动画）
- 88px大图标 + 稀有度光晕
- 稀有度标签 + 描述 + 进度条 + 解锁状态
- 点击遮罩关闭

**新建** `src/components/profile/CardInventoryGrid.tsx`：
- Props: `{ cardInventory: any }`
- 2列道具卡网格
- 4种渐变背景（emerald/amber/rose/cyan）+ 稀有度边框
- 大图标 + 数量角标 + 简短描述

**新建** `src/components/profile/ProfileTabs.tsx`：
- Props: `{ activeTab: ProfileTab; onChange: (tab: ProfileTab) => void }`
- 4个tab胶囊导航，active用emerald渐变背景
- fadeIn切换动画

#### B3. 重构MeTab.tsx
**修改** [src/components/MeTab.tsx](file:///h:/世界杯娱乐项目/back/klpk-cgt-s-Org%20v2/src/components/MeTab.tsx)：
- 删除METAB_CSS内联样式（改用import './profile/profileStyles.css'）
- 删除StatTileLight、BadgeCard、CardInventoryGrid内联定义（改用import）
- 删除TABS常量（改用ProfileTabs组件）
- 保留数据加载逻辑：useEffect加载profileSummary、predictions、transactions、cardInventory
- 保留SettlementRow、TransactionList、TournamentBetStrip（reports/items tab内联组件）
- 保留html2canvas分享卡功能
- 保留退出登录、管理员入口
- 引用新子组件编排4个tab内容
- 添加selectedBadge状态控制BadgeDetailModal

#### B4. 类型与依赖
- 复用现有类型：User、Wallet、Transaction、AchievementBadgeSummary、UserProfileSummary（来自src/types.ts）
- recharts ^3.8.1 已在package.json（NetProfitChart使用）
- 不新增任何依赖

## Assumptions & Decisions

1. **预览顺序**：必须先在Chrome展示HTML原型给用户确认，才执行React重构
2. **数据流不变**：所有API调用、useGameContext、profileSummary结构保持不变
3. **CSS策略**：独立CSS文件 + BEM命名前缀 `profile-`，避免CSS modules复杂度
4. **稀有度方案**：分级混合（Legendary/Epic用动效光晕，Rare/Common用边框色）— 沿用已批准方案
5. **收益曲线**：HTML原型用纯SVG；React实施用recharts（已在依赖）
6. **保留功能**：html2canvas分享卡、退出登录、管理员入口、加载更多、SmartAvatar、FlagBadge全部保留
7. **Tab切换动画**：用CSS fadeIn，不引入motion库（保持轻量）
8. **移动端优先**：所有组件按390px宽度设计，max-width: 420px

## Verification Steps

### Step A 验证
1. Chrome打开profile-full-preview.html成功
2. 5张截图清晰展示4个tab + 徽章弹窗
3. 用户确认视觉效果满意（或提出调整意见）

### Step B 验证
1. `npm run dev` 启动dev server（端口3001）
2. 登录用户YDM，进入资料页
3. 4个tab视觉与HTML预览一致
4. ProfileHeader等级条、称号显示完整
5. StatTile趋势箭头正确显示
6. NetProfitChart用recharts渲染收益曲线，正收益emerald色
7. BadgeCard 4种稀有度视觉差异明显，传说级脉冲动画
8. BadgeDetailModal底部抽屉弹出正常，点击遮罩关闭
9. CardInventoryGrid道具卡渐变+数量角标
10. ProfileTabs胶囊active + fadeIn切换
11. html2canvas分享卡功能不受影响
12. `npx tsc --noEmit` 无类型错误
13. 浏览器控制台无报错
14. 移动端390px宽度下无横向滚动
