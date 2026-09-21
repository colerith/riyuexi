import type { NsfwSettings, QRPreset } from './types';

export const NSFW_MASTER_PROMPT_ID = '098af4e4-5021-4c23-b013-b4646684994b';
export const NSFW_MASTER_PROMPT_NAME = '❖涩涩一键开关❖';

export const DEFAULT_NSFW_SETTINGS: NsfwSettings = {
  mode: 'off',
  configured: false,
  openKeywords: [
    '做爱',
    '上床',
    '插入',
    '口交',
    '内射',
    '高潮',
    '前戏',
    '自慰',
    '勃起',
    '脱光',
    '含住',
    '骑上',
    '湿了',
    '硬了',
    '瑟瑟',
    '涩涩',
    '色色',
    'nsfw',
    '鸡巴',
    '小穴',
    '阴道',
    '小逼',
    '屄',
    '阴蒂',
    '淫水',
    '爱液',
    '后穴',
    '精液',
    '阴唇',
    '子宫',
    '宫口',
    '屁眼',
    'G点',
    '阴茎',
    '肉棒',
  ],
  closeKeywords: ['事后', '结束性爱', '完事后'],
  holdTurns: 0,
  worldbookMode: 'none',
  worldbookMarkers: ['NSFW'],
};

export interface NsfwWorldbookRuntimeStatus {
  mode: NsfwSettings['worldbookMode'];
  removed: number;
  scanned: number;
  note: string;
}

export interface NsfwRuntimeStatus {
  available: boolean;
  active: boolean;
  note: string;
  worldbook: NsfwWorldbookRuntimeStatus;
}

interface NsfwPresetDeps {
  updatePresetWith: (name: string, updater: (preset: Preset) => Preset) => Promise<Preset>;
  getLoadedPresetName: () => string | null;
}

interface RegisterNsfwAutomationDeps extends NsfwPresetDeps {
  getSettings: () => QRPreset;
}

const FM_BLOCK = /<meow_FM>([\s\S]{0,4000}?)<\/meow_FM>/i;
const FM_NSFW = /^[ \t]*NSFW\s*[:：]\s*(\d{1,2})\s*\/\s*20\b/im;
const NSFW_SCENE_MARK = /舒适性爱检查|性爱柔和检测/;
const WORLDBOOK_GROUPS = ['globalLore', 'characterLore', 'chatLore', 'personaLore'] as const;

type WorldbookEntry = {
  comment?: unknown;
  name?: unknown;
  constant?: boolean;
};

type WorldbookPayload = Partial<Record<(typeof WORLDBOOK_GROUPS)[number], WorldbookEntry[]>>;

let runtimeStatus: NsfwRuntimeStatus = {
  available: false,
  active: false,
  note: '尚未检测到预设中的 NSFW 总控',
  worldbook: {
    mode: 'none',
    removed: 0,
    scanned: 0,
    note: 'NSFW 世界书联动未开启',
  },
};
const statusListeners = new Set<(status: NsfwRuntimeStatus) => void>();
let quietStreak = 0;
let lastApplied: boolean | null = null;
let turnKey = '';
let scopeKey = '';
let busy = false;

function cleanKeywordList(value: unknown, fallback: string[]) {
  const source = Array.isArray(value) ? value : fallback;
  return Array.from(new Set(source.map(item => String(item).trim()).filter(Boolean)));
}

export function normalizeNsfwSettings(value?: Partial<NsfwSettings> | null): NsfwSettings {
  const mode = value?.mode === 'on' || value?.mode === 'auto' ? value.mode : 'off';
  const worldbookMarkers = cleanKeywordList(value?.worldbookMarkers, DEFAULT_NSFW_SETTINGS.worldbookMarkers);
  return {
    mode,
    configured: value?.configured === true,
    openKeywords: cleanKeywordList(value?.openKeywords, DEFAULT_NSFW_SETTINGS.openKeywords),
    closeKeywords: cleanKeywordList(value?.closeKeywords, DEFAULT_NSFW_SETTINGS.closeKeywords),
    holdTurns: Math.min(2, Math.max(0, Number(value?.holdTurns) || 0)),
    worldbookMode: value?.worldbookMode === 'blue' || value?.worldbookMode === 'green' ? value.worldbookMode : 'none',
    worldbookMarkers: worldbookMarkers.length ? worldbookMarkers : [...DEFAULT_NSFW_SETTINGS.worldbookMarkers],
  };
}

export function splitNsfwKeywords(value: unknown) {
  return cleanKeywordList(String(value || '').split(/[\n,，、;；|｜\s]+/), []);
}

