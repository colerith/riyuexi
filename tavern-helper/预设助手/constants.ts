import { DEFAULT_NSFW_SETTINGS } from './nsfw';
import type { BuiltinQuickSwitchScheme, QRPreset } from './types';

export const SCRIPT_ID = getScriptId();

export const THINKING_ENTRIES = {
  OUTPUT_ORDER: '输出顺序',
  CONVENTIONAL: '常规创作思维',
  SPECIAL: '特殊模式思维',
} as const;

// Default commands
export const defaultCommands = {
  paragraph_patch_long: `[长段落补丁]
- 排版策略：沉浸式长段落，拒绝碎片化换行
- 单段字数：严格控制在 250-600 字
- 执行要求：将对话、动作、环境、心理整合为高密度完整段，形成连续推进的叙事块
- 禁止事项：禁止一两句就换段；禁止把同一场景拆成流水账短句`,
  paragraph_patch_short: `[短段落补丁]
- 排版策略：紧凑推进，保留清晰节拍
- 单段字数：控制在 90-180 字
- 执行要求：短而完整，每段都要有明确事件点或情绪变化
- 禁止事项：禁止口水化断句；禁止连续超短句堆叠`,
  paragraph_patch_free: `[自由段落补丁]
- 排版策略：长短错落，制造呼吸感，不走单一模板
- 单段字数：在 180-400 字之间动态波动
- 执行要求：依据“对话可短脆、描写须深邃”灵活配比；段内保持叙事完整，必要时用长段承载关键场景
- 禁止事项：严禁高频换行；严禁把对话、动作、心理切成零散碎段`,
  paragraph_patch_medium: `[中段落补丁]
- 排版策略：均衡段落，兼顾阅读节奏与信息密度
- 单段字数：控制在 180-320 字
- 执行要求：每段至少覆盖一个完整动作链或情绪链，段内保持因果衔接
- 禁止事项：禁止高频空行；禁止把描述切成机械句群`,
  perspective_third_person_omniscient:
    '叙述视角：第三人称全知\n- 以全知第三人称进行叙事\n- 可在出场非<user>人物视角间切换',
  perspective_third_person_limited:
    '叙述视角：第三人称有限\n- 以char的限定第三人称（他/她/角色名）进行叙事，每场景只展现char的所见所思\n- 可在出场非<user>人物视角间切换',
  perspective_first_person_limited:
    '叙述视角：第一人称有限\n- 以角色的第一人称“我”进行叙事\n- 可在出场非<user>人物视角间切换',
  perspective_floating_person:
    '叙述视角：飘浮人称\n- 允许根据场景张力、心理距离与信息需求，在第一人称有限、第三人称有限、第三人称全知之间自然切换\n- 句内与单段内的人称必须稳定，不得在同一句里来回漂移\n- 切换时要让上下文顺滑可读，避免生硬跳视角',
  userPronoun_third_person:
    '始终使用第三人称（他/她/姓名）来描述<user>，绝对禁止使用“你”，将AI自身定位为叙述者而非对话者',
  userPronoun_second_person: '始终使用第二人称“你”来指代<user>，当其与角色互动时，则使用“你们”',
  userPronoun_first_person: '始终使用第一人称“我”来指代<user>',
  userPronoun_floating_person:
    '允许根据叙事距离与语境，在第一人称“我”、第二人称“你”、第三人称（他/她/姓名）之间灵活选择<user>的人称；但同一句与同一小段内必须保持一致，切换时需自然清晰，绝对禁止无意义频繁跳变',
  takeover_open:
    '[演绎<user>言行]\n收到<user>的最后输入：\n<user_input>\n{{lastUserMessage}}  \n</user_input>\n\n你的任务：作为<user>的“代理人”或“提线木偶”，你必须接管<user>的控制权\n行动要求：\n1. 必须以<user>的视角和人设，为其撰写接下来完整的对话和伴随动作\n2. 你的描写需要自然地推动剧情发展，仿佛<user>本人在操作',
  takeover_half_open:
    '[演绎<user>行动]\n收到<user>的最后输入：\n<user_input>\n{{lastUserMessage}}  \n</user_input>\n\n你的任务：作为<user>的“动作代理人”，你必须接管<user>的身体控制权，但不能控制其言语\n行动要求：\n1. 必须以<user>的视角和人设，为其撰写3-4个连贯的、纯粹的动作描写\n2. 绝对禁止为<user>生成任何形式的对话、内心独白或语气词',
  takeover_assist:
    '[辅助<user>行动]\n收到<user>的最后输入：\n<user_input>\n{{lastUserMessage}}  \n</user_input>\n\n你的任务：作为<user>的“动作补全器”，在不夺走控制权的前提下补齐可执行细节\n行动要求：\n1. 仅可补充1-2个与当前语义直接相关的动作或状态细节，用于让场景更顺畅\n2. 禁止代写<user>核心决策、立场与完整对话\n3. 补充内容必须短、准、贴合上下文，不能喧宾夺主',
  takeover_closed:
    '[不演绎<user>言行]\n收到<user>的最后输入：\n<user_input>\n{{lastUserMessage}}  \n</user_input>\n\n你的任务：作为一名绝对的旁观者，你丧失对<user>的一切控制权；但当“转述开关”允许时，你可以先按转述规则承接<user>语义，再继续只扮演char和NPC\n行动要求：\n1. 若转述授权为开放/平衡/轻度：先严格按对应转述规则完成承接；该转述属于叙事承接，不视为代写<user>言行\n2. 转述完成后，绝对禁止新增或扩写<user>的对话、动作、心理、立场与决策\n3. 若转述授权为禁止：绝对禁止描写、引用、概括<user>的任何言行或心理，只扮演char和NPC',
  narrate_open:
    '[开放转述<user>]\n你会将<user>的对话内容完整且无缝地融入叙事描写中，使其成为场景互动的一部分。严禁完全重复原对话',
  narrate_balanced:
    '[平衡转述<user>]\n你可以转述<user>输入的核心信息，但必须先压缩再融入场景。优先保留“意图、情绪、结果”，避免逐句复读与同义改写堆叠',
  narrate_light:
    '[轻度转述<user>]\n仅在必要时用极短提示承接<user>语义，默认直接推进NPC反应与剧情发展，避免显性复述<user>原话',
  narrate_closed:
    '[禁止转述<user>]\n你拒绝复读与注水。你绝不引用、重复或概括<user>的上文输入，直接承接语义，零延迟地进入NPC的即时反应与情节推进',
};

