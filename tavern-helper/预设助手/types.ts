export interface LengthDefinition {
  min: number;
  max: number;
}

export interface LengthPreset {
  wc: LengthDefinition;
  pc: LengthDefinition;
}

export interface NsfwSettings {
  mode: 'off' | 'on' | 'auto';
  /** 旧配置首次迁移时为 false，避免脚本升级擅自改动用户当前总控状态。 */
  configured: boolean;
  openKeywords: string[];
  closeKeywords: string[];
  /** 摘要显示场景结束后继续保留 NSFW 指导的回合数。 */
  holdTurns: number;
  /** 总控关闭时，对带标记的世界书条目执行的过滤范围。 */
  worldbookMode: 'none' | 'blue' | 'green';
  /** 世界书条目名称中任一命中即视为 NSFW 条目。 */
  worldbookMarkers: string[];
}

export interface QuickSwitchPromptState {
  promptId: string;
  promptName: string;
  beforeEnabled: boolean;
  afterEnabled: boolean;
}

export interface QuickSwitchProfile {
  id: string;
  name: string;
  createTime: number;
  updateTime: number;
  rules: BuiltinQuickSwitchRule[];
  /** 未设置的旧数据按 global 处理。 */
  scope?: 'global' | 'character';
  /** 角色绑定支持多选；characterId 仅用于兼容旧数据。 */
  characterIds?: string[];
  characterId?: string;
}

export interface QuickSwitchRuntimeState {
  enabled: boolean;
  updateTime: number;
  beforeStates: { [promptId: string]: boolean };
  selectedPromptIds?: string[];
  modeId?: string;
  manualOverride?: boolean;
}

export type QuickSwitchDefaultSelection = 'all' | 'none' | 'remember';

export interface BuiltinQuickSwitchActionSelection {
  enabled?: boolean;
  defaultSelection?: QuickSwitchDefaultSelection;
  // Restrict sub-option popup candidates; does not change on/off execution rules.
  displayRules?: BuiltinQuickSwitchRule[];
  /** 从 BaiBai Tools 的预设分组中动态读取子条目。 */
  groups?: BuiltinQuickSwitchGroupSelection[];
}

export interface BuiltinQuickSwitchGroupAutoExclude {
  /** 自动隐藏同时被主开关 rules 命中的代表条目，默认开启。 */
  actionRules?: boolean;
  /** 自动隐藏当前关闭的子条目，默认关闭。 */
  disabledPrompts?: boolean;
  /** 自动隐藏没有正文内容的子条目/占位符，默认关闭。 */
  emptyPrompts?: boolean;
}

export interface BuiltinQuickSwitchGroupSelection {
  /** 优先使用稳定的分组 ID 精确匹配。 */
  groupId?: string;
  /** 按完整分组名匹配。 */
  groupName?: string;
  /** 按分组名包含文本匹配。 */
  groupNameIncludes?: string;
  /** 子项首次显示时的默认状态，默认为开启。 */
  defaultEnabled?: boolean;
  /** 只保留匹配这些规则的子条目。 */
  includeRules?: QuickSwitchPromptGroupMatcher[];
  /** 手动排除匹配这些规则的子条目。 */
  excludeRules?: QuickSwitchPromptGroupMatcher[];
  /** 自动排除策略；true 使用默认策略，false 全部关闭。 */
  autoExclude?: boolean | BuiltinQuickSwitchGroupAutoExclude;
}

export interface BuiltinQuickSwitchAction {
  /** 可省略；省略时直接以 groups 动态生成的子条目作为开关规则。 */
  rules?: BuiltinQuickSwitchRule[];
  selection?: BuiltinQuickSwitchActionSelection;
}

export interface BuiltinQuickSwitchMode {
  id: string;
  label: string;
  rules: BuiltinQuickSwitchRule[];
  /** 自动联动当前 API 模型时使用的正则表达式（忽略大小写）。 */
  modelPattern?: string;
  /** 切换到该模式时同步写入酒馆“以……开始回复”；空字符串表示清空。 */
  startReplyWith?: string;
}

export interface BuiltinQuickSwitchCustomize {
  /** 可选：先从 BaiBai Tools 分组读取成员，再进行分区和前缀筛选。 */
  groups?: BuiltinQuickSwitchGroupSelection[];
  /** 二级分区起始条目的正则表达式；第一个捕获组作为分区名。省略时识别“✶ ·xxx·✶”。“✧─xxx─✧”固定作为一级分组。 */
  sectionPattern?: string;
  /** 只显示这些分区；省略时显示识别到的全部分区。 */
  sectionNames?: string[];
  /** 一级、二级分类标题下方的说明小字，以识别到的不含装饰符的分类名称为键；同名分类共用说明，省略或留空时隐藏。 */
  sectionDescriptions?: Record<string, string>;
  /** 只收录具有这些前缀的子条目，并在面板中自动去掉前缀。 */
  itemPrefixes?: string[];
  /** 在面板中自动去掉匹配的条目后缀，不影响条目筛选。 */
  itemSuffixes?: string[];
  /** 是否收录首个分区标记之前的条目，默认 false。 */
  includeBeforeFirstSection?: boolean;
}

