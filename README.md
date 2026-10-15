# 日月西发布文件

## 预设助手

当前版本：`0.42.9`

### Git 缓存加载版

打开 [Git 加载器](file/preset-helper-git-loader-0.42.9.js)，复制完整内容到酒馆助手的脚本代码中。
它会从 Fastly、JSDMirror、GitHub 依次尝试下载，通过 SHA-256 校验后运行，并使用 IndexedDB 缓存。
首次运行需要联网；之后优先启动缓存版，后台检查更新，下次重载生效。浏览器禁用缓存时仍可在线运行。
加载器自身和主文件均不需要额外下载 npm 模块；SHA-256 实现的许可证见 `git-loader/SHA256-LICENSE.txt`。
原有导入版和 Git 加载版只启用其中一个，避免出现两个运行实例。

后续发布会更新根目录 `preset-helper-release.json`。主脚本保留固定版本标签，更新不会覆盖旧文件。

### 固定版本导入

酒馆助手在线导入：

```js
import "https://fastly.jsdelivr.net/gh/colerith/riyuexi@v0.42.9/file/index-0.42.9.js";
```

- `file/index-0.42.9.js`：生产构建，内置 klona，按版本保留，不覆盖旧文件。
- `tavern-helper/预设助手/`：对应版本的源码；共享滚动隔离依赖见根目录 `overlay.ts`。
- `tavern-helper/预设助手/发布流程.md`：后续版本打包与推送步骤。

仓库原有的 `ads_v4.json` 与预设助手发布相互独立。
