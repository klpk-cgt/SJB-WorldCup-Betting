---
name: admin-backend-optimization
overview: 管理后台四项综合优化：日志/消息全面中文化、赛程结算交互改为底部抽屉、API连通性健康检测、同步日志中文输出。
todos:
  - id: backend-health-check
    content: 新增 POST /api/admin/integrations/health-check 端点，分别检测 API-Football、The Odds API、Gemini AI 三个外部服务的连通性，返回每项的状态码、响应时间和错误信息
    status: completed
  - id: backend-sync-cn
    content: 后端 sync.ts 和 sync_scheduler_service.ts 中文化：将所有 buildLog() 的 action/responseSummary 字段改为中文，同步调度器的日志输出和 health reason 全部中文化
    status: completed
  - id: frontend-drawer-refactor
    content: 使用 [subagent:code-explorer] 确认赛程结算Tab完整结构后，将右侧编辑面板重构为底部抽屉组件：保留全部现有功能（比分输入、状态选择、赔率编辑、保存、单场同步、一键结算、强制重算），新增 drawerOpen 状态控制和滑入/滑出动画
    status: completed
  - id: frontend-cn-text
    content: AdminPanel.tsx 全面中文化：仪表盘系统状态卡片（Storage/Data/Betting/Match health标签、Database connected/unavailable等）、一键运维反馈消息（setOpsStatusMsg）、同步日志Tab状态标签（Configured/Missing/Synced/Not synced）、所有操作toast提示统一改为中文
    status: completed
  - id: frontend-health-ui
    content: 在仪表盘「一键运维」区域新增「API连通性检测」按钮和结果展示卡片，调用 health-check 端点后以绿/红/黄色状态卡片分别展示三个API的检测结果
    status: completed
    dependencies:
      - backend-health-check
  - id: verify-all
    content: 使用 [skill:playwright-cli] 对管理后台进行全面验收测试：验证底部抽屉交互、API检测结果展示、中文日志显示、所有操作反馈消息正常
    status: completed
    dependencies:
      - frontend-drawer-refactor
      - frontend-cn-text
      - frontend-health-ui
---

## 产品概览

对2026世界杯竞猜平台管理后台进行四项体验优化，提升管理员操作效率和直观性。

## 核心功能

### 1. 管理后台日志/说明全面中文化

将 AdminPanel.tsx 中所有英文UI标签、操作反馈消息（setOpsStatusMsg、toast）、系统状态卡片内的英文文本统一改为中文输出，让管理员一眼看懂系统状态。

### 2. 赛程结算交互改为底部抽屉

将当前赛程结算Tab的"左右分栏编辑"模式重构为底部抽屉模式。管理员点击左侧比赛列表中的某场比赛，从屏幕底部弹出一个抽屉面板，在抽屉内完成比分输入、状态选择、赔率编辑、保存和结算操作。抽屉外有半透明遮罩，点击遮罩关闭抽屉。

### 3. 同步日志中文输出

将后端 sync.ts 的 `buildLog()` 中所有 `action` 和 `responseSummary` 字段改为中文，同时将 sync_scheduler_service.ts 中的日志输出中文化，使同步日志 Tab 中显示的记录一目了然。

### 4. API连通性一键检测

新增 `/api/admin/integrations/health-check` 端点，分别对 API-Football、The Odds API、Gemini AI 三个外部服务发起最小验证请求，返回每项的配置状态、HTTP状态码、响应时间、错误详情。管理后台仪表盘新增「API连通性检测」按钮和结果展示卡片。

## 技术方案

### 实现策略

本次优化涉及4个模块，按依赖关系分为后端先行、前端跟进：

- **后端**：新增API健康检查端点 + 中文化同步日志消息（无前端依赖，可独立先行）
- **前端**：中文化UI文本 + 赛程结算底部抽屉重构 + API健康检查UI卡片（依赖后端健康检查端点）

### 关键设计决策

**1. 赛程结算底部抽屉**

- 采用纯CSS `transform: translateY()` + `transition` 实现底部滑入动画
- 不使用第三方抽屉库，保持项目零重型依赖
- 复用现有 `selectedMatch` 状态和所有编辑逻辑（handleUpdateMatchDetails、handleTriggerSettlement 等）
- 抽屉内布局：上部比赛对阵信息header → 比分/状态编辑区 → 赔率编辑区 → 底部操作按钮区

**2. API健康检查**

- 每个API独立检测，即使一个失败也不影响其他检测
- 设置3秒超时防止长时间等待
- 返回结构化JSON，前端以彩色状态卡片展示（绿色✅ / 红色❌ / 黄色⚠️）

### 目录结构

```
src/
├── server/
│   ├── routes/
│   │   └── admin.ts                    # [MODIFY] 新增 POST /api/admin/integrations/health-check 端点
│   ├── sync.ts                         # [MODIFY] buildLog() action/responseSummary 中文化，共约12处
│   └── services/
│       └── sync_scheduler_service.ts   # [MODIFY] logger日志输出中文化，health reason 字段中文化
└── components/
    └── AdminPanel.tsx                  # [MODIFY] 主要改动：
                                        #   1. 赛程结算Tab：右侧编辑区重构为底部抽屉组件
                                        #   2. 仪表盘Tab：系统状态卡片英改中，新增API健康检测UI
                                        #   3. 同步日志Tab：provider状态标签英改中
                                        #   4. 全部 opsStatusMsg/toast 消息英改中
```

### 实现注意事项

- **性能**：健康检查为一次性手动触发，无性能影响；底部抽屉用CSS动画，无额外重渲染
- **兼容性**：赛程结算Tab的所有现有功能（保存比分、单场同步、一键结算、强制重算）完整保留在抽屉内
- **错误处理**：健康检查每个API独立try-catch，即使Gemini挂掉也不影响API-Football检测结果
- **日志安全**：不输出API Key明文，仅输出脱敏信息（前4后4位）

## 代理扩展

### SubAgent

- **code-explorer**
- 用途：在实施过程中深度探索 AdminPanel.tsx 赛程结算Tab的完整代码结构，确认所有需要迁移到抽屉中的编辑字段和按钮
- 预期结果：准确掌握赛程结算Tab的全部交互元素（比分输入、状态选择、赔率、保存/同步/结算/强制重算按钮），确保抽屉重构不遗漏任何功能

### Skill

- **playwright-cli**
- 用途：实施完成后对管理后台进行全面验收测试，截取底部抽屉动画效果、API健康检测结果、中文日志显示等关键页面的截图
- 预期结果：获得所有优化功能正常工作的视觉证据