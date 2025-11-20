# Git Message Board

GitLab 消息面板，帮助你更高效地查看项目的事件流、提交记录与流水线状态。

## 功能概览

- 项目侧边栏
  - 加载当前用户的 GitLab 项目（需配置主机与访问令牌）
  - 支持搜索、收藏/取消收藏、打开项目网页
  - 一键切换到“查看全部事件”
- 事件流（All Events）
  - 拉取 GitLab 全局事件，支持“只看本人/查看所有”切换
  - 分页加载“加载更多”，网络错误友好提示
  - 点击事件中的分支或项目，跳转到对应项目的提交视图
- 提交记录（Commits）
  - 按分支浏览提交，时间范围与作者筛选，支持“只看本人”
  - 时间线式展示、复制提交哈希、基础提交信息展示
  - 可选：AI 智能总结（需配置 OpenAI），快速总结近期提交变更
- 流水线（Pipelines）
  - 按状态与 `ref`（分支/标签）筛选流水线，支持倒序查看
  - 自动补充提交详情（展示简短提交信息）
- AI 对话（全局悬浮按钮）
  - 右下角绿色按钮打开单实例 AI 对话，跨页面共享
  - 自动读取上下文：在“所有事件/提交记录”页面传入当前数据；无数据时正常聊天
  - 支持快捷操作：“事件摘要”“提交总结”
  - 加载状态带旋转动画；点击“上下文”标签可预览当前上下文数据
- 设置与配置
  - GitLab：主机地址、访问令牌、作者邮箱（“只看本人”筛选可用）
  - OpenAI：`API Key`、`Base URL`、`Model`（用于生成提交记录摘要，可选）

## 快速开始

- 环境要求
  - Node.js ≥ 18
  - npm ≥ 9（或使用 pnpm/yarn 均可）

- 开发运行
  - 安装依赖：`npm install`
  - 启动开发：`npm run dev`
  - 浏览器访问：Vite 控制台会输出本地地址（如 `http://localhost:5173/` 或 `http://localhost:5174/`）

- 生产构建
  - 执行：`npm run build`
  - 输出目录：`dist/`

## 使用说明

- 首次使用
  - 打开右上角“设置”，在“GitLab 配置”中填写：
    - `GitLab 主机`（例如 `https://gitlab.com` 或你的私有实例地址）
    - `访问令牌`（PRIVATE-TOKEN）
    - `作者邮箱`（可选，用于“只看本人”筛选）
  - 如需启用 AI 总结，在“OpenAI 配置”中填写：
    - `API Key`、`Base URL`（默认 `https://api.openai.com/v1`）、`Model`（默认 `gpt-3.5-turbo`）

- 常见操作
  - 左侧侧栏选择项目后，右侧可切换“提交记录 / 流水线”标签
  - 在“所有事件”页，可切换“只看本人”，并使用“加载更多”查看更多事件
  - 在“提交记录”页，可选择分支、筛选日期与作者、复制提交哈希
  - 在“流水线”页，可按状态与 `ref` 过滤，并查看相关提交的简要信息
  - 点击右下角绿色悬浮按钮打开 AI 对话：在“所有事件/提交记录”页面会自动包含上下文数据；无数据时进行普通对话
  - 在 AI 对话框右侧，点击“上下文：X 条数据（点我查看）”可预览传入的数据
  - 使用“事件摘要”“提交总结”快捷按钮快速获取结果

## uTools 插件支持

本项目可作为 uTools 插件使用。插件元数据位于 `public/plugin.json`，预加载脚本在 `public/preload/services.js`（构建后位于 `dist/preload/services.js`）。

- 开发调试：`plugin.json` 的 `development.main` 指向本地开发地址
- 构建发布：执行 `npm run build` 后，`dist/` 中包含 `plugin.json` 与静态资源，可按 uTools 官方文档打包导入

> 说明：uTools 环境下通过 `preload/services.js` 注入 Node 能力（如请求、文件等），在浏览器开发环境中由 `src/dev-services.js` 提供等价的模拟。

## 目录结构（简要）

```
Git Message Board/
├── public/
│   ├── plugin.json          # uTools 插件元数据（开发指向本地）
│   └── preload/services.js  # uTools 预加载脚本（Node 能力注入）
├── src/
│   ├── App.vue              # 应用布局与设置弹窗
│   ├── ProjectSidebar/      # 项目侧栏（搜索/收藏/选择）
│   ├── GitLabEvents/        # 所有事件视图
│   ├── GitLabCommits/       # 提交记录视图（含 AI 总结）
│   ├── GitLabPipelines/     # 流水线视图
│   ├── components/
│   │   └── AIDialog.vue     # 全局 AI 对话抽屉
│   ├── ai-context.js        # 全局 AI 上下文共享（页面推送，App 读取）
│   ├── ai-templates.js      # AI 提示模板（事件摘要/提交总结）
│   ├── ai.js                # OpenAI 调用封装
│   ├── dev-services.js      # 开发环境下的 services 模拟
│   ├── global.d.ts          # 全局类型声明（window.services/utools）
│   └── main.js              # 入口与 Element Plus 挂载
├── index.html               # 页面入口
├── tsconfig.json            # TypeScript 配置（ES/DOM lib、类型支持）
├── package.json             # 脚本与依赖
└── vite.config.js           # Vite 配置
```

## 开发提示

- TypeScript 与类型支持
  - 项目包含 `tsconfig.json`，启用 `lib: ["ES2020", "DOM"]` 等，确保 `async/await` 与 `Promise` 类型正确。
  - 在 `src/global.d.ts` 中声明 `window.services` 与 `window.utools`，避免在 TS 代码中出现类型不存在的诊断。
- 环境注入
  - 生产/插件环境通过 `public/preload/services.js` 注入 `window.services`。
  - 开发环境未检测到注入时，`src/main.js` 会自动加载 `src/dev-services.js` 提供等价模拟。
- Drawer 样式与 teleport
  - `el-drawer` 会 teleport 到 `body`，头部样式通过组件内的全局样式 `.ai-drawer .el-drawer__header` 覆盖（不受 scoped 限制）。
- AI 对话与悬浮按钮
  - 全局悬浮按钮位于 `App.vue`，类名 `.floating-ai-button`。对话框读取来自各页面推送的上下文。
  - 加载状态使用 `loading-inline` 旋转动画；点击“上下文”标签可预览当前上下文数据。

## 技术栈

- 前端框架：Vue 3
- UI 组件：Element Plus
- 构建工具：Vite

## 致谢

- GitLab API
- Element Plus
- Vite 与 Vue 社区