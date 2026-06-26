# 首页等级/称号统一与群聊入口改造计划

## 概述

将首页（HomeTab）的"群聊入口"改为显示用户成就称号，并将首页等级显示与资料页（MeTab）统一为同一套动态计算逻辑。

## 当前状态分析

### 1. 首页 HomeTab.tsx
- 文件位置：`src/components/HomeTab.tsx`
- 已引入 `UserProfileSummary` 类型、`getLevelByNetProfit` 函数，并声明了 `profileSummary` 状态（L235）。
- 尚未添加获取 `/api/me/profile-summary` 的副作用。
- 当前代码（L439-L441）仍显示旧版入口：
  ```jsx
  <span className="rounded-full bg-orange-50 border border-orange-100 px-2 py-0.5 text-[9px] font-bold text-orange-600">🔥 群聊入口</span>
  {user && <span className="rounded-full bg-amber-50 border border-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-600">⭐ Lv.4</span>}
  ```
- 仍有未使用的 `coinPulse` keyframes 样式定义（L432），但金币图标上已无动画类。

### 2. 资料页 MeTab.tsx
- 文件位置：`src/components/MeTab.tsx`
- 等级计算（L306-L307）：
  ```ts
  const gameNetProfit = (wallet?.balance || 0) - (wallet?.initialPoints || 10000);
  const currentLevel = getLevelByNetProfit(gameNetProfit);
  ```
- 称号显示（L352-L354）使用 `safeProfileSummary.currentTitle`。
- 等级/称号逻辑已经正确，无需改动。

### 3. 后端接口
- `/api/me/profile-summary`（`src/server/routes/users.ts`）已返回 `getUserProfileSummary(user.id)`，包含 `currentTitle`。

### 4. 等级配置
- `src/server/config.ts` 中 `LEVEL_CONFIGS` 与 `getLevelByNetProfit(netProfit)` 已定义。

### 5. 称号生成
- `src/utils/achievements.ts` 中 `buildUserProfileSummary` 决定称号，后端 `badge_service` 已封装调用。

## 改造方案

### 第一步：HomeTab 获取 profileSummary

在 `src/components/HomeTab.tsx` 中新增 `useEffect`：

```ts
useEffect(() => {
  async function fetchProfileSummary() {
    if (!user) return;
    try {
      const data = await apiRequest('/api/me/profile-summary');
      setProfileSummary(data);
    } catch (error) {
      console.error('Failed to fetch profile summary', error);
    }
  }
  fetchProfileSummary();
}, [user]);
```

说明：
- 仅登录后请求。
- 失败静默处理，避免阻塞首页。

### 第二步：统一等级计算逻辑

在 `HomeTab.tsx` 组件 render 前计算等级，与 `MeTab.tsx` 完全一致：

```ts
const gameNetProfit = (wallet?.balance || 0) - (wallet?.initialPoints || 10000);
const currentLevel = getLevelByNetProfit(gameNetProfit);
```

### 第三步：替换"群聊入口"和写死等级

将 L439-L441 区域替换为：

```jsx
<div className="mt-1 flex items-center gap-1.5 flex-wrap">
  {profileSummary?.currentTitle && (
    <span className="rounded-full bg-violet-50 border border-violet-100 px-2 py-0.5 text-[9px] font-bold text-violet-600">
      ⚡ {profileSummary.currentTitle}
    </span>
  )}
  {user && (
    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${currentLevel.badgeBg}`}>
      ⭐ Lv.{currentLevel.level}
    </span>
  )}
</div>
```

说明：
- 称号使用紫色系，与资料页称号样式保持一致。
- 等级徽章使用 `currentLevel.badgeBg`，与当前等级主题色统一。
- 未登录时不显示等级。

### 第四步：清理无用样式

删除 L432 未使用的 `coinPulse` keyframes 样式定义：

```jsx
// 删除整行
<style>{`@keyframes coinPulse{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,.15)}50%{box-shadow:0 0 0 6px rgba(245,158,11,0)}}`}</style>
```

## 涉及文件

| 文件 | 改动 |
| --- | --- |
| `src/components/HomeTab.tsx` | 新增 profileSummary 请求、统一等级计算、替换称号/等级显示、清理旧动画样式 |
| `src/components/MeTab.tsx` | 无需改动 |
| `src/server/config.ts` | 无需改动 |
| `src/utils/achievements.ts` | 无需改动 |
| `src/server/routes/users.ts` | 无需改动 |

## 验证步骤

1. 运行 `npm run build`（或 `npx tsc --noEmit`）确认 TypeScript 无编译错误。
2. 启动开发服务器并登录账号，进入首页：
   - 头像下方原先"🔥 群聊入口"位置应显示称号，如 `⚡ 群聊新星`。
   - 等级数字应与资料页完全一致，如净收益 3000 以上显示 `Lv.4`。
   - 等级徽章颜色应随等级变化。
3. 切换至"我的"资料页，确认首页与资料页的等级数字、称号一致。
4. 检查金币图标无脉冲动画（样式定义已移除）。
