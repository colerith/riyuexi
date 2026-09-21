import { SCRIPT_ID, defaultPreset } from './constants';
import { normalizeNsfwSettings } from './nsfw';
import { loadStorageFromBrowserCache, loadStorageFromIndexedDb, saveStorageToBrowser } from './persistence';
import type { CustomQuickRequest, QRPreset, RuntimeState, StorageData } from './types';

export const runtimeState: RuntimeState = {
  stagedPrompts: null,
  tempThinkingStyle: null,
  panel: null,
  styleTag: null,
  faLink: null,
  editingPresetId: null,
};

export let storage: StorageData = {
  presets: { default: { ...defaultPreset } },
  customQuickRequests: {},
  bindings: {},
  globalPresetId: 'default',
  initialized: false,
  onboarding: {
    tutorialCompleted: false,
    acknowledgedChangelogVersions: [],
  },
  panelEntries: {
    floatingBall: true,
    quickReply: false,
    extensionsMenu: false,
  },
};

export const defaultPanelEntries = {
  floatingBall: true,
  quickReply: false,
  extensionsMenu: false,
};

export function normalizePanelEntries() {
  storage.panelEntries = {
    floatingBall: storage.panelEntries?.floatingBall ?? defaultPanelEntries.floatingBall,
    quickReply: storage.panelEntries?.quickReply ?? defaultPanelEntries.quickReply,
    extensionsMenu: storage.panelEntries?.extensionsMenu ?? defaultPanelEntries.extensionsMenu,
  };
  return storage.panelEntries;
}

export const activeSettings: QRPreset = { ...defaultPreset };

function clonePreset(preset: QRPreset): QRPreset {
  return JSON.parse(JSON.stringify(preset));
}

