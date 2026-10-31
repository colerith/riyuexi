# 日月西 · 段评美化

当前版本：1.3.1。酒馆助手后台脚本，识别正文 `<hc>…</hc>`，提供七套段评皮肤。

## 安装

- 推荐直接导入 [本地版 JSON](release/novel-comments-v1.3.1/novel-comments-local.json)。也可复制 [本地 JS](release/novel-comments-v1.3.1/novel-comments-local.js) 的完整内容到酒馆助手脚本中。
- [网络版 JSON](release/novel-comments-v1.3.1/novel-comments-network.json) 使用 CDN 加载本版程序。网络版与本地版只启用一个，升级时重新导入新版。
- 脚本按钮「段评设置」可打开设置。提示词使用 [提示词.txt](提示词.txt)。已有旧格式段评仍可显示。

## 本版功能

- 2,000 赞起显示右上角「神评论」印章；爱心可点赞和取消。
- 顶部提供默认 / 热门 / 最新排序，原地移动评论节点，保持原楼层、头像和点赞状态。
- 统一按钮图标盒子、基线与文字间距；手机端保留完整触摸点击区域。
- 所有气泡共用一份构造样式表（不支持时自动回退）；正文滚动不挂阻塞触摸监听，移动端降低背景模糊开销。
- 生成期间暂停聊天 DOM 观察，结束/停止后统一扫描。切换全局皮肤时保留阅读位置。

- 晋江、LOFTER、AO3、纸笺、夜读、空明、格子图纸：都有头像、称号、等级、日期和可取消的点赞。
- 内置 320 张头像（Open Peeps、Notionists、Pixel Art、Micah、Lorelei、Adventurer、Fun Emoji、Personas），程序和头像离线可用。头像/等级按 ID 稳定分配；日期、初始赞数为本地随机模拟数据，不是实际网友活动。
- 点赞按聊天和评论分别保存到脚本变量。换皮肤、重新打开或重载不会重置；保存失败不会假装成功。
- 每套皮肤各有五色徽章库，称号文字由提示词产生，等级自动生成。
- 情绪关键词自动配内置颜文字；长标签、合并标签和中英文 ID 均可识别，不显示字数或标签长度警告。
- 生成期间仅收集变更，结束/停止后防抖合并渲染。滚动条隐藏，保留滚轮、触摸及键盘滚动。

新格式：

```text
<hc>嗑糖|276|#专业团队|#眼神锁死路线|#八十公分滑道|NoSleep_404【熬夜冠军】：评论内容|ghost.exe【Certified Hater】：另一条评论</hc>
```

情绪支持：开心、嗑糖、爆笑、震惊、心疼、吐槽、无语、生气、吃瓜、悬疑；也支持 happy/sweet/funny/shock/sad/roast/speechless/angry/gossip/mystery。旧版完整颜文字和无称号 ID 仍可使用。

## 构建

独立使用本目录（Node.js 22+）：

```sh
npm ci
npm run build
npm test
```

每次构建自动写入 `release/novel-comments-v版本号/`，包括本地 JS、固定版本主文件、网络加载 JS、两种导入 JSON、提示词和 SHA-256 清单。版本从 `release.json` 读取；发布新版前递增版本并同步 package.json。

在酒馆助手模板工作区：`pnpm build:comments` 单独构建到 `release/段评/`；正常 `pnpm build` / `pnpm watch` 编译本入口后也自动生成同样的本地文件。回归检查：`pnpm test:comments`。

`avatars.pack.txt` 内置 8 组 96px WebP 头像；编译前完成 SVG 栅格化和压缩，运行时只按需读取对应分组，由浏览器异步解码图片，不再执行 gzip 解压或 SVG 解析。`npm run generate:avatars` 可以重新生成，不会在日常构建时联网下载头像。

## 素材与许可

头像参考电波手机的多风格分配方式。设计来自 Pablo Stanley、Zoish、DiceBear、Micah Lanier、Lisa Wischofsky、The Visual Team、Draftbit 等作者；具体原作、CC0 / CC BY 4.0 许可及 WebP 加工说明见 `AVATAR-LICENSE.txt`。生成器只在构建工具中使用 DiceBear 与 sharp；运行时无需这两项依赖。图标使用酒馆已有 Font Awesome 字体。

保留原「纸间 · 小说段评」代码中的 MIT 标注与署名；提示词原署名见文件首行。

## 新增皮肤与字体

日月西（暖白朱砂 / 深蓝月色）、水母枯蝶（粉蓝 / 灰紫）均可独立选择日间、夜间或昼夜自动，自动按本地时间 06:00–18:00 日间切换。采用静态渐变，无持续粒子动画。

字体支持跟随皮肤、思源宋体、思源黑体、苹方、微软雅黑、楷体、宋体及自定义 HTTP(S) 字体直链（TTF / OTF / WOFF2）。预设字体使用本机安装字体，缺失时回退；直链需支持跨域，加载时保持系统字体显示。勾选框与字号滑条跟随皮肤配色，滚动条隐藏但保留滚动操作。

### v1.3.2
统一九套皮肤的引用区间距：排序栏下增加留白，收紧标签与首条评论之间的空隙；日夜模式一致生效。

日月西与水母枯蝶的阅读标题采用原摘要美化的花体文案，日夜分别显示 Amaterasu / Tsukuyomi、Aurelia / Papilio 及对应副标题。
