---
name: level-podium-bulkpoints
overview: 三合一优化：1) 等级机制改为净收益阈值12级 2) 领奖台#3与称号重叠修复 3) 管理员统一发配积分功能
---

## 产品概述

对现有项目进行三项独立优化：等级机制重新设计、排行榜领奖台UI修复、管理员统一发配积分功能。

## 核心需求

### 1. 等级机制重新设计

- 等级基于**净收益（netProfit = balance - initialPoints）**达到阈值升级，不再随积分波动
- 共12个等级，每级用不同颜色标识
- 等级阈值在后台 RuntimeConfig 中配置，不在前端暴露具体数值
- 等级只在个人资料页（MeTab）显示，排行榜不显示等级
- **等级只升不降**：一旦达到某个等级就永久保留

### 2. 排行榜领奖台 #3 修复

- 修复排名 #3 的领奖台卡片中，`#3` 排名徽章与上方称号文字视觉重叠的问题
- 保持三个名次的高度阶梯（1最高，3最矮）差异化设计

### 3. 管理员统一发配积分

- 管理员后台新增功能：统一给所有用户发放指定数额的积分
- 包含批量操作确认和一键执行
- 操作后记录交易流水和群内动态

## 技术栈

- 后端：Express.js + TypeScript（现有项目技术栈）
- 前端：React + TypeScript + Tailwind CSS
- 数据存储：db.json（文件型数据库，非MySQL）
- 类型定义：src/types.ts

## 实现方案

### 一、等级机制重新设计

#### 数据模型变更

- `Wallet` 接口新增可选 `level: number` 字段（存储已达最高等级）
- `RuntimeConfig` 接口新增 `levelThresholds: number[]` 字段（12级净收益阈值数组）
- Prisma schema 中 Wallet 模型新增 `level Int?`（与现有 JSON 存储兼容）

#### 后端等级计算

- 在 `server/config.ts` 中新增 `levelThresholds` 配置项，默认值设一套合理的12级阈值
- 新增工具函数 `computeLevel(netProfit: number, thresholds: number[]): number`，返回0-12的等级数
- 在 `/api/me` 端点中计算当前等级，若高于存储等级则更新 `wallet.level`
- 返回给前端的 profile 数据中增加 `level` 字段（仅数值，不含阈值）

#### 前端等级展示

- 替换 `MeTab.tsx` 中现有的 `Lv = floor(balance/1000)` 为后端返回的 `level` 值
- 移除原有的进度条（expPercent），改为简洁的等级徽章
- 12级颜色映射：前端内置颜色数组，按等级索引取色
- 等级徽章样式：圆角徽章 `Lv.X`，背景色为等级对应颜色

#### 等级颜色设计（12级渐变色系）

```
Lv.1-2   灰/浅灰    (新手上路)
Lv.3-4   蓝色系    (初露锋芒)
Lv.5-6   青色系    (渐入佳境)
Lv.7-8   绿色系    (实力玩家)
Lv.9-10  橙/金色系 (高手大神)
Lv.11-12 紫/粉金系 (传奇球王)
```

### 二、排行榜领奖台修复

#### 问题分析

- `PodiumCard` 第86-129行，rank 3 高度 `h-16` 是三个名次中最矮的
- 第116行称号文字在第118行领奖台 bar 之上
- `#3` 徽章（第119行）在 bar 顶部，与上方称号间距仅 `mt-3`
- 当称号文字较长且在移动端时，`#3` 徽章与称号产生视觉重叠

#### 修复方案

- 将 rank 3 的 podium 高度从 `h-16` 调整为 `h-18`，增加8px空间
- 同时调整 PodiumPlaceholder 中 rank 3 的高度保持一致
- 或将 podium bar 的 `mt-3` 在 rank 3 时增加为 `mt-4`，仅对 #3 增加间距

### 三、管理员统一发配积分

#### 后端端点

- 新增 `POST /api/admin/users/bulk-points`
- 接收参数：`{ amount: number, reason: string }`
- 遍历所有用户钱包，逐一调整积分
- 为每个用户创建 `ADMIN_ADJUST` 交易记录
- 触发群内动态通知
- 返回：`{ success: true, affectedUsers: number }`

#### 前端交互

- 在「一键运维」卡片中新增「全员发配积分」按钮
- 点击后弹出模态框：输入金额和理由
- 确认后调用批量端点，显示操作结果

## 架构设计

```
┌─ RuntimeConfig ─────────────────────┐
│ levelThresholds: number[] (新增)    │
│ 默认值：[500, 1500, 3000, 5000,    │
│  8000, 12000, 18000, 25000, 35000, │
│  50000, 75000, 100000]             │
└────────────────────────────────────┘
           │
           ▼
┌─ /api/me ───────────────────────────┐
│ netProfit = balance - initialPoints │
│ currentLevel = computeLevel(netProfit) │
│ if currentLevel > wallet.level:     │
│     wallet.level = currentLevel     │
│ return { ...profile, level }        │
└────────────────────────────────────┘
           │
           ▼
┌─ MeTab.tsx ─────────────────────────┐
│ 显示 levelBadge(level)              │
│ 颜色 = LEVEL_COLORS[level]          │
│ 移除进度条，只显示等级徽章          │
└────────────────────────────────────┘
```

## 目录结构

```
src/
├── types.ts                          # [MODIFY] Wallet 新增 level?: number
├── server/
│   ├── config.ts                     # [MODIFY] RuntimeConfig 新增 levelThresholds
│   ├── routes/
│   │   ├── users.ts                  # [MODIFY] /api/me 返回 level 字段
│   │   └── admin.ts                  # [MODIFY] 新增 POST /api/admin/users/bulk-points
│   └── helpers.ts                    # [MODIFY] 新增 computeLevel 工具函数
├── components/
│   ├── MeTab.tsx                     # [MODIFY] 等级展示改为后端数据+颜色徽章
│   ├── LeaderboardTab.tsx            # [MODIFY] 修复 #3 podium 高度/间距
│   └── AdminPanel.tsx               # [MODIFY] 新增全员发配积分UI
└── prisma/
    └── schema.prisma                 # [MODIFY] Wallet 新增 level Int?
```

## 关键代码结构

### 新增类型与配置

```typescript
// Runtime[User Cancelled]