# 日月西 · 段评美化

当前版本：1.3.0。酒馆助手后台脚本，识别正文 `<hc>…</hc>`，提供七套段评皮肤。

## 安装

- 推荐直接导入 [本地版 JSON](release/novel-comments-v1.3.0/novel-comments-local.json)。也可复制 [本地 JS](release/novel-comments-v1.3.0/novel-comments-local.js) 的完整内容到酒馆助手脚本中。
- [网络版 JSON](release/novel-comments-v1.3.0/novel-comments-network.json) 使用 CDN 加载本版程序。网络版与本地版只启用一个，升级时重新导入新版。
- 脚本按钮「段评设置」可打开设置。提示词使用 [提示词.txt](提示词.txt)。已有旧格式段评仍可显示。

## 本版功能

- 晋江、LOFTER、AO3、纸笺、夜读、空明、格子图纸：都有头像、称号、等级、日期和可取消的点赞。
- 内置 240 张 Open Peeps 头像，程序和头像离线可用。头像/等级按 ID 稳定分配；日期、初始赞数为本地随机模拟数据，不是实际网友活动。
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

`avatars.pack.txt` 是 240 张 SVG 的 gzip/base64 数据，启动时由内置 fflate 解压一次。`npm run generate:avatars` 可以重新生成，不会在日常构建时联网下载头像。

## 素材与许可

Open Peeps：Pablo Stanley 原作、DiceBear 改编，设计 CC0 1.0，生成器代码 MIT。来源：https://www.openpeeps.com/ ，https://www.dicebear.com/styles/open-peeps/ 。完整信息见 `AVATAR-LICENSE.txt`。fflate MIT 许可见 `FFLATE-LICENSE.txt`。图标使用酒馆已有 Font Awesome 字体。

保留原「纸间 · 小说段评」代码中的 MIT 标注与署名；提示词原署名见文件首行。