/**
 * 内置快捷开关方案（脚本作者改这里即可）
 *
 * 规则说明：
 * - 支持三类主条目：
 *   1) type='toggle'：开关型，支持 on/off 不同行为
 *   2) type='mode'：模式型，支持在多个模式间切换
 *   3) type='customize'：纯定制型，没有主开关；确认后直接同步所有子条目的实际状态
 * - toggle 兼容旧写法：rules 等价于 on.rules
 * - section 用于面板分区：
 *   - 相同 section 的条目会自动放在同一区
 *   - 分区按首次出现顺序显示
 *   - 直接填写一个新的 section 名称即可新增分区；省略时归入“其他”
 * - customize 会按预设里的分区起始条目自动分块：
 *   - “✧─xxx─✧”是一级大分组
 *   - “✶ ·xxx·✶”和“★ ·xxx· ★”是一级分组下的二级分区
 *   {
 *     name: '🎨风格定制',
 *     section: '预设组件',
 *     type: 'customize',
 *     customize: {
 *       groups: [{
 *         groupName: '你的柏柏分组名',
 *         excludeRules: [{ nameIncludes: '不需要显示的条目' }],
 *         // 分区起始条目通常是空内容，不能开启 emptyPrompts 排除
 *         autoExclude: { actionRules: false, emptyPrompts: false },
 *       }],
 *       sectionNames: ['总体风格', '气氛点缀'], // 可省略，省略时显示全部识别分区
 *       sectionDescriptions: { 总体风格: '选择整体叙事风格', 气氛点缀: '补充场景的情绪与氛围' },
 *       // 一级、二级分类均支持：键填写识别到的不含装饰符的分类名，同名分类共用说明，省略或留空则不显示
 *       itemPrefixes: ['🪐', '🎈'],             // 只收录这些前缀，并在按钮上隐藏前缀
 *       itemSuffixes: ['┘', '┐'],               // 在按钮上隐藏匹配的后缀，不影响条目筛选
 *       // sectionPattern: '^✶\\s*·\\s*(.+?)\\s*·\\s*✶$', // 可选自定义正则，第一个捕获组是分区名
 *     },
 *   }
 * - on.selection.defaultSelection 可选：
 *   - 'all'：子项默认全选
 *   - 'none'：子项默认不选
 *   - 'remember'：优先使用上次子项选择
 * - on.selection.displayRules 可选：
 *   - 仅控制“子项弹窗里显示哪些条目”，不改变 on/off 实际执行范围
 * - on.selection.groups 可选：
 *   - 从 BaiBai Tools 的 extensions.baibaiToolkit.presetPromptGroups 动态读取分组成员
 *   - 可用 groupId、groupName 或 groupNameIncludes 指定分组
 *   - excludeRules 手动隐藏多余条目，includeRules 可作为白名单
 *   - autoExclude 默认自动隐藏与主开关 rules 重叠的代表条目，也可额外隐藏关闭/空内容条目
 *   - 示例：
 *     groups: [{
 *       groupName: '涩涩控制',
 *       excludeRules: [{ nameIncludes: '废弃' }],
 *       autoExclude: { actionRules: true, emptyPrompts: true },
 *     }]
 * - 支持三种匹配方式：
 *   1) prompt.name 包含 nameIncludes
 *   2) prompt.id 精确等于 promptId
 *   3) prompt.id 包含 promptIdIncludes
 */
