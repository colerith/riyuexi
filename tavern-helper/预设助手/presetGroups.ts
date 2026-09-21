import type {
  BuiltinQuickSwitchGroupAutoExclude,
  BuiltinQuickSwitchGroupSelection,
  BuiltinQuickSwitchRule,
  QuickSwitchPromptGroupMatcher,
} from './types';

interface BaiBaiPresetGroup {
  id: string;
  name: string;
  order: number;
  enabled: boolean;
  promptIds: string[];
}

interface BaiBaiPresetGroupState {
  groups?: Array<{ id?: unknown; name?: unknown; order?: unknown; enabled?: unknown }>;
  prompts?: Record<string, { groupId?: unknown }>;
}

const BAIBAI_GROUP_EXTENSION_PATH = ['baibaiToolkit', 'presetPromptGroups'] as const;

function getNestedValue(source: unknown, path: readonly string[]): unknown {
  return path.reduce<unknown>((value, key) => {
    if (!value || typeof value !== 'object') return undefined;
    return (value as Record<string, unknown>)[key];
  }, source);
}

function matchesPrompt(prompt: PresetPrompt, matcher: QuickSwitchPromptGroupMatcher): boolean {
  const promptId = String(prompt.id);
  return (
    (!!matcher.promptId && promptId === matcher.promptId) ||
    (!!matcher.promptIdIncludes && promptId.includes(matcher.promptIdIncludes)) ||
    (!!matcher.nameIncludes && String(prompt.name || '').includes(matcher.nameIncludes))
  );
}

function matchesActionRule(prompt: PresetPrompt, rule: BuiltinQuickSwitchRule): boolean {
  return matchesPrompt(prompt, rule);
}

function normalizeAutoExclude(
  value: BuiltinQuickSwitchGroupSelection['autoExclude'],
): Required<BuiltinQuickSwitchGroupAutoExclude> {
  if (value === false) return { actionRules: false, disabledPrompts: false, emptyPrompts: false };
  if (value === true || value === undefined) {
    return { actionRules: true, disabledPrompts: false, emptyPrompts: false };
  }
  return {
    actionRules: value.actionRules ?? true,
    disabledPrompts: value.disabledPrompts ?? false,
    emptyPrompts: value.emptyPrompts ?? false,
  };
}

export function readBaiBaiPresetGroups(preset: Preset): BaiBaiPresetGroup[] {
  const candidates: unknown[] = [];

  // BaiBai Tools 会先写入 oai_settings.extensions；这份运行时数据通常比 Tavern Helper
  // 的 in_use 快照更新，也能覆盖尚未按“保存预设”的情况。
  try {
    candidates.push(SillyTavern.getContext().chatCompletionSettings?.extensions);
  } catch {
    // 酒馆上下文尚未就绪时继续读取预设快照。
  }
  candidates.push(preset?.extensions);

  // 某些 Tavern Helper 版本的 in_use 不携带自定义 extensions，继续回退到命名预设。
  try {
    const loadedPresetName = getLoadedPresetName();
    if (loadedPresetName) {
      candidates.push(getPreset(loadedPresetName)?.extensions);
      const manager = SillyTavern.getContext().getPresetManager?.('openai');
      candidates.push(manager?.getCompletionPresetByName?.(loadedPresetName)?.extensions);
    }
  } catch {
    // 回退来源不可用不影响普通规则。
  }

  const state = candidates
    .map(candidate => getNestedValue(candidate, BAIBAI_GROUP_EXTENSION_PATH) as BaiBaiPresetGroupState | null)
    .find(
      candidate => Array.isArray(candidate?.groups) && !!candidate?.prompts && typeof candidate.prompts === 'object',
    );
  if (!state || !Array.isArray(state.groups) || !state.prompts || typeof state.prompts !== 'object') return [];

  const promptIdsByGroup = new Map<string, string[]>();
  Object.entries(state.prompts).forEach(([promptId, meta]) => {
    const groupId = String(meta?.groupId || '');
    if (!groupId) return;
    const ids = promptIdsByGroup.get(groupId) || [];
    ids.push(String(promptId));
    promptIdsByGroup.set(groupId, ids);
  });

  return state.groups
    .filter(group => !!group && !!group.id)
    .map((group, index) => {
      const id = String(group.id);
      return {
        id,
        name: String(group.name || '未命名分组'),
        order: Number.isFinite(Number(group.order)) ? Number(group.order) : index,
        enabled: group.enabled !== false,
        promptIds: promptIdsByGroup.get(id) || [],
      };
    })
    .sort((a, b) => a.order - b.order);
}

function matchesGroup(group: BaiBaiPresetGroup, selection: BuiltinQuickSwitchGroupSelection): boolean {
  if (selection.groupId && group.id === selection.groupId) return true;
  if (selection.groupName && group.name === selection.groupName) return true;
  if (selection.groupNameIncludes && group.name.includes(selection.groupNameIncludes)) return true;
  return false;
}

/** 将动态分组成员解析成稳定的 promptId 规则，并按当前预设顺序返回。 */
export function resolveBaiBaiGroupRules(
  preset: Preset,
  selections: BuiltinQuickSwitchGroupSelection[] | undefined,
  actionRules: BuiltinQuickSwitchRule[] = [],
): BuiltinQuickSwitchRule[] {
  if (!Array.isArray(selections) || selections.length === 0) return [];

  const prompts = Array.isArray(preset?.prompts) ? preset.prompts : [];
  const promptsById = new Map(prompts.map(prompt => [String(prompt.id), prompt]));
  const selectedRules = new Map<string, BuiltinQuickSwitchRule>();
  const groups = readBaiBaiPresetGroups(preset);

  selections.forEach(selection => {
    const autoExclude = normalizeAutoExclude(selection.autoExclude);
    groups
      .filter(group => matchesGroup(group, selection))
      .forEach(group => {
        group.promptIds.forEach(promptId => {
          const prompt = promptsById.get(promptId);
          if (!prompt) return;
          if (selection.includeRules?.length && !selection.includeRules.some(rule => matchesPrompt(prompt, rule)))
            return;
          if (selection.excludeRules?.some(rule => matchesPrompt(prompt, rule))) return;
          if (autoExclude.actionRules && actionRules.some(rule => matchesActionRule(prompt, rule))) return;
          if (autoExclude.disabledPrompts && !prompt.enabled) return;
          if (autoExclude.emptyPrompts && !String(prompt.content || '').trim()) return;

          selectedRules.set(promptId, {
            promptId,
            enabled: selection.defaultEnabled ?? true,
          });
        });
      });
  });

  return prompts
    .map(prompt => selectedRules.get(String(prompt.id)))
    .filter((rule): rule is BuiltinQuickSwitchRule => !!rule);
}

export function combineDisplayRules(
  explicitRules: BuiltinQuickSwitchRule[] | null,
  groupRules: BuiltinQuickSwitchRule[],
): BuiltinQuickSwitchRule[] | null {
  if (!explicitRules?.length && !groupRules.length) return null;
  const combined = new Map<string, BuiltinQuickSwitchRule>();
  [...(explicitRules || []), ...groupRules].forEach((rule, index) => {
    const key = rule.promptId
      ? `id:${rule.promptId}`
      : `matcher:${rule.nameIncludes || ''}:${rule.promptIdIncludes || ''}:${index}`;
    combined.set(key, rule);
  });
  return [...combined.values()];
}