function publishStatus(next: Omit<NsfwRuntimeStatus, 'worldbook'> & { worldbook?: NsfwWorldbookRuntimeStatus }) {
  const complete = { ...next, worldbook: next.worldbook || runtimeStatus.worldbook };
  const changed =
    complete.available !== runtimeStatus.available ||
    complete.active !== runtimeStatus.active ||
    complete.note !== runtimeStatus.note ||
    complete.worldbook.mode !== runtimeStatus.worldbook.mode ||
    complete.worldbook.removed !== runtimeStatus.worldbook.removed ||
    complete.worldbook.scanned !== runtimeStatus.worldbook.scanned ||
    complete.worldbook.note !== runtimeStatus.worldbook.note;
  runtimeStatus = complete;
  if (!changed) return;
  statusListeners.forEach(listener => listener(getNsfwRuntimeStatus()));
}

export function getNsfwRuntimeStatus() {
  return { ...runtimeStatus, worldbook: { ...runtimeStatus.worldbook } };
}

export function onNsfwStatusChange(listener: (status: NsfwRuntimeStatus) => void) {
  statusListeners.add(listener);
  listener(getNsfwRuntimeStatus());
  return () => statusListeners.delete(listener);
}

export function findNsfwMaster(preset: Preset) {
  const prompts = preset.prompts || [];
  return (
    prompts.find(prompt => prompt.id === NSFW_MASTER_PROMPT_ID) ||
    prompts.find(prompt => prompt.name === NSFW_MASTER_PROMPT_NAME) ||
    null
  );
}

function publishWorldbookStatus(status: NsfwWorldbookRuntimeStatus) {
  publishStatus({ ...runtimeStatus, worldbook: status });
}

function refreshWorldbookModeStatus(config: NsfwSettings) {
  const current = runtimeStatus.worldbook;
  if (current.mode === config.worldbookMode) return;
  publishWorldbookStatus({
    mode: config.worldbookMode,
    removed: 0,
    scanned: 0,
    note: config.worldbookMode === 'none' ? 'NSFW 世界书联动未开启' : '等待下一次世界书加载；总控关闭时执行过滤',
  });
}

function readCurrentNsfwStatus(note?: string) {
  try {
    const target = findNsfwMaster(getPreset('in_use'));
    const next = {
      available: !!target,
      active: !!target?.enabled,
      note:
        note ||
        (target
          ? target.enabled
            ? '预设中的 NSFW 总控已激活'
            : '预设中的 NSFW 总控未激活'
          : '未找到预设中的 NSFW 总控条目'),
    };
    publishStatus(next);
    return next;
  } catch (error) {
    console.warn('预设助手[NSFW]: 读取总控状态失败', error);
    const next = { available: false, active: false, note: '无法读取预设中的 NSFW 总控状态' };
    publishStatus(next);
    return next;
  }
}

export async function refreshNsfwStatus() {
  return readCurrentNsfwStatus();
}

function hasTargetStateDiff(preset: Preset, enabled: boolean) {
  const target = findNsfwMaster(preset);
  return !!target && !!target.enabled !== enabled;
}

async function setNsfwPromptEnabled(enabled: boolean, deps: NsfwPresetDeps, note: string) {
  const inUse = getPreset('in_use');
  const available = !!findNsfwMaster(inUse);
  const updater = (preset: Preset) => {
    const target = findNsfwMaster(preset);
    if (!target) return preset;
    target.enabled = enabled;
    return preset;
  };

  const loadedPresetName = deps.getLoadedPresetName();
  if (hasTargetStateDiff(inUse, enabled)) await deps.updatePresetWith('in_use', updater);

  if (loadedPresetName) {
    try {
      const loaded = getPreset(loadedPresetName);
      if (hasTargetStateDiff(loaded, enabled)) await deps.updatePresetWith(loadedPresetName, updater);
    } catch (error) {
      console.warn(`预设助手[NSFW]: 写回预设“${loadedPresetName}”失败`, error);
    }
  }

  lastApplied = enabled;
  publishStatus({
    available,
    active: available && enabled,
    note: available ? note : '未找到预设中的 NSFW 总控条目',
  });
}

