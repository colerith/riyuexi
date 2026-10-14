import { defaultCommands } from './constants';

const legacyParagraphCommands = {
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
} as const;

export function migrateParagraphCommands(commands: Record<string, string>) {
  for (const key of Object.keys(legacyParagraphCommands) as Array<keyof typeof legacyParagraphCommands>) {
    if (commands[key]?.replaceAll('\r\n', '\n') === legacyParagraphCommands[key]) commands[key] = defaultCommands[key];
  }
}
