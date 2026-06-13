---
name: project-comprehensive-review
overview: 对世界杯朋友群观赛竞猜站项目进行全维度审查，覆盖安全、性能、代码质量、架构、UI/UX、运维等方面，输出结构化审查报告。
todos:
  - id: security-review
    content: 执行安全性审查 -- 检查 ai.ts:180 硬编码密码、config.ts:52 默认弱密码、helpers.ts 中 console.log 泄露敏感信息、WebSocket auth 无验证、checkin.ts:150 用 adminPassword 做 token 比对
    status: completed
  - id: code-quality-review
    content: 执行代码质量审查 -- 统计 tsconfig strict 缺失项、前端 any 类型分布（重点 AdminPanel.tsx 25处）、源码中 23 处 console.log 替换、零测试覆盖评估
    status: completed
  - id: performance-review
    content: 执行性能审查 -- 分析 Vite 构建配置缺失代码分割、统计全表扫描接口、评估 Admin sessions JSON 同步写入阻塞风险
    status: completed
  - id: architecture-review
    content: 执行架构审查 -- 检查 DatabaseSchema 内联 import 耦合、env_validator.ts 环境变量标记准确性、room-1 硬编码分布（src/ 中 17+ 处）
    status: completed
  - id: deploy-docs-review
    content: 执行部署与文档审查 -- 检查 Google Fonts 国内加载方案、PWA 图标缺失、Dockerfile 构建完整性、根目录散落文件清理、.env.example 与 config.ts 一致性
    status: completed
  - id: generate-review-report
    content: 汇总五维审查结果，生成结构化审查报告，按严重程度排序，附具体文件路径、行号和修复建议
    status: completed
    dependencies:
      - security-review
      - code-quality-review
      - performance-review
      - architecture-review
      - deploy-docs-review
---

## 项目审查范围

对 **2026 美加墨世界杯朋友群观赛竞猜站 v2.3.0** 进行一次完整的代码与项目审查，覆盖安全性、代码质量、性能、架构设计、部署与文档五大维度，输出结构化审查报告和可执行的优化任务清单。

## 审查发现概要

| 维度 | 问题数 | 严重 | 高 | 中 | 低 |
| --- | --- | --- | --- | --- | --- |
| 安全性 | 5 | 2 | 2 | 1 | 0 |
| 代码质量 | 5 | 0 | 1 | 2 | 2 |
| 性能 | 3 | 0 | 1 | 2 | 0 |
| 架构设计 | 3 | 0 | 1 | 2 | 0 |
| 部署/文档 | 4 | 0 | 0 | 2 | 2 |
| **总计** | **20** | **2** | **5** | **9** | **4** |


## 核心发现

1. **管理员密码明文硬编码** — ai.ts:180 硬编码 `adminPassword: 'admin'`，config.ts:52 默认弱密码 `admin_worldcup2026`
2. **无用户认证体系** — 登录仅靠 loginCode 字符串比对，无 JWT/Session，可被冒充
3. **TypeScript 未启用 strict** — tsconfig.json 缺失 strict、noUnusedLocals 等关键选项
4. **前端 any 类型泛滥** — 49 处 any 类型，AdminPanel.tsx 独占 25 处
5. **零单元测试** — 全项目无任何测试文件

## 审查方法

采用**五维审查法**，每个维度按优先级（严重/高/中/低）分类，每条问题附：文件路径、行号、当前代码、风险说明、修复建议。

## 审查工具与手段

- 静态代码分析：直接读取源码，检查类型安全、错误处理、安全模式
- 搜索工具：全量搜索 console.log、any 类型、硬编码、TODO/FIXME
- 配置审查：检查 tsconfig、vite、docker-compose、.env.example 完整性
- 架构审计：对照现有设计文档（补充优化v1.md、项目审查与优化建议.md）确认未修复项

## 审查维度定义

1. **安全性**：认证授权、密码存储、敏感信息泄露、CORS、安全头
2. **代码质量**：TypeScript 严格模式、类型安全、日志规范、测试覆盖、命名规范
3. **性能**：构建优化、数据查询效率、渲染性能、资源加载
4. **架构设计**：模块耦合度、数据库设计、状态管理、扩展性
5. **部署/文档**：环境变量完整性、部署配置、文档同步、文件清理

## 审查使用的 Agent 扩展

### SubAgent

- **code-explorer**
- 目的：深度扫描项目源码，定位具体问题所在文件和行号
- 预期结果：获取每个问题的精确文件路径、行号和代码片段

### Skill

- **data-analysis-workflows**
- 目的：对审查结果进行结构化统计和分类，生成可视化问题分布图
- 预期结果：输出按维度/优先级分组的问题统计表和优先级矩阵