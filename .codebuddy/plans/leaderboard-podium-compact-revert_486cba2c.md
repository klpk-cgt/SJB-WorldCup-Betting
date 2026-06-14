---
name: leaderboard-podium-compact-revert
overview: 将排行榜领奖台 UI 从新版华丽风格还原为老版紧凑极简风格，同时保留 grid-cols-3 等宽布局修复
todos:
  - id: compact-podium
    content: 精简 PODIUM_RANK_META 为 3 字段 + 重写 PodiumCard 为旧版紧凑裸卡片风格 + 重写 PodiumPlaceholder 去壳 + 删除 getPodiumBadgeMeta + 清理未使用 import
    status: completed
  - id: verify-restart
    content: 重启开发服务器并验证领奖台 UI 效果，确认紧凑布局 + 等宽三列正常
    status: completed
    dependencies:
      - compact-podium
---

## 产品概述

将排行榜领奖台 UI 从当前装饰感过重的版本还原为老版紧凑极简风格，同时保留 grid-cols-3 等宽布局修复，确保前三名卡片始终均匀分布，不因缺人而偏移。

## 核心功能

- 领奖台还原为旧版紧凑裸卡片风格，无边框无圆角无外壳背景
- 恢复旧版领奖台高度落差（h-16 季军 / h-20 亚军 / h-28 冠军）
- 头像统一 42px，去除冠军光晕、👑/✦ 浮标装饰
- 徽章放回领奖台柱子内部，不在头像下方单独占一行
- 去除「冠军/亚军/季军」文字标签
- 排名显示 `#{1}` 替代图标标记
- 保持 grid-cols-3 等宽三列布局 + PodiumPlaceholder 占位
- 占位符样式同步简化为紧凑风格

## 技术方案

### 实现方式

改动范围严格限定在 `src/components/LeaderboardTab.tsx` 一个文件内，涵盖以下区域：

1. **精简 PODIUM_RANK_META 常量**：从当前 8 字段缩减为 3 字段（bg、rankBadge、height），删除 avatarSize、avatarRing、card、mark、label
2. **重写 PodiumCard 组件**：采用旧版裸卡片布局，头像、名字、称号、徽章、领奖台柱子自上而下紧凑排列
3. **重写 PodiumPlaceholder 组件**：去掉外壳，匹配紧凑风格
4. **删除 getPodiumBadgeMeta 函数**：不再单独提取徽章元数据，徽章直接内联渲染
5. **整理 import**：移除 no longer used 的 `Medal` 图标（如果 PodiumPlaceholder 不再需要）
6. **布局保持**：`grid grid-cols-3 items-end gap-2 sm:gap-3` 不变

### 数据流

无变更。排行榜数据仍然通过 `/api/leaderboards` 获取，`activeList[0]/[1]/[2]` 传给 PodiumCard/PodiumPlaceholder。

### 目录结构

```
src/components/
└── LeaderboardTab.tsx  # [MODIFY] 唯一改动文件
```

### 关键代码结构

简化后的 PODIUM_RANK_META：

```ts
const PODIUM_RANK_META: Record<1 | 2 | 3, { bg: string; rankBadge: string; height: string }> = {
  1: { bg: 'from-amber-300 to-yellow-100', rankBadge: 'bg-amber-500 text-white', height: 'h-28' },
  2: { bg: 'from-slate-300 to-slate-50',  rankBadge: 'bg-slate-500 text-white', height: 'h-20' },
  3: { bg: 'from-orange-300 to-amber-50',  rankBadge: 'bg-orange-500 text-white', height: 'h-16' },
};
```

简化后的 PodiumCard 布局结构：

```
<div className="flex flex-1 flex-col items-center">
  <SmartAvatar size={42} className="z-10 ring-2 ring-white" />
  <div className="mt-2 text-center">
    <div>{displayName}</div>
    <div>{title}</div>
  </div>
  <div className={`podium-bar ${rankMeta.bg} ${rankMeta.height}`}>
    <span className={rankMeta.rankBadge}>#{rank}</span>
    <div>{displayValue}</div>
    {featuredBadge && <span className={TONE_CLASS}>badge</span>}
  </div>
</div>
```

简化后的 PodiumPlaceholder：去掉 border/bg/rounded 外壳，改为 flex-1 裸框 + 骨架线。