import type { BuiltinQuickSwitchRule, StorageData } from './types';

export async function deactivateUnboundQuickSwitchProfiles(
  deps: QuickSwitchDeps & {
    storage: StorageData;
    getCharacterId: () => string;
    getPreset: (name: string) => Preset;
  },
): Promise<boolean> {
  const characterId = deps.getCharacterId();
  const profiles = Object.values({
    ...Object.assign({}, ...Object.values(deps.storage.presets).map(preset => preset.quickSwitchProfiles || {})),
    ...deps.storage.quickSwitchProfiles,
  }) as NonNullable<StorageData['quickSwitchProfiles']>[string][];
  const unboundProfiles = profiles.filter(profile => {
    const ids = profile.characterIds ?? (profile.characterId ? [profile.characterId] : []);
    return profile.scope === 'character' && !ids.map(String).includes(characterId);
  });
  // 未绑定不等于必须关闭：仅还原助手确实启用过的方案，不能按所有未绑定规则批量关条目。
  const beforeStates: Record<string, boolean> = {};
  for (const preset of Object.values(deps.storage.presets)) {
    for (const profile of unboundProfiles) {
      const runtime = preset.quickSwitchRuntimeStates?.[profile.id];
      if (runtime?.enabled) Object.assign(beforeStates, runtime.beforeStates);
    }
  }
  if (Object.keys(beforeStates).length) {
    const prompts = deps.getPreset('in_use').prompts || [];
    if (prompts.some(prompt => typeof beforeStates[prompt.id] === 'boolean' && beforeStates[prompt.id] !== prompt.enabled)) {
      await deps.updatePresetWith('in_use', preset => {
        if (deps.getCharacterId() !== characterId) return preset;
        return restorePromptStatesOnPreset(preset, beforeStates);
      });
    }
  }
  if (deps.getCharacterId() !== characterId) return false;
  let changed = false;
  for (const preset of Object.values(deps.storage.presets)) {
    for (const profile of unboundProfiles) {
      const state = preset.quickSwitchRuntimeStates?.[profile.id];
      if (!state?.enabled) continue;
      state.enabled = false;
      state.beforeStates = {};
      state.updateTime = Date.now();
      changed = true;
    }
  }
  return changed;
}

function parseBoolish(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off', ''].includes(normalized)) return false;
  }
  if (typeof value === 'number') return value !== 0;
  return fallback;
}

export function isPromptMatchedByRule(prompt: PresetPrompt, rule: BuiltinQuickSwitchRule): boolean {
  const promptId = String(prompt.id);
  const hasNameRule = typeof rule.nameIncludes === 'string' && rule.nameIncludes.length > 0;
  const hasPromptIdRule = typeof rule.promptId === 'string' && rule.promptId.length > 0;
  const hasPromptIdIncludesRule = typeof rule.promptIdIncludes === 'string' && rule.promptIdIncludes.length > 0;

  if (!hasNameRule && !hasPromptIdRule && !hasPromptIdIncludesRule) {
    return false;
  }

  if (hasPromptIdRule && promptId === rule.promptId) {
    return true;
  }
  if (hasPromptIdIncludesRule && promptId.includes(rule.promptIdIncludes!)) {
    return true;
  }
  if (hasNameRule && typeof prompt.name === 'string' && prompt.name.includes(rule.nameIncludes!)) {
    return true;
  }

  return false;
}

export function isPromptMatchedByRules(prompt: PresetPrompt, rules: BuiltinQuickSwitchRule[]): boolean {
  return rules.some(rule => isPromptMatchedByRule(prompt, rule));
}

export function resolveRuleTargetForPrompt(prompt: PresetPrompt, rules: BuiltinQuickSwitchRule[]): boolean | null {
  let target: boolean | null = null;
  rules.forEach(rule => {
    if (isPromptMatchedByRule(prompt, rule)) {
      target = parseBoolish((rule as any).enabled, false);
    }
  });
  return target;
}

export function capturePromptStatesByRules(
  currentPrompts: PresetPrompt[],
  rules: BuiltinQuickSwitchRule[],
): { [promptId: string]: boolean } {
  const stateMap: { [promptId: string]: boolean } = {};
  currentPrompts.forEach(prompt => {
    if (isPromptMatchedByRules(prompt, rules)) {
      stateMap[String(prompt.id)] = !!prompt.enabled;
    }
  });
  return stateMap;
}

export function captureRulesFromEnabledPrompts(currentPrompts: PresetPrompt[]): BuiltinQuickSwitchRule[] {
  return currentPrompts
    .filter(prompt => !!prompt.enabled)
    .map(prompt => ({
      promptId: String(prompt.id),
      enabled: true,
    }));
}

export function countMatchedPrompts(currentPrompts: PresetPrompt[], rules: BuiltinQuickSwitchRule[]): number {
  let count = 0;
  currentPrompts.forEach(prompt => {
    if (isPromptMatchedByRules(prompt, rules)) {
      count += 1;
    }
  });
  return count;
}

export function applyRulesOnPreset(preset: Preset, rules: BuiltinQuickSwitchRule[]): Preset {
  if (!preset.prompts || !rules.length) return preset;

  preset.prompts = preset.prompts.map(prompt => {
    const next = { ...prompt };
    rules.forEach(rule => {
      if (isPromptMatchedByRule(next, rule)) {
        next.enabled = parseBoolish((rule as any).enabled, !!next.enabled);
      }
    });
    return next;
  });

  return preset;
}

export function restorePromptStatesOnPreset(preset: Preset, beforeStates: { [promptId: string]: boolean }): Preset {
  if (!preset.prompts) return preset;
  const keys = Object.keys(beforeStates);
  if (!keys.length) return preset;

  preset.prompts = preset.prompts.map(prompt => {
    const promptId = String(prompt.id);
    if (!(promptId in beforeStates)) return prompt;
    return {
      ...prompt,
      enabled: !!beforeStates[promptId],
    };
  });

  return preset;
}

interface QuickSwitchDeps {
  updatePresetWith: (name: string, updater: (preset: Preset) => Preset) => Promise<Preset>;
  getLoadedPresetName: () => string | null;
}

export async function applyQuickSwitchRules(rules: BuiltinQuickSwitchRule[], deps: QuickSwitchDeps) {
  const updater = (preset: Preset) => applyRulesOnPreset(preset, rules);

  await deps.updatePresetWith('in_use', updater);
}

export async function restoreQuickSwitchRules(beforeStates: { [promptId: string]: boolean }, deps: QuickSwitchDeps) {
  const updater = (preset: Preset) => restorePromptStatesOnPreset(preset, beforeStates);

  await deps.updatePresetWith('in_use', updater);
}
