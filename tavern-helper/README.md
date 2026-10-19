# 预设助手源码

当前发布版本：`1.0.4`

- `预设助手/`：酒馆助手脚本源码。
- `../file/index-1.0.4.js`：生产构建；直接导入酒馆时推荐根目录 README 中的压缩本地版 JSON。
- `发布流程.md`：版本递增、构建、提交和 jsDelivr 使用说明。

## 0.42 优化版独立通道

同一套当前源码另行发布 `v0.42.10`，功能保持一致，最新日志使用提供的 v0.42 原文，不显示 v1.0 日志。v1.0.4 最新日志使用提供的 v1.0 原文，保留历史日志。

0.42 通道使用 `preset-helper-release-v042.json` 和 `preset-helper-git-loader-v042` 缓存库，与 v1 通道隔离。旧 `preset-helper-release.json` 不变；旧加载器需手动导入一次新版本。两个版本及网络/本地安装包均只启用一个。

模板项目构建：`pnpm build:preset 0.42.10`；v1 构建：`pnpm build:preset 1.0.4`。默认 `pnpm build` 仍为 v1 日志。用户原文位于源码 `changelogs/` 中，`entries.ts` 只转换排版；测试检查文本一致性。
