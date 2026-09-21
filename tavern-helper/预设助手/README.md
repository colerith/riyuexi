# 预设助手 README（模块地图）

本文档用于后续维护、重构和 AI 改写时快速定位代码。

## 目录结构（含功能标注）

```text
预设助手/
├─ index.ts            # 入口与胶水层：组装模块、初始化、面板生命周期
├─ types.ts            # 公共类型定义（Preset/Storage/QuickSwitch 等）
├─ constants.ts        # 常量与默认配置（defaultPreset、内置方案、命令模板）
├─ state.ts            # 运行时状态与存储读写（storage/activeSettings 等）
├─ templates.ts        # 静态 UI 模板与样式字符串（panelHtml/welcomeHtml/panelCss）
├─ ai.ts               # 将当前预设注入酒馆变量（injectSettingsToAI）
├─ thinking.ts         # 思维模式切换与 prompt 开关计算/应用
├─ quickSwitch.ts      # 快捷开关快照、规则解析、应用与还原
├─ actions.ts          # 总结/大纲/快速要求动作与指令模板
├─ panel.ts            # 视图渲染与面板 UI 工具（主题、状态、预设编辑、高亮等）
├─ events.ts           # 事件绑定与交互控制（导航、按钮动作、编辑交互）
├─ bootstrap.ts        # 启动与酒馆按钮 API 适配（注册按钮/自动切换监听）
└─ README.md         # 当前文件：README化后的维护说明
```

## 模块职责说明

- `index.ts`
  - 负责模块装配与依赖注入。
  - 管理 `showPanel/hidePanel`、初始化流程、`pagehide` 清理。
  - 原则：尽量不写业务细节，业务逻辑下沉到 `panel.ts` / `events.ts` / `actions.ts`。

- `panel.ts`
  - 负责“渲染与展示”，不处理复杂业务分支。
  - 典型函数：`renderStatusDisplay`、`renderPresetsList`、`renderPresetEditor`、`renderQuickSwitchPanel`、`showWelcomePopup`。
  - 主题工具：`setPanelTheme`、`toggleTheme`、`updateThemeToggleButton`、`applyDialogTheme`。

- `events.ts`
  - 负责“用户操作 -> 调用业务模块”。
  - 典型函数：`bindPanelNavigation`、`bindGeneralActionHandler`、`bindEditorSettingHandler`。
  - 约束：尽量通过 deps 注入所需方法，减少模块循环依赖。

- `state.ts`
  - 负责脚本存储结构、迁移、激活预设选择与保存。
  - 变更 `storage/activeSettings` 时，优先走这里的 helper，避免多处直接改写。

- `thinking.ts` / `quickSwitch.ts`
  - 负责 Prompt 级别开关逻辑（思维模式、快捷开关快照/还原）。
  - 与酒馆预设 API 对接时通过依赖注入，保持可测试与可替换。

- `actions.ts`
  - 负责“发送什么指令”，不负责“按钮怎么绑定”。
  - 修改总结/大纲/快速要求文案时优先在此文件进行。

- `ai.ts`
  - 负责将预设映射为全局变量。
  - 修改变量字段名或注入策略时只改这一层。

- `bootstrap.ts`
  - 负责与 TavernHelper 按钮 API 的兼容解析与注册。
  - 适合处理宿主环境差异，不放业务逻辑。

## 维护约定（给后续 AI / 开发者）

- 新增功能优先判断归属：
  - 纯展示 -> `panel.ts`
  - 交互绑定 -> `events.ts`
  - 指令文本 -> `actions.ts`
  - 持久化结构 -> `state.ts` + `types.ts` + `constants.ts`
  - Prompt 切换 -> `thinking.ts` / `quickSwitch.ts`

- 尽量避免在 `index.ts` 增加长函数；`index.ts` 保持“入口文件”定位。

- 涉及存储结构变更时：
  - 同步更新 `types.ts`、`defaultPreset`、`loadStorage` 迁移逻辑。

- 修改后最低验证：
  - `pnpm eslint src/util/酒馆助手脚本/预设助手/*.ts`
  - `pnpm build:dev`

## 当前收尾状态

- 已完成模块化拆分，主要职责已落位。
- `index.ts` 仍保留少量胶水函数，后续可继续精简为更纯粹入口。
