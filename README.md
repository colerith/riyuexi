# 日月西发布文件

## 预设助手

当前版本：`v1.0.4`

### Git 缓存加载版

导入 [Git 网络版 JSON](file/preset-helper-git-loader-1.0.4.json)，或将 [Git 加载器](file/preset-helper-git-loader-1.0.4.js) 的完整内容复制到酒馆助手的脚本代码中。
更新清单优先从 GitHub 获取，失败后回退 CDN；固定版本主文件依次尝试 Fastly、JSDMirror、GitHub，通过 SHA-256 校验后运行，并使用 IndexedDB 缓存。
首次运行需要联网；之后优先启动缓存版，后台检查更新，下次重载生效。浏览器禁用缓存时仍可在线运行。
加载器自身和主文件均不需要额外下载 npm 模块；SHA-256 实现的许可证见 `git-loader/SHA256-LICENSE.txt`。
原有导入版、Git 加载版和本地版只启用其中一个，避免出现两个运行实例。

v1 后续发布更新根目录 `preset-helper-release-v1.json`。主脚本保留固定版本标签，更新不会覆盖旧文件。
旧 `0.42.x` 加载器限制了版本格式，需要手动更换一次新版加载器。旧清单 `preset-helper-release.json` 保持不变，旧版仍可使用。

### 离线压缩本地版

直接导入 [本地版 JSON](file/preset-helper-local-1.0.4.json)，也可复制 [本地版 JS](file/preset-helper-local-1.0.4.js) 的完整内容。
主程序、三个图标和解压代码全部内置，不下载程序、不自动更新。首次运行即能离线加载；需要联网的业务功能仍按原设置工作。
本地版 JS 约 299 KB，普通主程序约 551 KB，旧版约 2.88 MB。功能与 Git 版相同，原尺寸图片已换成适合悬浮球的 128px 内嵌图标。
本地版解压器许可证见 `git-loader/FFLATE-LICENSE.txt`。模板项目执行 `pnpm build:preset` 可同时生成两种加载版及导入 JSON。

### 固定版本导入

酒馆助手在线导入：

```js
import "https://fastly.jsdelivr.net/gh/colerith/riyuexi@v1.0.4/file/index-1.0.4.js";
```

- `file/index-1.0.4.js`：生产构建，内置 klona，按版本保留，不覆盖旧文件。
- `tavern-helper/预设助手/`：对应版本的源码；共享滚动隔离依赖见根目录 `overlay.ts`。
- `tavern-helper/预设助手/发布流程.md`：后续版本打包与推送步骤。

仓库原有的 `ads_v4.json` 与预设助手发布相互独立。

## 0.42 优化版独立通道

同一套当前源码另行发布 `v0.42.10`，功能保持一致，最新日志使用提供的 v0.42 原文，不显示 v1.0 日志。v1.0.4 最新日志使用提供的 v1.0 原文，保留历史日志。

0.42 通道使用 `preset-helper-release-v042.json` 和 `preset-helper-git-loader-v042` 缓存库，与 v1 通道隔离。旧 `preset-helper-release.json` 不变；旧加载器需手动导入一次新版本。两个版本及网络/本地安装包均只启用一个。

模板项目构建：`pnpm build:preset 0.42.10`；v1 构建：`pnpm build:preset 1.0.4`。默认 `pnpm build` 仍为 v1 日志。用户原文位于源码 `changelogs/` 中，`entries.ts` 只转换排版；测试检查文本一致性。

- [0.42 网络版 JSON](file/preset-helper-git-loader-0.42.10.json)
- [0.42 本地版 JSON](file/preset-helper-local-0.42.10.json)