export const BUILTIN_QUICK_SWITCH_SCHEMES: BuiltinQuickSwitchScheme[] = [
  {
    name: '🔒使用模型',
    section: '基础设置',
    type: 'mode',
    defaultModeId: 'gemini pro',
    modes: [
      {
        id: 'gemini pro',
        label: 'Gemini pro模型',
        modelPattern: 'gemini.*(?:2[._-]?5|3[._-]?1).*pro',
        startReplyWith: '<electric>',
        rules: [
          { nameIncludes: 'Gemini尾部①', enabled: true },
          { nameIncludes: 'Gemini尾部②', enabled: false },
          { nameIncludes: 'Claude尾部', enabled: false },
        ],
      },
      {
        id: 'gemini flash',
        label: 'Gemini flash模型',
        modelPattern: 'gemini.*3[._-]?[5-8].*flash',
        startReplyWith: '',
        rules: [
          { nameIncludes: 'Gemini尾部①', enabled: false },
          { nameIncludes: 'Gemini尾部②', enabled: true },
          { nameIncludes: 'Claude尾部', enabled: false },
        ],
      },
      {
        id: 'claude',
        label: 'Claude',
        modelPattern: 'claude',
        startReplyWith: '',
        rules: [
          { nameIncludes: 'Gemini尾部①', enabled: false },
          { nameIncludes: 'Gemini尾部②', enabled: false },
          { nameIncludes: 'Claude尾部', enabled: true },
        ],
      },
    ],
  },
  {
    name: '💜语言选择',
    section: '基础设置',
    type: 'mode',
    defaultModeId: 'zh-cn',
    modes: [
      {
        id: 'zh-cn',
        label: '简体中文',
        rules: [
          { nameIncludes: '强制简中', enabled: true },
          { nameIncludes: '强制繁中', enabled: false },
          { nameIncludes: '强制韩语', enabled: false },
          { nameIncludes: '强制英语', enabled: false },
        ],
      },
      {
        id: 'zh-tw',
        label: '繁体中文',
        rules: [
          { nameIncludes: '强制繁中', enabled: true },
          { nameIncludes: '强制简中', enabled: false },
          { nameIncludes: '强制韩语', enabled: false },
          { nameIncludes: '强制英语', enabled: false },
        ],
      },
      {
        id: 'ko',
        label: '韩语',
        rules: [
          { nameIncludes: '强制韩语', enabled: true },
          { nameIncludes: '强制简中', enabled: false },
          { nameIncludes: '强制繁中', enabled: false },
          { nameIncludes: '强制英语', enabled: false },
        ],
      },
      {
        id: 'en',
        label: '英语',
        rules: [
          { nameIncludes: '强制英语', enabled: true },
          { nameIncludes: '强制简中', enabled: false },
          { nameIncludes: '强制繁中', enabled: false },
          { nameIncludes: '强制韩语', enabled: false },
        ],
      },
    ],
  },
  {
    name: '♻️双语模式',
    section: '基础设置',
    type: 'mode',
    defaultModeId: 'off',
    modes: [
      {
        id: 'off',
        label: '关闭',
        rules: [{ nameIncludes: '双语', enabled: false }],
      },
      {
        id: 'bracket',
        label: '括号双语',
        rules: [
          { nameIncludes: '括号双语', enabled: true },
          { nameIncludes: '标签双语', enabled: false },
        ],
      },
      {
        id: 'tags',
        label: '标签双语',
        rules: [
          { nameIncludes: '标签双语', enabled: true },
          { nameIncludes: '括号双语', enabled: false },
        ],
      },
    ],
  },
  {
    name: '🪐世界引擎',
    section: '功能定制',
    type: 'customize',
    customize: {
      groups: [
        {
          groupName: '🪐世界引擎',

          excludeRules: [{ nameIncludes: '世界一键开关' }],

          autoExclude: {
            actionRules: false,

            // 必须保留分区起始条目，否则无法识别“✶ ·xxx·✶”
            emptyPrompts: false,
          },
        },
      ],

      // 只读取这些前缀，并在面板中隐藏前缀
      itemPrefixes: ['🪐', '🎈', '🌟', '🌊', '👤', '🔭', '📸'],
      sectionDescriptions: {
        总体风格: '必选，可多开',
        气氛点缀: '可选，可多开',
        额外背景: '可选，推荐多选一开',
        推进节奏: '必选，多选一开',
        主导角色: '必选，多选一开',
        叙事补丁: '可选，可多开',
      },
    },
  },
  {
    name: '🐚人物活化',
    section: '功能定制',
    type: 'customize',
    customize: {
      groups: [
        {
          groupName: '🐚人物活化',

          excludeRules: [{ nameIncludes: '人物一键开关' }],

          autoExclude: {
            actionRules: false,

            // 必须保留分区起始条目，否则无法识别“✶ ·xxx·✶”
            emptyPrompts: false,
          },
        },
      ],

      // 只读取这些前缀，并在面板中隐藏前缀
      itemPrefixes: ['🔸', '🤝', '⬆️', '👥', '💖', '🐶', '🐱', '🌷', '💎', '👻', '😈', '💐'],
      // 按小分类名称填写说明，可继续添加其他小分类；留空则不显示
      sectionDescriptions: {
        性别强调: '非必选，多选一开',
        关系定义: '推荐多选一开',
        关系走向: '推荐多选一开',
        攻略难度: '只开一个，需配合好感规划COT',
      },
    },
  },
  {
    name: '🎵文风指导',
    section: '功能定制',
    type: 'customize',
    customize: {
      groups: [
        {
          groupName: '🎵文风指导',

          excludeRules: [{ nameIncludes: '文风一键开关' }],

          autoExclude: {
            actionRules: false,

            // 必须保留分区起始条目，否则无法识别“✶ ·xxx·✶”
            emptyPrompts: false,
          },
        },
      ],

      // 只读取这些前缀，并在面板中隐藏前缀
      itemPrefixes: ['🎵', '✒️', '🎬'],
      sectionDescriptions: {
        文风框架: '推荐多选一开，多开文风容易打架',
        文风补丁: '可选，可多开',
        结尾落点: '推荐开启，多选一开',
      },
    },
  },
  {
    name: '❤️‍🔥涩涩指导',
    section: '功能定制',
    type: 'toggle',
    defaultEnabled: true,
    on: {
      selection: {
        enabled: true,
        defaultSelection: 'remember',

        groups: [
          {
            // 推荐使用完整分组名
            groupName: '❤️‍🔥涩涩指导',

            // 手动排除不需要显示的成员
            excludeRules: [{ nameIncludes: '✧─' }],

            autoExclude: {
              // 自动排除与下方 rules 重叠的“一键开关代表条目”
              actionRules: true,

              // 可选：隐藏空内容及占位符条目
              emptyPrompts: true,
            },
          },
        ],
      },

      // 如果代表开关本身也在分组中，会被 actionRules 自动排除，
      // 不会出现在“定制”子选项里。
      rules: [{ nameIncludes: '涩涩一键开关', enabled: true }],
    },
    off: {
      rules: [{ nameIncludes: '涩涩一键开关', enabled: false }],
    },
  },
  {
    name: '✒️写作指导',
    section: '功能定制',
    type: 'customize',
    customize: {
      groups: [
        {
          groupName: '✒️写作指导',

          excludeRules: [{ nameIncludes: '要求一键开关' }],

          autoExclude: {
            actionRules: false,

            // 必须保留分区起始条目，否则无法识别“✶ ·xxx·✶”
            emptyPrompts: false,
          },
        },
      ],

      // 只读取这些前缀，并在面板中隐藏前缀
      itemPrefixes: ['🚫', '😡', '✅', '⬆️', '🕹️'],
      sectionDescriptions: {
        功能提醒:
          '有相关配套插件再开，比如生图需要搭配生图插件、表格需要搭配对应的表格插件、MVU变量必须搭配变量卡，否则AI会乱编格式',
      },
    },
  },
  {
    name: '🎐装饰组件',
    section: '功能定制',
    type: 'customize',
    customize: {
      groups: [
        {
          groupName: '🎐装饰组件',

          excludeRules: [{ nameIncludes: '人物一键开关' }],

          autoExclude: {
            actionRules: false,

            // 必须保留分区起始条目，否则无法识别“✶ ·xxx·✶”
            emptyPrompts: false,
          },
        },
      ],

      // 只读取这些前缀，并在面板中隐藏前缀
      itemPrefixes: ['🪶', '⏰', '🍨', '📱', '🎬', '💌', '📟'],
      sectionDescriptions: {
        头部装饰: '卡自带顶部状态栏再开顶部提醒，否则AI会乱编格式；其余装饰打开后必须打开配套的美化正则',
        尾部装饰: '卡自带尾部状态栏再开顶部提醒，否则AI会乱编格式；其余装饰打开后必须打开配套的美化正则',
      },
    },
  },
  {
    name: '🌙日月摘要',
    section: '装饰组件',
    type: 'toggle',
    defaultEnabled: true,
    on: {
      selection: {
        enabled: true,
        defaultSelection: 'all',
        displayRules: [
          { nameIncludes: '角色关系', enabled: true },
          { nameIncludes: '涩涩控制', enabled: true },
          { nameIncludes: '绝密档案', enabled: true },
          { nameIncludes: '摘要伏笔', enabled: true },
        ],
      },
      rules: [{ nameIncludes: '摘要一键开关', enabled: true }],
    },
    off: {
      rules: [{ nameIncludes: '摘要一键开关', enabled: false }],
    },
  },
  {
    name: '🎮推进选项',
    section: '装饰组件',
    type: 'toggle',
    defaultEnabled: true,
    on: {
      selection: {
        enabled: true,
        defaultSelection: 'all',
        displayRules: [
          { nameIncludes: '日常选项', enabled: false },
          { nameIncludes: '瑟瑟选项', enabled: false },
          { nameIncludes: '扮演选项', enabled: true },
          { nameIncludes: '待办日程', enabled: true },
          { nameIncludes: '活动灵感', enabled: true },
          { nameIncludes: '🗝️平行事件', enabled: false },
        ],
      },
      rules: [{ nameIncludes: '选项一键开关', enabled: true }],
    },
    off: {
      rules: [{ nameIncludes: '选项一键开关', enabled: false }],
    },
  },
  {
    name: '🐦文末论坛',
    section: '装饰组件',
    type: 'toggle',
    defaultEnabled: true,
    on: {
      selection: {
        enabled: true,
        defaultSelection: 'remember',

        groups: [
          {
            // 推荐使用完整分组名
            groupName: '🐦文末论坛',

            // 手动排除不需要显示的成员
            excludeRules: [{ nameIncludes: '✧─' }, { nameIncludes: '♡‧₊ ' }],

            autoExclude: {
              // 自动排除与下方 rules 重叠的“一键开关代表条目”
              actionRules: true,

              // 可选：隐藏空内容及占位符条目
              emptyPrompts: true,
            },
          },
        ],
      },

      // 如果代表开关本身也在分组中，会被 actionRules 自动排除，
      // 不会出现在“定制”子选项里。
      rules: [{ nameIncludes: '论坛一键开关', enabled: true }],
    },
    off: {
      rules: [{ nameIncludes: '论坛一键开关', enabled: false }],
    },
  },
  {
    name: '👩‍🎨文生图提醒',
    section: '功能提醒',
    type: 'toggle',
    defaultModeId: 'off',
    on: {
      rules: [{ nameIncludes: '文中生图', enabled: true }],
    },
    off: {
      rules: [{ nameIncludes: '文中生图', enabled: false }],
    },
  },
  {
    name: '🎪小剧场提醒',
    section: '功能提醒',
    type: 'toggle',
    defaultModeId: 'off',
    on: {
      rules: [{ nameIncludes: '极光剧场提醒', enabled: true }],
    },
    off: {
      rules: [{ nameIncludes: '极光剧场提醒', enabled: false }],
    },
  },
  {
    name: '💡预设思维',
    section: '功能定制',
    type: 'customize',
    customize: {
      groups: [
        {
          groupName: '💡预设思维',

          excludeRules: [{ nameIncludes: '人物一键开关' }],

          autoExclude: {
            actionRules: false,

            // 必须保留分区起始条目，否则无法识别“✶ ·xxx·✶”
            emptyPrompts: false,
          },
        },
      ],

      // 只读取这些前缀，并在面板中隐藏前缀
      itemPrefixes: ['💧', '❄️', '┌⚓', '│🔸', '│🔹', '└🔸', '└🔹', '┌💎', '│💎', '└💎'],

      // 在面板中隐藏这些后缀
      itemSuffixes: ['┘', '┐', '│'],
    },
  },
];

export const defaultPreset: QRPreset = {
  id: 'default',
  name: '默认预设',
  createTime: Date.now(),
  updateTime: Date.now(),
  wordCount: { min: 1500, max: 3000 },
  paragraphCount: { min: 15, max: 17 },
  paragraphStyle: 'medium',
  aiMode: 'none',
  theme: 'light',
  autoTheme: true,
  themeMode: 'system',
  perspective: 'third_person_omniscient',
  userPronoun: 'second_person',
  takeover: 'closed',
  narrate: 'closed',
  nsfw: {
    ...DEFAULT_NSFW_SETTINGS,
    openKeywords: [...DEFAULT_NSFW_SETTINGS.openKeywords],
    closeKeywords: [...DEFAULT_NSFW_SETTINGS.closeKeywords],
  },
  commands: { ...defaultCommands },
  lengthDefinitions: {
    short: { wc: { min: 500, max: 1000 }, pc: { min: 5, max: 7 } },
    medium: { wc: { min: 2500, max: 4000 }, pc: { min: 15, max: 17 } },
    long: { wc: { min: 4000, max: 6000 }, pc: { min: 20, max: 25 } },
  },
  quickSwitchProfiles: {},
};
