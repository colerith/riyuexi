function getContextSafe() {
  try {
    return (SillyTavern as any).getContext?.() ?? null;
  } catch {
    return null;
  }
}

const LOG_PREFIX = '预设助手[环境联动]';
const shouldDebugLog = () => Boolean((window as any).__QR_ENV_DEBUG__);
const debugLog = (...args: any[]) => {
  if (shouldDebugLog()) {
    console.info(...args);
  }
};

const ENV_TOGGLE_WRITEBACK_AT_KEY = '__QR_ENV_TOGGLE_WRITEBACK_AT__';
const ENV_TOGGLE_WRITEBACK_UNTIL_KEY = '__QR_ENV_TOGGLE_WRITEBACK_UNTIL__';
const ENV_TOGGLE_WRITEBACK_WINDOW_MS = 1500;

let isApplyingEnvironmentToggles = false;
let lastAppliedSignature = '';

function markEnvironmentToggleWritebackWindow(signature: string) {
  const now = Date.now();
  (window as any)[ENV_TOGGLE_WRITEBACK_AT_KEY] = now;
  (window as any)[ENV_TOGGLE_WRITEBACK_UNTIL_KEY] = now + ENV_TOGGLE_WRITEBACK_WINDOW_MS;
  debugLog(`${LOG_PREFIX} 设置写回抑制窗口`, {
    signature,
    at: now,
    until: now + ENV_TOGGLE_WRITEBACK_WINDOW_MS,
  });
}

export function isEnvironmentToggleWritebackWindowActive() {
  try {
    const until = Number((window as any)[ENV_TOGGLE_WRITEBACK_UNTIL_KEY] || 0);
    return until > Date.now();
  } catch {
    return false;
  }
}

function getCurrentCharacterData() {
  const context = getContextSafe();
  const characters = context?.characters || (SillyTavern as any).characters;
  const characterIdRaw = context?.characterId ?? (SillyTavern as any).characterId;

  if (!Array.isArray(characters) || characters.length === 0) return null;

  const index = typeof characterIdRaw === 'number' ? characterIdRaw : Number(characterIdRaw);
  if (Number.isFinite(index) && index >= 0 && index < characters.length) {
    return characters[index];
  }

  const characterId = String(characterIdRaw || '');
  if (!characterId) return null;
  return (
    characters.find((item: any) => String(item?.avatar || '') === characterId) ||
    characters.find((item: any) => String(item?.name || '') === characterId) ||
    null
  );
}

function isMvuVariableCard() {
  const character = getCurrentCharacterData();
  if (!character) return false;

  const chunks = [
    character?.json_data,
    character?.data?.character_book,
    character?.data?.extensions,
    character?.data?.system_prompt,
    character?.data?.post_history_instructions,
    character?.data?.creator_notes,
  ]
    .map(part => {
      if (typeof part === 'string') return part;
      if (!part) return '';
      try {
        return JSON.stringify(part);
      } catch {
        return '';
      }
    })
    .join('\n')
    .toLowerCase();

  return (
    chunks.includes('[mvu_update]') ||
    chunks.includes('initvar') ||
    chunks.includes('mvu变量') ||
    (chunks.includes('mvu') && chunks.includes('变量'))
  );
}

function setPromptEnabledByNameIncludes(preset: Preset, keyword: string, enabled: boolean) {
  if (!preset.prompts || preset.prompts.length === 0) return false;
  let changed = false;
  let matchedCount = 0;

  preset.prompts = preset.prompts.map(prompt => {
    const next = { ...prompt };
    const name = typeof next.name === 'string' ? next.name : '';
    if (!name.includes(keyword)) return next;
    matchedCount += 1;
    if (next.enabled !== enabled) {
      next.enabled = enabled;
      changed = true;
    }
    return next;
  });

  debugLog(`${LOG_PREFIX} prompt匹配[${keyword}] matched=${matchedCount} changed=${changed} targetEnabled=${enabled}`);
  return changed;
}

function hasPromptToggleDiffByNameIncludes(preset: Preset, keyword: string, expectedEnabled: boolean) {
  if (!preset.prompts || preset.prompts.length === 0) return false;
  return preset.prompts.some(prompt => {
    const name = typeof prompt?.name === 'string' ? prompt.name : '';
    return name.includes(keyword) && !!prompt.enabled !== expectedEnabled;
  });
}

interface EnvironmentPromptDeps {
  updatePresetWith: (name: string, updater: (preset: Preset) => Preset) => Promise<Preset>;
  getLoadedPresetName: () => string | null;
}

export async function applyEnvironmentPromptToggles(deps: EnvironmentPromptDeps) {
  if (isApplyingEnvironmentToggles) {
    debugLog(`${LOG_PREFIX} 跳过：上一次环境联动仍在执行中`);
    return;
  }

  const shouldEnableMvuPrompt = isMvuVariableCard();
  const loadedPresetName = deps.getLoadedPresetName();
  const signature = `${loadedPresetName || ''}|m:${shouldEnableMvuPrompt}`;

  if (signature === lastAppliedSignature) {
    debugLog(`${LOG_PREFIX} 跳过：目标状态未变化 ${signature}`);
    return;
  }

  debugLog(`${LOG_PREFIX} 目标状态：MVU变量=${shouldEnableMvuPrompt}`);

  const updater = (preset: Preset) => {
    if (!preset.prompts) return preset;
    setPromptEnabledByNameIncludes(preset, 'MVU变量', shouldEnableMvuPrompt);
    return preset;
  };

  let shouldUpdateInUse = false;
  let shouldUpdateLoadedPreset = false;

  try {
    const presetInUse = getPreset('in_use');
    shouldUpdateInUse = hasPromptToggleDiffByNameIncludes(presetInUse, 'MVU变量', shouldEnableMvuPrompt);

    if (loadedPresetName) {
      const loadedPreset = getPreset(loadedPresetName);
      shouldUpdateLoadedPreset = hasPromptToggleDiffByNameIncludes(loadedPreset, 'MVU变量', shouldEnableMvuPrompt);
    }
  } catch (error) {
    console.warn(`${LOG_PREFIX} 读取预设状态失败，回退到直接写回策略`, error);
    shouldUpdateInUse = true;
    shouldUpdateLoadedPreset = !!loadedPresetName;
  }

  if (!shouldUpdateInUse && !shouldUpdateLoadedPreset) {
    lastAppliedSignature = signature;
    debugLog(`${LOG_PREFIX} 跳过写回：目标状态已一致`);
    return;
  }

  isApplyingEnvironmentToggles = true;
  try {
    markEnvironmentToggleWritebackWindow(signature);
    if (shouldUpdateInUse) {
      await deps.updatePresetWith('in_use', updater);
    }
    if (loadedPresetName && shouldUpdateLoadedPreset) {
      await deps.updatePresetWith(loadedPresetName, updater);
    }
    lastAppliedSignature = signature;
    debugLog(
      `${LOG_PREFIX} 已完成环境联动写回：${shouldUpdateInUse ? 'in_use' : 'skip in_use'} + ${loadedPresetName || '无已加载预设'}(${shouldUpdateLoadedPreset ? 'updated' : 'skip'})`,
    );
  } finally {
    isApplyingEnvironmentToggles = false;
  }
}