function replaceActiveSettings(next: QRPreset) {
  Object.assign(activeSettings, clonePreset(next));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

export function getCharacterId(): string {
  try {
    const characterId = (SillyTavern as any).getContext().characterId;
    return characterId === null || characterId === undefined ? '' : String(characterId);
  } catch (e) {
    console.warn('预设助手: 无法获取角色ID', e);
    return '';
  }
}

export function getActivePresetId() {
  const charId = getCharacterId();
  if (charId && storage.bindings[charId] && storage.presets[storage.bindings[charId]]) {
    return storage.bindings[charId];
  }
  return storage.globalPresetId;
}

export function refreshActiveSettings() {
  const charId = getCharacterId();
  let presetId = storage.globalPresetId;

  if (charId && storage.bindings[charId] && storage.presets[storage.bindings[charId]]) {
    presetId = storage.bindings[charId];
  }

  if (storage.presets[presetId]) {
    replaceActiveSettings(storage.presets[presetId]);
  } else {
    replaceActiveSettings(defaultPreset);
  }

  activeSettings.themeMode = normalizeThemeMode(activeSettings);
  activeSettings.autoTheme = activeSettings.themeMode === 'system';
  activeSettings.theme = resolveThemeMode(activeSettings.themeMode);
}

export function normalizeThemeMode(preset: Partial<QRPreset>): QRPreset['themeMode'] {
  if (preset.themeMode === 'system' || preset.themeMode === 'day' || preset.themeMode === 'night') {
    return preset.themeMode;
  }
  if (preset.autoTheme || preset.theme === 'auto') return 'system';
  return preset.theme === 'dark' ? 'night' : 'day';
}

export function resolveThemeMode(mode: QRPreset['themeMode']): 'light' | 'dark' {
  if (mode === 'day') return 'light';
  if (mode === 'night') return 'dark';
  const beijingHour = (new Date().getUTCHours() + 8) % 24;
  return beijingHour >= 6 && beijingHour < 18 ? 'light' : 'dark';
}

export function saveStorage() {
  storage.storageRevision = Math.max(Date.now(), (storage.storageRevision || 0) + 1);
  saveStorageToBrowser(storage);
}

function normalizeQuickSwitchProfile(profile: any) {
  if (!Array.isArray(profile.rules) && Array.isArray(profile.promptStates)) {
    profile.rules = profile.promptStates
      .filter((state: any) => typeof state?.promptId === 'string')
      .map((state: any) => ({ promptId: state.promptId, enabled: !!state.afterEnabled }));
    delete profile.promptStates;
  }
  if (!Array.isArray(profile.rules)) {
    profile.rules = [];
  }
  if (profile.scope !== 'character' && profile.scope !== 'global') {
    profile.scope = 'global';
  }
  if (profile.scope === 'character') {
    profile.characterIds = Array.from(
      new Set(
        [...(Array.isArray(profile.characterIds) ? profile.characterIds : []), profile.characterId]
          .filter(characterId => characterId !== null && characterId !== undefined && characterId !== '')
          .map(String),
      ),
    );
  } else {
    profile.characterIds = [];
  }
  delete profile.characterId;
}

export async function loadStorage() {
  // 脚本变量会被酒馆助手一并导出，不能用来保存用户的自定义配置和阅读状态。
  // 每次加载都清空旧版本留下的脚本变量，避免后续导出继续夹带本机数据。
  replaceVariables({}, { type: 'script', script_id: SCRIPT_ID });
  const localSaved = loadStorageFromBrowserCache();
  const indexedDbSaved = await loadStorageFromIndexedDb();
  const candidates = [localSaved, indexedDbSaved].filter(
    (candidate): candidate is { savedAt: number; data: StorageData } => !!candidate,
  );
  const saved = candidates.sort((a, b) => b.savedAt - a.savedAt)[0]?.data;
  if (!saved) return;

  // 同名脚本被新版替换时，脚本变量可能较新但还没有该字段；从浏览器持久化副本补回。
  // 空对象代表用户确实删除了全部条目，因此只在字段完全缺失时恢复，避免“删而复生”。
  if (saved.customQuickRequests === undefined) {
    const customRequestBackup = candidates
      .filter(candidate => candidate.data.customQuickRequests !== undefined)
      .sort((a, b) => b.savedAt - a.savedAt)[0]?.data.customQuickRequests;
    if (customRequestBackup !== undefined) {
      saved.customQuickRequests = JSON.parse(JSON.stringify(customRequestBackup));
    }
  }

  if ((saved as any).initialized && !(saved as any).presets) {
    console.log('预设助手 [迁移]: 检测到旧版数据，正在迁移...');
    const oldSettings = saved as any;
    const migratedPreset: QRPreset = {
      ...defaultPreset,
      wordCount: oldSettings.wordCount || defaultPreset.wordCount,
      paragraphCount: oldSettings.paragraphCount || defaultPreset.paragraphCount,
      paragraphStyle: oldSettings.paragraphStyle || defaultPreset.paragraphStyle,
      aiMode: oldSettings.aiMode || defaultPreset.aiMode,
      theme: oldSettings.theme || defaultPreset.theme,
      autoTheme: oldSettings.autoTheme ?? defaultPreset.autoTheme,
      themeMode: normalizeThemeMode(oldSettings),
      perspective: oldSettings.perspective || defaultPreset.perspective,
      userPronoun: oldSettings.userPronoun || defaultPreset.userPronoun,
      takeover: oldSettings.takeover || defaultPreset.takeover,
      narrate: oldSettings.narrate || defaultPreset.narrate,
      nsfw: normalizeNsfwSettings(oldSettings.nsfw),
      commands: oldSettings.commands || defaultPreset.commands,
    };
    storage = {
      presets: { default: migratedPreset },
      customQuickRequests: {},
      bindings: {},
      globalPresetId: 'default',
      initialized: true,
      onboarding: {
        tutorialCompleted: true,
        acknowledgedChangelogVersions: [],
      },
      panelEntries: { ...defaultPanelEntries },
      storageRevision: Date.now(),
    };
    saveStorage();
  } else if ((saved as any).presets) {
    storage = saved as StorageData;
    if (!storage.onboarding || typeof storage.onboarding !== 'object') {
      // 旧版以 initialized 代表已经走过首次初始化；迁移后不重复播放教程，但仍展示新版本日志。
      storage.onboarding = {
        tutorialCompleted: !!storage.initialized,
        acknowledgedChangelogVersions: [],
      };
    }
    storage.onboarding.tutorialCompleted = !!storage.onboarding.tutorialCompleted;
    storage.onboarding.acknowledgedChangelogVersions = Array.from(
      new Set(
        Array.isArray(storage.onboarding.acknowledgedChangelogVersions)
          ? storage.onboarding.acknowledgedChangelogVersions.filter(version => typeof version === 'string')
          : [],
      ),
    );
    if (!storage.customQuickRequests || typeof storage.customQuickRequests !== 'object') {
      storage.customQuickRequests = {};
    }
    storage.customQuickRequests = Object.fromEntries(
      Object.entries(storage.customQuickRequests).filter(([, item]) => {
        const request = item as Partial<CustomQuickRequest> | null;
        return !!request && typeof request.name === 'string' && typeof request.command === 'string';
      }),
    );
    if (!storage.quickSwitchProfiles) storage.quickSwitchProfiles = {};
    for (const key in storage.presets) {
      storage.presets[key].themeMode = normalizeThemeMode(storage.presets[key]);
      storage.presets[key].autoTheme = storage.presets[key].themeMode === 'system';
      storage.presets[key].theme = resolveThemeMode(storage.presets[key].themeMode);
      storage.presets[key].commands = {
        ...defaultPreset.commands,
        ...(storage.presets[key].commands || {}),
      };
      if (!['open', 'half_open', 'assist', 'closed'].includes(storage.presets[key].takeover)) {
        storage.presets[key].takeover = defaultPreset.takeover;
      }
      if (!['open', 'balanced', 'light', 'closed'].includes(storage.presets[key].narrate)) {
        storage.presets[key].narrate = defaultPreset.narrate;
      }
      if (!storage.presets[key].paragraphStyle) {
        storage.presets[key].paragraphStyle = defaultPreset.paragraphStyle;
      }
      storage.presets[key].nsfw = normalizeNsfwSettings(storage.presets[key].nsfw);
      if (!storage.presets[key].lengthDefinitions) {
        storage.presets[key].lengthDefinitions = JSON.parse(JSON.stringify(defaultPreset.lengthDefinitions));
      }
      if (!storage.presets[key].quickSwitchProfiles) {
        storage.presets[key].quickSwitchProfiles = {};
      }
      if (!storage.presets[key].quickSwitchRuntimeStates) {
        storage.presets[key].quickSwitchRuntimeStates = {};
      }

      Object.values(storage.presets[key].quickSwitchProfiles).forEach((profile: any) => {
        normalizeQuickSwitchProfile(profile);
        if (!storage.quickSwitchProfiles![profile.id]) {
          storage.quickSwitchProfiles![profile.id] = profile;
        }
      });
      // 定义已迁移到根级资料库；预设内仅继续保存各自的运行状态。
      storage.presets[key].quickSwitchProfiles = {};
    }
    Object.values(storage.quickSwitchProfiles).forEach(normalizeQuickSwitchProfile);
  }

  normalizePanelEntries();

  refreshActiveSettings();

  // 将恢复出的最新数据重新镜像到三种存储，补齐旧版本缺少的备份。
  saveStorage();
}

/**
 * 保存主题设置到存储
 */
export function saveThemeModeToStorage(themeMode: QRPreset['themeMode']) {
  const charId = getCharacterId();
  let presetId = storage.globalPresetId;

  if (charId && storage.bindings[charId] && storage.presets[storage.bindings[charId]]) {
    presetId = storage.bindings[charId];
  }

  if (storage.presets[presetId]) {
    storage.presets[presetId].themeMode = themeMode;
    storage.presets[presetId].theme = resolveThemeMode(themeMode);
    storage.presets[presetId].autoTheme = themeMode === 'system';
    storage.presets[presetId].updateTime = Date.now();
    saveStorage();

    console.log(
      `预设助手 [主题设置]: 主题模式已保存到预设 "${storage.presets[presetId].name}" (${presetId}) - themeMode: ${themeMode}`,
    );
  }
}

export function resetRuntimeEditorState() {
  runtimeState.stagedPrompts = null;
  runtimeState.editingPresetId = null;
  runtimeState.tempThinkingStyle = null;
}

export function setStorage(next: StorageData) {
  storage = next;
}

export function setActiveSettings(next: QRPreset) {
  replaceActiveSettings(next);
}

export function isTutorialCompleted(): boolean {
  return !!storage.onboarding?.tutorialCompleted;
}

export function markTutorialCompleted() {
  if (!storage.onboarding) {
    storage.onboarding = { tutorialCompleted: true, acknowledgedChangelogVersions: [] };
  } else {
    storage.onboarding.tutorialCompleted = true;
  }
  saveStorage();
}

export function isChangelogAcknowledged(version: string): boolean {
  return !!storage.onboarding?.acknowledgedChangelogVersions.includes(version);
}

export function acknowledgeChangelog(version: string) {
  if (!storage.onboarding) {
    storage.onboarding = { tutorialCompleted: false, acknowledgedChangelogVersions: [] };
  }
  storage.onboarding.acknowledgedChangelogVersions = Array.from(
    new Set([...storage.onboarding.acknowledgedChangelogVersions, version]),
  );
  saveStorage();
}

export function getCustomQuickRequests(): CustomQuickRequest[] {
  return Object.values(storage.customQuickRequests || {}).sort(
    (left, right) => left.createTime - right.createTime || left.name.localeCompare(right.name),
  );
}

export function upsertCustomQuickRequest(input: { id?: string; name: string; command: string }): CustomQuickRequest {
  if (!storage.customQuickRequests) storage.customQuickRequests = {};
  const now = Date.now();
  const existing = input.id ? storage.customQuickRequests[input.id] : undefined;
  const item: CustomQuickRequest = {
    id: existing?.id || generateId(),
    name: input.name.trim(),
    command: input.command.trim(),
    createTime: existing?.createTime || now,
    updateTime: now,
  };
  storage.customQuickRequests[item.id] = item;
  saveStorage();
  return item;
}

export function removeCustomQuickRequest(id: string): boolean {
  if (!storage.customQuickRequests?.[id]) return false;
  delete storage.customQuickRequests[id];
  saveStorage();
  return true;
}