export async function applyConfiguredNsfwMode(settings: QRPreset, deps: NsfwPresetDeps) {
  const config = normalizeNsfwSettings(settings.nsfw);
  refreshWorldbookModeStatus(config);
  if (!config.configured) {
    readCurrentNsfwStatus('尚未配置自动判断，保持预设当前总控状态');
    return;
  }
  if (config.mode === 'auto') {
    readCurrentNsfwStatus('自动判断已启用，等待下一次发送');
    return;
  }
  await setNsfwPromptEnabled(
    config.mode === 'on',
    deps,
    config.mode === 'on' ? '常开模式：NSFW 已激活' : '关闭模式：NSFW 未激活',
  );
}

function hitKeyword(text: string, words: string[]) {
  const normalized = String(text || '').toLowerCase();
  return words.find(word => normalized.includes(word.toLowerCase())) || '';
}

/** true=处于 NSFW，false=明确不处于，null=摘要不可用或信号冲突。 */
export function detectSexualScene(reply: string): boolean | null {
  const block = FM_BLOCK.exec(String(reply || ''));
  if (!block) return null;
  const match = FM_NSFW.exec(block[1]);
  return match ? Number(match[1]) > 0 : null;
}

function worldbookEntryName(entry: WorldbookEntry) {
  return String(entry.comment ?? entry.name ?? '')
    .trim()
    .toLowerCase();
}

function filterNsfwWorldbook(payload: unknown, deps: RegisterNsfwAutomationDeps) {
  const config = normalizeNsfwSettings(deps.getSettings().nsfw);
  refreshWorldbookModeStatus(config);
  if (config.worldbookMode === 'none') return;

  let target: ReturnType<typeof findNsfwMaster>;
  try {
    target = findNsfwMaster(getPreset('in_use'));
  } catch (error) {
    console.warn('预设助手[NSFW世界书]: 读取总控状态失败，已放行世界书', error);
    publishWorldbookStatus({
      mode: config.worldbookMode,
      removed: 0,
      scanned: 0,
      note: '无法读取总控，已放行全部世界书条目',
    });
    return;
  }

  if (!target) {
    publishWorldbookStatus({
      mode: config.worldbookMode,
      removed: 0,
      scanned: 0,
      note: '未找到指定总控，已放行全部世界书条目',
    });
    return;
  }
  if (target.enabled) {
    publishWorldbookStatus({
      mode: config.worldbookMode,
      removed: 0,
      scanned: 0,
      note: 'NSFW 总控已激活，世界书条目全部放行',
    });
    return;
  }

  const source = payload && typeof payload === 'object' ? (payload as WorldbookPayload) : {};
  const markers = config.worldbookMarkers.map(marker => marker.toLowerCase());
  let scanned = 0;
  let removed = 0;
  let blue = 0;
  let green = 0;
  let kept = 0;
  for (const group of WORLDBOOK_GROUPS) {
    const entries = source[group];
    if (!Array.isArray(entries)) continue;
    scanned += entries.length;
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const entry = entries[index];
      const marked = markers.some(marker => worldbookEntryName(entry).includes(marker));
      if (!marked) continue;
      const isBlue = entry.constant === true;
      if (config.worldbookMode === 'blue' && !isBlue) {
        kept += 1;
        continue;
      }
      entries.splice(index, 1);
      removed += 1;
      if (isBlue) blue += 1;
      else green += 1;
    }
  }

  const note = scanned
    ? `总控关闭：已过滤 ${removed} 条（蓝灯 ${blue} / 绿灯 ${green}）${kept ? `，保留 ${kept} 条绿灯按原关键词触发` : ''}`
    : '本次未收到可过滤的世界书条目，已安全放行';
  publishWorldbookStatus({ mode: config.worldbookMode, removed, scanned, note });
  console.info(`预设助手[NSFW世界书]: ${note}`);
}

function decideNsfw(active: boolean, input: string, reply: string, config: NsfwSettings) {
  const closeHit = hitKeyword(input, config.closeKeywords);
  if (closeHit) {
    quietStreak = 0;
    return { wanted: false, note: `输入命中关闭词“${closeHit}”，已关闭` };
  }
  const openHit = hitKeyword(input, config.openKeywords);
  if (openHit) {
    quietStreak = 0;
    return { wanted: true, note: `输入命中启动词“${openHit}”，已开启` };
  }

  const scene = detectSexualScene(reply);
  if (scene === true) {
    quietStreak = 0;
    return { wanted: true, note: '摘要显示处于 NSFW 场景，已开启' };
  }
  if (scene === null) {
    if (NSFW_SCENE_MARK.test(reply)) {
      quietStreak = 0;
      return { wanted: true, note: '摘要缺失，按正文自检标记判定为 NSFW 场景' };
    }
    return { wanted: null, note: '无可用判定依据，维持当前状态' };
  }
  if (!active) return { wanted: null, note: '摘要显示非 NSFW 场景，维持关闭' };

  quietStreak += 1;
  const closeAfter = config.holdTurns + 1;
  if (quietStreak < closeAfter) {
    return { wanted: null, note: `事后缓冲 ${quietStreak}/${config.holdTurns} 回合` };
  }
  return {
    wanted: false,
    note: config.holdTurns ? `非 NSFW 场景已持续 ${closeAfter} 回合，已关闭` : '摘要显示非 NSFW 场景，已关闭',
  };
}

