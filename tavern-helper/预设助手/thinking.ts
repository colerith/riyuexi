import { THINKING_ENTRIES } from './constants';

export function nameMatches(name: string, target: string) {
  return name && name.includes(target);
}

export function calculateNewPrompts(
  currentPrompts: any[],
  mode: 'special' | 'conventional',
  style?: 'conventional' | 'minimalist',
) {
  return currentPrompts.map(prompt => {
    const newPrompt = { ...prompt };
    if (typeof newPrompt.name !== 'string') return newPrompt;

    if (mode === 'special') {
      if (nameMatches(newPrompt.name, THINKING_ENTRIES.SPECIAL)) {
        newPrompt.enabled = true;
      }
      if (nameMatches(newPrompt.name, THINKING_ENTRIES.CONVENTIONAL)) {
        newPrompt.enabled = false;
      }
      if (nameMatches(newPrompt.name, THINKING_ENTRIES.OUTPUT_ORDER)) {
        newPrompt.enabled = false;
      }
    } else {
      if (nameMatches(newPrompt.name, THINKING_ENTRIES.SPECIAL)) {
        newPrompt.enabled = false;
      }
      if (style === 'conventional') {
        if (nameMatches(newPrompt.name, THINKING_ENTRIES.CONVENTIONAL)) newPrompt.enabled = true;
      }
      if (nameMatches(newPrompt.name, THINKING_ENTRIES.OUTPUT_ORDER)) {
        newPrompt.enabled = true;
      }
    }
    return newPrompt;
  });
}

interface ThinkingDeps {
  updatePresetWith: (name: string, updater: (preset: Preset) => Preset) => Promise<Preset>;
  getLoadedPresetName: () => string | null;
}

export async function applyThinkingMode(
  mode: 'special' | 'conventional',
  style: 'conventional' | 'minimalist' | undefined,
  deps: ThinkingDeps,
) {
  const updateLogic = (preset: Preset) => {
    if (!preset.prompts) return preset;
    preset.prompts = calculateNewPrompts(preset.prompts, mode, style);
    return preset;
  };

  try {
    await deps.updatePresetWith('in_use', updateLogic);

    const loadedPresetName = deps.getLoadedPresetName();
    if (loadedPresetName) {
      await deps.updatePresetWith(loadedPresetName, updateLogic);
    }

    console.log(`预设助手: 思维模式已更新(Preset) - ${mode} ${style || ''}`);
  } catch (e) {
    console.warn('预设助手: 更新预设思维条目失败', e);
  }
}
