# 项目重点总结

更新时间：2026-06-07

## 1. 项目当前定位

这是一个面向单群聊使用的世界杯竞猜 Web 应用，当前主目标不是做复杂房间体系，而是把下面几件事做到顺滑可运营：

- 看赛程
- 做竞猜
- 看 AI 内容
- 做群聊分享传播
- 后台可同步、可诊断、可调试

当前技术栈仍然是：

- 前端：React + Vite
- 后端：Express + TypeScript
- 数据：本地 `db.json`
- 外部数据源：API-Football、The Odds API
- 模型侧：DeepSeek、Gemini，MiMo 先做预留

## 2. 已完成的重点能力

### UI / 体验层

- 底部导航固定到底部，保留滚动隐藏逻辑
- 首页已改成“最近赛程”，并只展示最近一个比赛日
- 首页已去掉榜单预览
- 赛程页已改成“最近两天优先 + 展开全部”
- 竞猜页已改成“最近两天可竞猜优先”
- 比分玩法已从少量选项扩展成“常用比分 + 展开全部比分”
- 我的页已重构为更偏身份卡、战绩、成就、最近操作的结构
- 国旗图标已改成本地优先映射，不再完全依赖远程图床

### AI / 模型层

- 已重构模型入口，核心文件是 [src/server/ai.ts](/H:/世界杯娱乐项目/back/klpk-cgt-s-Org%20v2/src/server/ai.ts)
- 文本模型路由已明确为：
  1. `DeepSeek`
  2. `MiMo` 预留位
  3. `Gemini`
  4. 本地 fallback
- 已把 DeepSeek 默认模型切到 `deepseek-v4-pro`
- 已新增投注分享卡生成能力 `generateBetShareCard`
- 已支持：
  - AI 文本生成
  - 投注后分享文案
  - 分享图失败时回退本地 SVG 模板图

### 后端接口层

以下新接口已经在 [server.ts](/H:/世界杯娱乐项目/back/klpk-cgt-s-Org%20v2/server.ts) 中补上：

- `POST /api/ai/generate`
- `POST /api/ai/match/:id/preview`
- `POST /api/ai/share/bet`
- `GET /api/admin/integrations/status`
- `POST /api/admin/integrations/test-sync`

### 同步 / 数据层

- 赔率结构已新增：
  - `syncStatus`
  - `lastSyncedAt`
- 已支持区分：
  - `SYNCED`
  - `PARTIAL`
  - `MANUAL_FALLBACK`
  - `FAILED`
- 持久化层已增强，核心文件是 [src/db/db_service.ts](/H:/世界杯娱乐项目/back/klpk-cgt-s-Org%20v2/src/db/db_service.ts)
- 当前已补：
  - schema hydrate
  - 损坏 `db.json` 的兜底重建
  - 损坏文件备份
  - 原子写入
  - `shareCards` 持久化

### 管理后台

- 已新增 provider 配置状态读取
- 已新增同步校验入口
- 已新增最近一次同步诊断结果展示
- 管理端用户列表已去掉 PIN 直接展示

## 3. 当前最重要文件

- [server.ts](/H:/世界杯娱乐项目/back/klpk-cgt-s-Org%20v2/server.ts)
  负责主要 API、同步调度、AI 接口、后台接口
- [src/server/ai.ts](/H:/世界杯娱乐项目/back/klpk-cgt-s-Org%20v2/src/server/ai.ts)
  负责模型路由、结构化 AI 文本、分享卡生成
- [src/server/config.ts](/H:/世界杯娱乐项目/back/klpk-cgt-s-Org%20v2/src/server/config.ts)
  负责运行时配置和 provider 状态摘要
- [src/server/sync.ts](/H:/世界杯娱乐项目/back/klpk-cgt-s-Org%20v2/src/server/sync.ts)
  负责 fixtures / odds 同步
- [src/components/PredictionTab.tsx](/H:/世界杯娱乐项目/back/klpk-cgt-s-Org%20v2/src/components/PredictionTab.tsx)
  负责竞猜体验和投注后分享卡入口
- [src/components/AdminPanel.tsx](/H:/世界杯娱乐项目/back/klpk-cgt-s-Org%20v2/src/components/AdminPanel.tsx)
  负责后台调试和同步校验展示

## 4. 当前仍需关注的风险

### A. MiMo 还只是预留位

- 目前代码里已经有配置位和路由位
- 但还没有完成真实 API 联调
- 所以当前真正可用的是 DeepSeek + Gemini

### B. 运行环境的 Key 是否真的生效，仍需实测

- 代码层已经支持：
  - `API_FOOTBALL_KEY`
  - `THE_ODDS_API_KEY`
  - `DEEPSEEK_API_KEY`
  - `GEMINI_API_KEY`
  - `MIMO_API_KEY`
- 但是否在当前运行进程里全部正确加载，仍要通过后台 `integrations/status` 和 `test-sync` 实测确认

### C. 分享图目前是“可用首版”

- 已有完整闭环
- 但前端仍是轻量入口，不算最终版社交传播页
- 当前更适合先验证：
  - 文案是否稳定
  - 图片是否生成
  - 群聊里是否愿意转发

### D. 仍需要一轮完整联调

- 类型检查已通过
- 但还需要真实验证：
  - 赛程同步
  - 赔率同步
  - AI 文本生成
  - Gemini 图片生成
  - 投注后分享卡下载 / 复制

## 5. 当前验证结论

- `npm run lint` 已通过
- 本地 `3000` 端口当前处于监听状态
- 仓库已经不是只做 UI 调整的阶段，已经进入“AI + 同步 + 分享闭环”的产品版演进阶段

## 6. 下一步建议优先级

### P0：先做真联调

- 检查 `.env`
- 后台查看 `/api/admin/integrations/status`
- 执行 `/api/admin/integrations/test-sync`
- 验证最近一个比赛日的 fixtures 和 odds 是否真实写入
- 验证 DeepSeek 是否正常出文案
- 验证 Gemini 是否正常出分享图

### P1：把分享卡入口再做顺

- 下注成功后给更明确的分享入口
- 补“复制文案成功 / 下载图片成功”的反馈
- 后续可以再扩展：
  - 战绩图
  - 日榜图
  - 群聊话题图

### P2：把后台面板继续产品化

- 增加 provider 延迟、最近错误、最后成功时间
- 增加单场 AI 测试
- 增加单场赔率校验结果

## 7. 建议的后续工作方式

后续继续开发时，建议按这个顺序推进：

1. 先确认 `.env` 和真实运行态
2. 再跑一轮同步与 AI 联调
3. 再优化分享卡与传播体验
4. 最后补 MiMo 真接入

如果后面需要继续接力，优先从这 3 个点看：

- [PROJECT_STATUS_SUMMARY.md](/H:/世界杯娱乐项目/back/klpk-cgt-s-Org%20v2/PROJECT_STATUS_SUMMARY.md)
- [server.ts](/H:/世界杯娱乐项目/back/klpk-cgt-s-Org%20v2/server.ts)
- [src/server/ai.ts](/H:/世界杯娱乐项目/back/klpk-cgt-s-Org%20v2/src/server/ai.ts)