export interface BuiltinQuickSwitchRule {
  /**
   * 通过“名称包含”匹配目标 prompt（区分大小写）
   * 例如：'抢话'、'转述'、'状态栏提醒'
   */
  nameIncludes?: string;
  /**
   * 通过“完整 id”精确匹配 prompt
   */
  promptId?: string;
  /**
   * 通过“id 包含文本”匹配 prompt（区分大小写）
   */
  promptIdIncludes?: string;
  enabled: boolean;
}

export interface QuickSwitchPromptGroupMatcher {
  nameIncludes?: string;
  promptId?: string;
  promptIdIncludes?: string;
}

export interface QuickSwitchPromptGroupConfig {
  name: string;
  start: QuickSwitchPromptGroupMatcher;
  end: QuickSwitchPromptGroupMatcher;
  collapsedByDefault?: boolean;
}

export interface BuiltinQuickSwitchScheme {
  name: string;
  /** 面板分区名称；相同名称自动归入同一区，首次出现的顺序即分区顺序。 */
  section?: string;
  type?: 'toggle' | 'mode' | 'customize';
  defaultEnabled?: boolean;
  // Legacy simple form: rules === on.rules
  rules?: BuiltinQuickSwitchRule[];
  // Toggle form
  on?: BuiltinQuickSwitchAction;
  off?: BuiltinQuickSwitchAction;
  // Mode form
  modes?: BuiltinQuickSwitchMode[];
  defaultModeId?: string;
  /** customize 类型专用：按预设中的分区起始条目生成分块定制面板。 */
  customize?: BuiltinQuickSwitchCustomize;
}

export interface QRPreset {
  id: string;
  name: string;
  createTime: number;
  updateTime: number;
  wordCount: LengthDefinition;
  paragraphCount: LengthDefinition;
  paragraphStyle: 'long' | 'medium' | 'short' | 'free';
  aiMode: string;
  theme: string;
  autoTheme: boolean;
  themeMode: 'system' | 'day' | 'night';
  perspective: string;
  userPronoun: string;
  takeover: string;
  narrate: string;
  nsfw: NsfwSettings;
  commands: { [key: string]: string };
  thinkingStyle?: 'conventional' | 'minimalist';
  lengthDefinitions: {
    short: LengthPreset;
    medium: LengthPreset;
    long: LengthPreset;
  };
  quickSwitchProfiles: { [id: string]: QuickSwitchProfile };
  quickSwitchRuntimeStates?: { [id: string]: QuickSwitchRuntimeState };
}

export interface CustomQuickRequest {
  id: string;
  name: string;
  command: string;
  createTime: number;
  updateTime: number;
}

export interface StorageData {
  floatingIcon?: import('./floatingIcons').FloatingIcon;
  presets: { [id: string]: QRPreset };
  /** 独立于内置按钮和脚本预设的自定义快速要求，脚本升级时继续保留。 */
  customQuickRequests?: { [id: string]: CustomQuickRequest };
  /** 与脚本预设解耦的自定义快捷开关定义库。 */
  quickSwitchProfiles?: { [id: string]: QuickSwitchProfile };
  bindings: { [charId: string]: string };
  globalPresetId: string;
  initialized: boolean;
  /** 首次引导与按版本更新日志的阅读状态。 */
  onboarding?: {
    tutorialCompleted: boolean;
    acknowledgedChangelogVersions: string[];
  };
  /** 控制面板的宿主页面打开入口；可同时启用多个。 */
  panelEntries?: {
    floatingBall: boolean;
    quickReply: boolean;
    extensionsMenu: boolean;
  };
  /** 已自动应用的推理内容格式化配置版本。 */
  reasoningFormattingVersion?: number;
  /** 单调递增的持久化时间戳，用于从多份备份中选择最新配置。 */
  storageRevision?: number;
}

export interface ButtonApi {
  appendButtons: ((buttons: Array<{ name: string; visible: boolean }>) => unknown) | null;
  replaceButtons: ((buttons: Array<{ name: string; visible: boolean }>) => unknown) | null;
  getButtonEvent: ((name: string) => string | null | undefined) | null;
  eventOn: ((eventName: string, handler: (...args: any[]) => any) => unknown) | null;
}

export interface RuntimeState {
  stagedPrompts: PresetPrompt[] | null;
  tempThinkingStyle: 'conventional' | 'minimalist' | null;
  panel: JQuery<HTMLElement> | null;
  styleTag: JQuery<HTMLElement> | null;
  faLink: JQuery<HTMLElement> | null;
  editingPresetId: string | null;
}
