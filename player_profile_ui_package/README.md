# 资料页面 UI 重构包

这个压缩包包含：

```text
资料页面重构说明文档.md
Agent实现提示词.md
assets/
  stadium-light-bg.svg
  worldcup-trophy.svg
  football.svg
  default-avatar.svg
  badge-platinum.svg
  badge-streak.svg
  badge-target.svg
  badge-underdog.svg
  golden-boot.svg
  icon-refresh.svg
  icon-share.svg
  icon-logout.svg
  icon-save.svg
  design-tokens.css
```

## 推荐使用方式

1. 将 `assets` 目录复制到你的项目：

```text
public/assets/player-profile/
```

2. 将 `资料页面重构说明文档.md` 和参考图一起提供给 Agent。

3. 将 `Agent实现提示词.md` 中的提示词复制给 Agent。

4. 让 Agent 先做第一版页面，不要一次性继续优化太多。

5. 对比参考图后，再让 Agent 按验收清单逐项修正。

## 最重要的原则

不要只给 Agent 一张参考图。  
最好同时给它：

- 当前页面代码
- 参考图
- 设计说明文档
- 素材包
- 严格提示词

这样偏差最小。