function latestChatTexts() {
  const messages = getChatMessages('0-{{lastMessageId}}', { include_swipes: false });
  let user = '';
  let assistant = '';
  let lastMessageId = -1;
  for (let index = messages.length - 1; index >= 0 && (!user || !assistant); index -= 1) {
    const message = messages[index];
    lastMessageId = Math.max(lastMessageId, message.message_id);
    if (!user && message.role === 'user') user = message.message;
    if (!assistant && message.role === 'assistant') assistant = message.message;
  }
  return { user, assistant, lastMessageId };
}

function currentScope() {
  let chatId = '';
  try {
    chatId = String((SillyTavern as any).getContext?.().getCurrentChatId?.() ?? '');
  } catch {
    /* 无聊天时使用空字符串。 */
  }
  return `${getLoadedPresetName?.() || ''}|${chatId}`;
}

function resetDecisionState(note = '已切换预设或聊天，判定状态重置') {
  quietStreak = 0;
  lastApplied = null;
  turnKey = '';
  readCurrentNsfwStatus(note);
}

async function syncNsfwScene(deps: RegisterNsfwAutomationDeps) {
  const config = normalizeNsfwSettings(deps.getSettings().nsfw);
  if (!config.configured || config.mode !== 'auto' || busy) return;

  const scope = currentScope();
  if (scope !== scopeKey) {
    scopeKey = scope;
    resetDecisionState();
  }

  const { user, assistant, lastMessageId } = latestChatTexts();
  const key = `${lastMessageId}|${user.slice(-60)}`;
  if (key === turnKey) return;
  turnKey = key;
  busy = true;
  try {
    const current = readCurrentNsfwStatus();
    if (!current.available) return;
    if (lastApplied !== null && current.active !== lastApplied) quietStreak = 0;
    const decision = decideNsfw(current.active, user, assistant, config);
    console.info('预设助手[NSFW]:', decision.note);
    if (decision.wanted === null || decision.wanted === current.active) {
      publishStatus({ ...current, note: decision.note });
      lastApplied = current.active;
      return;
    }
    await setNsfwPromptEnabled(decision.wanted, deps, decision.note);
    if (!decision.wanted) quietStreak = 0;
  } catch (error) {
    turnKey = '';
    console.warn('预设助手[NSFW]: 自动判断未执行', error);
    readCurrentNsfwStatus('本回合判定异常，已跳过');
  } finally {
    busy = false;
  }
}

function stopEvent(result: unknown) {
  if (typeof result === 'function') return result as () => void;
  if (result && typeof (result as EventOnReturn).stop === 'function') return () => (result as EventOnReturn).stop();
  return null;
}

export function registerNsfwAutomation(deps: RegisterNsfwAutomationDeps) {
  const stops: Array<() => void> = [];
  const subscribe = (name: string | undefined, handler: (...args: any[]) => unknown) => {
    if (!name) return;
    const stop = stopEvent(eventOn(name, handler));
    if (stop) stops.push(stop);
  };

  subscribe(tavern_events.MESSAGE_SENT, () => syncNsfwScene(deps));
  subscribe(tavern_events.GENERATION_AFTER_COMMANDS, (type: string, _options: unknown, dryRun: boolean) => {
    if (dryRun || type === 'quiet' || type === 'impersonate') return;
    return syncNsfwScene(deps);
  });
  subscribe(tavern_events.GENERATION_STOPPED, () => {
    turnKey = '';
  });
  subscribe(tavern_events.WORLDINFO_ENTRIES_LOADED || 'worldinfo_entries_loaded', payload =>
    filterNsfwWorldbook(payload, deps),
  );
  const reset = () => {
    scopeKey = '';
    resetDecisionState();
  };
  subscribe(tavern_events.CHAT_CHANGED, reset);
  subscribe(tavern_events.OAI_PRESET_CHANGED_AFTER, reset);
  subscribe(tavern_events.PRESET_CHANGED, reset);

  void refreshNsfwStatus();
  return () => stops.splice(0).forEach(stop => stop());
}
