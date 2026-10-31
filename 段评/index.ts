// 纸间 · 小说段评 v1.3.0（评论互动版）
// MIT; locally bundled, no CDN or message writes.
// 蓝图版改动：跟随蓝图全局美化（空明 / 格子图纸 · 日夜 · 省电）；阅读面板不再全屏——
// 宽屏是贴着气泡的浮卡，窄屏是底部半屏抽屉，点空白、下滑、Esc 都能关；只盯 #chat，生成期间延后渲染，结束后合并更新。
import styleText from './style.css?raw';
import {
  createCommunityStore,
  normalizeTags,
  parseIdentity,
  resolveFace,
  stableKey,
  type CommunityStore,
} from './community';

type Skin = 'kongming' | 'blueprint' | 'jinjiang' | 'lofter' | 'ao3' | 'paper' | 'night';
type BlueprintSkin = 'kongming' | 'blueprint';
type Mode = 'day' | 'night';
interface Palette {
  accent: string;
  paper: string;
  ink: string;
}
interface Settings {
  enabled: boolean;
  skin: Skin;
  follow: boolean;
  colorMode: 'preset' | 'follow' | 'custom';
  showTags: boolean;
  fontSize: number;
  custom: Palette;
}
interface ReaderComment {
  title: string;
  name: string;
  text: string;
}
interface ParsedEntry {
  inner: string;
  face: string;
  count: number;
  tags: string[];
  comments: ReaderComment[];
  warnings: string[];
}
interface Annotation extends ParsedEntry {
  raw: string;
  start: number;
  end: number;
  quote: string;
  ordinal: number;
}
type ThemeElement = HTMLElement & { __hcKeys?: string[] };
interface BubbleRecord {
  scope: string;
  entry: Annotation;
  original: DocumentFragment;
  host: HTMLButtonElement;
  button: HTMLButtonElement;
  neighbors: () => BubbleRecord[];
}
interface MessageState {
  element: Element;
  text: Element;
  source: string;
  parsed: ReturnType<typeof parseAnnotations>;
  records: BubbleRecord[];
  projections: Map<number, string[]>;
}
interface HostMessage {
  mes?: string;
  is_user?: boolean;
  is_system?: boolean;
  role?: string;
}
interface ShowdownLibrary {
  Converter: new (options: Record<string, boolean>) => { makeHtml(text: string): string };
}
type HostWindow = Window &
  Pick<typeof globalThis, 'MutationObserver' | 'CSS'> & {
    SillyTavern?: {
      libs?: { showdown?: ShowdownLibrary };
      getContext(): {
        chat: HostMessage[];
        eventTypes?: Record<string, string>;
        characterId?: string;
        chatId?: string;
        getCurrentChatId?: () => string;
      };
    };
    showdown?: ShowdownLibrary;
    __TAURITAVERN__?: { ready?: Promise<unknown> };
    __TAURITAVERN_MAIN_READY__?: Promise<unknown>;
    [RUNTIME_KEY]?: { dispose(): void };
  };
// 排除其他脚本对 Window 的同名扩展，避免宽泛签名覆盖酒馆助手接口。
type ScriptWindow = Omit<
  Window,
  'getVariables' | 'updateVariablesWith' | 'eventOn' | 'tavern_events' | 'getButtonEvent'
> & {
  getVariables: typeof getVariables;
  updateVariablesWith: typeof updateVariablesWith;
  eventOn: typeof eventOn;
  tavern_events?: Record<string, string>;
  getButtonEvent: typeof getButtonEvent;
};
interface Tap {
  button: HTMLButtonElement;
  id: number;
  x: number;
  y: number;
  time: number;
  rect: DOMRect;
  clicked: boolean;
}
type Activation = (event: MouseEvent | TouchEvent) => void;
interface UIOptions {
  community: CommunityStore;
  win: HostWindow;
  styleText: string;
  getSettings(): Settings;
  changeSettings(patch: Partial<Settings>): boolean;
  refresh(): void;
  allRecords?: () => BubbleRecord[];
}

// ── parser ──
/** Pure parser. Never evaluates HTML, writes messages, or guesses missing comments. */
function parseEntry(value: string): ParsedEntry | null {
  // 1.2.3：宽松解析。方括号可有可无（新写法 <hc>颜文字|评论数|标签…|网名：批注…</hc>），
  // 半角/全角竖线、换行都算分隔；颜文字里自带 | 的、评论数写成「128条」的、多一个空字段的都认。
  // 只要能认出至少一条「网名：批注」就显示，缺的东西写进面板底部的提示，不再整条丢掉。
  const inner = value.trim();
  let body = inner;
  const wrap = body.match(/^[[【]([\s\S]*)[\]】]$/u);
  if (wrap) body = wrap[1];
  const raw = body.split(/[|｜\n]/u),
    fields = raw.map(v => v.trim()).filter(Boolean);
  if (fields.length < 2) return null;
  const isNote = (field: string) => {
    const i = field.search(/[:：]/u);
    return (
      !/^(?:[#＃]|标签\s*[:：]|tags?\s*[:：]|情绪\s*[:：]|emotion\s*[:：])/i.test(field) &&
      i >= 1 &&
      i <= 160 &&
      Boolean(field.slice(i + 1).trim())
    );
  };
  // 评论数：前面几段里第一个「纯数字（可带 条/评/赞）」的；它前面的原样拼回颜文字（颜文字自带的 ||| 不丢）
  const at = raw.slice(0, 8).findIndex(f => /^\s*\d{1,6}\s*(?:条|评|赞|个)?\s*$/u.test(f));
  let face = '',
    count = 0,
    rest;
  if (at >= 0 && !raw.slice(0, at).some(isNote)) {
    face = raw.slice(0, at).join('|').trim();
    count = Number(raw[at].match(/\d+/)![0]);
    rest = raw
      .slice(at + 1)
      .map(v => v.trim())
      .filter(Boolean);
  } else {
    face = isNote(fields[0]) ? '' : fields[0];
    rest = face ? fields.slice(1) : fields;
  }
  const comments: ReaderComment[] = [],
    tags: string[] = [];
  for (const field of rest) {
    if (isNote(field)) {
      const i = field.search(/[:：]/u);
      comments.push({ ...parseIdentity(field.slice(0, i)), text: field.slice(i + 1).trim() });
    } else if (!comments.length) tags.push(field);
    else if (comments.length) comments[comments.length - 1].text += `｜${field}`; // 批注里自带竖线：接回上一条
  }
  if (!comments.length) return null;
  // 长标签、少量评论和旧格式均可阅读，不将提示词约束变成阅读面板警告。
  face = resolveFace(face, inner);
  count = Math.min(Math.max(count || comments.length, 1), 9999);
  return { inner, face, count, tags: normalizeTags(tags), comments, warnings: [] };
}

function parseAnnotations(source = '') {
  const text = String(source);
  // Mask code without changing offsets. A documented example must never become a bubble.
  const masked = text.replace(/(^|\n)[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:\n[ \t]*\2[^\n]*(?=\n|$)|$)/g, m =>
    m.replace(/[^\n]/g, ' '),
  );
  const entries: Annotation[] = [];
  let invalid = 0;
  // An inline code span wins if it starts before <hc>. Backticks inside a complete
  // annotation belong to its kaomoji/prose and must not swallow later entries.
  for (const match of masked.matchAll(/<hc\s*>([\s\S]*?)<\/hc\s*>|(`+)[^\n]*?\2/gi)) {
    if (match[1] === undefined) continue;
    const entry = parseEntry(match[1]);
    if (!entry) {
      invalid++;
      continue;
    }
    const start = match.index;
    const before = text
      .slice(0, start)
      .replace(/<hc\s*>[\s\S]*?<\/hc\s*>/gi, '')
      .replace(/<[^>]*>/g, '');
    const paragraph =
      before
        .trim()
        .split(/\n\s*\n|\n/)
        .pop() || '';
    entries.push({
      ...entry,
      raw: text.slice(start, start + match[0].length),
      start,
      end: start + match[0].length,
      quote: paragraph.slice(-180),
      ordinal: entries.length + 1,
    });
  }
  return { entries, invalid };
}

const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze<Settings>({
  enabled: true,
  skin: 'jinjiang',
  follow: true,
  colorMode: 'preset',
  showTags: false,
  fontSize: 15,
  custom: { accent: '#47765b', paper: '#fcfdf9', ink: '#293b30' },
});

function normalizeSettings(value?: unknown): Settings {
  const v = (value && typeof value === 'object' ? value : {}) as Partial<Settings>;
  const custom = { ...DEFAULT_SETTINGS.custom };
  for (const key of Object.keys(custom) as (keyof Palette)[])
    if (/^#[\da-f]{6}$/i.test(v.custom?.[key] ?? '')) custom[key] = v.custom![key];
  return {
    enabled: typeof v.enabled === 'boolean' ? v.enabled : true,
    skin: ['kongming', 'blueprint', 'jinjiang', 'lofter', 'ao3', 'paper', 'night'].includes(v.skin ?? '')
      ? v.skin!
      : 'jinjiang',
    follow: v.follow !== false,
    colorMode: ['preset', 'follow', 'custom'].includes(v.colorMode ?? '') ? v.colorMode! : 'preset',
    showTags: v.showTags === true,
    fontSize: Math.max(13, Math.min(20, Number(v.fontSize) || 15)),
    custom,
  };
}

// ── themes ──
const THEMES = {
  jinjiang: {
    name: '晋江 · 书评',
    title: '段评',
    accent: '#447044',
    paper: '#fffef8',
    ink: '#303b2c',
    wash: '#ecf2e4',
    muted: '#68775f',
    line: '#c5d1b6',
    font: '"Songti SC", SimSun, serif',
  },
  lofter: {
    name: 'LOFTER · 留白',
    title: '评论',
    accent: '#277866',
    paper: '#ffffff',
    ink: '#202622',
    wash: '#f2f5f3',
    muted: '#78847d',
    line: '#e5eae6',
    font: '"PingFang SC", "Microsoft YaHei", sans-serif',
  },
  ao3: {
    name: 'AO3 · 档案',
    title: 'Comments',
    accent: '#990000',
    paper: '#ffffff',
    ink: '#292929',
    wash: '#eeeeee',
    muted: '#666666',
    line: '#cccccc',
    font: 'Georgia, "Times New Roman", "Songti SC", SimSun, serif',
  },
  paper: {
    name: '纸笺 · 手记',
    title: '页边批注',
    accent: '#8b5d3c',
    paper: '#fff9e9',
    ink: '#514332',
    wash: '#f0e6cf',
    muted: '#8a7659',
    line: '#d7c8a7',
    font: '"Kaiti SC", KaiTi, STKaiti, "Songti SC", serif',
  },
  night: {
    name: '夜读 · 月相',
    title: '夜读',
    accent: '#bec3ed',
    paper: '#20232e',
    ink: '#e9e8ef',
    wash: '#2c303e',
    muted: '#a1a6ba',
    line: '#42485c',
    font: '"Noto Serif SC", "Songti SC", SimSun, serif',
  },
};

// 蓝图全局美化：主脑在 <html> 上写 data-bp-skin（kongming / blueprint / original）、data-bp-mode（day / night）、
// data-bp-lite（省电）。色值与主脑 --k-* 同一套，抄在这里，主脑没开时设置页的缩略图也能画对。
const BP_SKINS = { kongming: { name: '空明', title: '段评' }, blueprint: { name: '格子图纸', title: '段评' } };
const BP_SANS =
  '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei UI", "Microsoft YaHei", "Segoe UI", sans-serif';
const BP_MONO = '"SF Mono", "Cascadia Mono", Consolas, "Liberation Mono", "Microsoft YaHei UI", monospace';
const BP_TOKENS = {
  kongming: {
    day: {
      accent: '#36526a',
      soft: '#36526a14',
      onAccent: '#f4f1ec',
      paper: 'transparent',
      surface: '#f4f1ecb3',
      sheen: '#ffffff66',
      solid: '#f4f1ec',
      ink: '#14161a',
      ink2: '#14161ab8',
      muted: '#14161a9e',
      wash: '#14161a0a',
      line: '#14161a24',
      line2: '#14161a85',
      grid: 'transparent',
      gold: '#614f2c',
      scrim: '#14161a29',
      shadow: '0 18px 48px #14161a26, inset 0 1px 0 #ffffff80',
      halo: '0 0 14px #f4f1ec99',
    },
    night: {
      accent: '#a7bfd3',
      soft: '#a7bfd31a',
      onAccent: '#141619',
      paper: 'transparent',
      surface: '#17191dad',
      sheen: '#ffffff0d',
      solid: '#17191d',
      ink: '#eceae6',
      ink2: '#eceae6b8',
      muted: '#eceae694',
      wash: '#eceae60d',
      line: '#eceae624',
      line2: '#eceae670',
      grid: 'transparent',
      gold: '#d0b88c',
      scrim: '#00000052',
      shadow: '0 18px 48px #0000008c, inset 0 1px 0 #ffffff14',
      halo: '0 0 14px #0b0c0eb3',
    },
  },
  blueprint: {
    day: {
      accent: '#1f4a7a',
      soft: '#1f4a7a14',
      onAccent: '#fbfaf6',
      paper: '#fbfaf6',
      surface: '#fbfaf6e0',
      sheen: '#ffffff73',
      solid: '#fbfaf6',
      ink: '#1d2733',
      ink2: '#465262',
      muted: '#5f6975',
      wash: '#ebe8df',
      line: '#d6d2c6',
      line2: '#8b8778',
      grid: '#1f4a7a12',
      gold: '#7e5f22',
      scrim: '#10213547',
      shadow: '0 12px 32px #1d273329',
      halo: 'none',
    },
    night: {
      accent: '#71c4d4',
      soft: '#71c4d41a',
      onAccent: '#07090c',
      paper: '#0c1116',
      surface: '#0c1116d9',
      sheen: '#71c4d40a',
      solid: '#0c1116',
      ink: '#e2e9ee',
      ink2: '#adbac4',
      muted: '#8796a1',
      wash: '#131b22',
      line: '#23313b',
      line2: '#4f6370',
      grid: '#71c4d40f',
      gold: '#dfb879',
      scrim: '#00000080',
      shadow: '0 12px 32px #000000a6',
      halo: 'none',
    },
  },
};
function isBlueprintSkin(skin: Skin): skin is BlueprintSkin {
  return skin === 'kongming' || skin === 'blueprint';
}

function hostLook(win: HostWindow): { skin: BlueprintSkin | null; mode: Mode; lite: boolean } {
  const r = win.document.documentElement;
  const skin = r.getAttribute('data-bp-skin');
  return {
    skin: skin === 'kongming' || skin === 'blueprint' ? skin : null,
    mode: r.getAttribute('data-bp-mode') === 'day' ? 'day' : 'night',
    lite: r.getAttribute('data-bp-lite') === '1',
  };
}
/** 实际用哪套：开了「跟随全局美化」且主脑在用空明 / 格子图纸时用它，否则用自己选的五套之一。 */
function effectiveSkin(settings: Settings, win: HostWindow): Skin {
  const look = hostLook(win);
  return settings.follow && look.skin ? look.skin : settings.skin;
}

/** Read computed colors only: never copy/inject the host's arbitrary CSS. */
function sampleHostPalette(win: HostWindow): Palette {
  const doc = win.document;
  const target = doc.querySelector('#chat .mes_text') || doc.body;
  const computed = win.getComputedStyle(target);
  const body = win.getComputedStyle(doc.body);
  const root = win.getComputedStyle(doc.documentElement);
  const read = (key: string) =>
    computed.getPropertyValue(key).trim() || body.getPropertyValue(key).trim() || root.getPropertyValue(key).trim();
  const valid = (color: string) =>
    color && win.CSS.supports('color', color) && color !== 'transparent' && !/rgba\([^)]*,\s*0\s*\)/.test(color);
  const pick = (...colors: string[]) => colors.find(valid)!;
  return {
    accent: pick(read('--SmartThemeQuoteColor'), read('--SmartThemeEmColor'), '#91b59b'),
    paper: pick(read('--SmartThemeBlurTintColor'), body.backgroundColor, '#292b30'),
    ink: pick(read('--SmartThemeBodyColor'), computed.color, '#eeeef0'),
  };
}

function themeVariables(
  settings: Settings,
  win: HostWindow,
  skinId: Skin = settings.skin,
  modeOverride?: Mode,
): Record<string, string> {
  if (isBlueprintSkin(skinId)) {
    const t = BP_TOKENS[skinId][modeOverride || hostLook(win).mode];
    return {
      '--hc-accent': t.accent,
      '--hc-soft': t.soft,
      '--hc-on-accent': t.onAccent,
      '--hc-paper': t.paper,
      '--hc-surface': t.surface,
      '--hc-sheen': t.sheen,
      '--hc-solid': t.solid,
      '--hc-ink': t.ink,
      '--hc-ink2': t.ink2,
      '--hc-wash': t.wash,
      '--hc-muted': t.muted,
      '--hc-line': t.line,
      '--hc-line2': t.line2,
      '--hc-grid': t.grid,
      '--hc-gold': t.gold,
      '--hc-scrim': t.scrim,
      '--hc-shadow': t.shadow,
      '--hc-halo': t.halo,
      '--hc-font': BP_SANS,
      '--hc-mono': BP_MONO,
      '--hc-size': `${settings.fontSize}px`,
    };
  }
  const skin = THEMES[skinId];
  const palette =
    settings.colorMode === 'follow' ? sampleHostPalette(win) : settings.colorMode === 'custom' ? settings.custom : null;
  const p = palette
    ? {
        ...skin,
        ...palette,
        wash: `color-mix(in srgb, ${palette.ink} 6%, ${palette.paper})`,
        muted: `color-mix(in srgb, ${palette.ink} 70%, ${palette.paper})`,
        line: `color-mix(in srgb, ${palette.ink} 22%, ${palette.paper})`,
      }
    : skin;
  return {
    '--hc-accent': p.accent,
    '--hc-paper': p.paper,
    '--hc-ink': p.ink,
    '--hc-wash': p.wash,
    '--hc-muted': p.muted,
    '--hc-line': p.line,
    '--hc-font': p.font,
    '--hc-size': `${settings.fontSize}px`,
    '--hc-surface': p.paper,
    '--hc-solid': p.paper,
  };
}

// ── activation ──
// Native click remains the primary activation path. Some host listeners cancel
// touchend, suppressing the browser's click. Recover only that specific case.
function createButtonActivation(win: HostWindow) {
  const doc = win.document;
  let bindings = new WeakMap<HTMLButtonElement, { activate: Activation; click: (event: MouseEvent) => void }>();
  let touch: Tap | null = null,
    pending: Tap | null = null;
  let lastFallback: { button: HTMLButtonElement; until: number } | null = null;
  let timer = 0,
    disposed = false;
  const now = () => win.performance.now();
  const reset = () => {
    touch = null;
    pending = null;
    win.clearTimeout(timer);
    timer = 0;
  };
  const moved = (tap: Tap, point: Touch) => Math.hypot(point.clientX - tap.x, point.clientY - tap.y) > 10;
  function hitButton(button: HTMLButtonElement, x: number, y: number) {
    let hit = doc.elementFromPoint(x, y);
    while (hit?.shadowRoot) {
      const inner = hit.shadowRoot.elementFromPoint(x, y);
      if (!inner || inner === hit) break;
      hit = inner;
    }
    return hit === button || button.contains(hit);
  }
  function start(event: TouchEvent) {
    reset();
    lastFallback = null;
    if (!event.isTrusted || event.touches.length !== 1 || event.changedTouches.length !== 1) return;
    const button = event
      .composedPath()
      .find((node): node is HTMLButtonElement => bindings.has(node as HTMLButtonElement));
    if (!button || button.disabled || !button.isConnected) return;
    const point = event.changedTouches[0];
    if (!hitButton(button, point.clientX, point.clientY)) return;
    touch = {
      button,
      id: point.identifier,
      x: point.clientX,
      y: point.clientY,
      time: now(),
      rect: button.getBoundingClientRect(),
      clicked: false,
    };
  }
  function move(event: TouchEvent) {
    if (!touch) return;
    const point = Array.from(event.touches).find(point => point.identifier === touch!.id);
    if (event.touches.length !== 1 || !point || moved(touch, point)) reset();
  }
  function end(event: TouchEvent) {
    const tap = touch;
    touch = null;
    if (!tap) return;
    const point = Array.from(event.changedTouches).find(point => point.identifier === tap.id);
    if (
      event.touches.length ||
      !point ||
      moved(tap, point) ||
      now() - tap.time > 500 ||
      !event.composedPath().includes(tap.button)
    )
      return;
    pending = tap;
    // Read defaultPrevented AFTER all capture/target/bubble listeners ran.
    timer = win.setTimeout(() => {
      timer = 0;
      pending = null;
      const { button } = tap;
      const activate = bindings.get(button)?.activate;
      if (disposed || tap.clicked || !event.defaultPrevented || !activate || !button.isConnected || button.disabled)
        return;
      const rect = button.getBoundingClientRect();
      if (
        Math.abs(rect.x - tap.rect.x) > 2 ||
        Math.abs(rect.y - tap.rect.y) > 2 ||
        !hitButton(button, point.clientX, point.clientY)
      )
        return;
      lastFallback = { button, until: now() + 800 };
      activate(event);
    }, 0);
  }
  function pointer(event: PointerEvent) {
    if (event.pointerType !== 'touch') {
      reset();
      lastFallback = null;
    }
  }
  const handlers: [string, EventListener][] = [
    ['touchstart', start as EventListener],
    ['touchmove', move as EventListener],
    ['touchend', end as EventListener],
    ['touchcancel', reset],
    ['pointercancel', reset],
    ['pointerdown', pointer as EventListener],
    ['scroll', reset],
    ['resize', reset],
  ];
  for (const [type, handler] of handlers) win.addEventListener(type, handler, { capture: true, passive: true });
  doc.addEventListener('visibilitychange', reset);
  return {
    bind(button: HTMLButtonElement, activate: Activation) {
      const click = (
        event: MouseEvent & { pointerType?: string; sourceCapabilities?: { firesTouchEvents: boolean } },
      ) => {
        if (disposed || button.disabled) return;
        if (touch?.button === button) touch.clicked = true;
        if (pending?.button === button) pending.clicked = true;
        const fromTouch =
          event.pointerType === 'touch' ||
          event.sourceCapabilities?.firesTouchEvents ||
          (!('pointerType' in event) && event.detail > 0);
        // Ignore only a late compatibility click for the already-handled tap.
        // A new touch/pointer, keyboard activation or .click() remains usable.
        if (fromTouch && lastFallback?.button === button && now() < lastFallback.until) return;
        activate(event);
      };
      bindings.set(button, { activate, click });
      button.addEventListener('click', click);
    },
    forget(button: HTMLButtonElement) {
      const binding = bindings.get(button);
      if (binding) button.removeEventListener('click', binding.click);
      bindings.delete(button);
      if (touch?.button === button || pending?.button === button) reset();
      if (lastFallback?.button === button) lastFallback = null;
    },
    dispose() {
      disposed = true;
      reset();
      lastFallback = null;
      bindings = new WeakMap();
      for (const [type, handler] of handlers) win.removeEventListener(type, handler, true);
      doc.removeEventListener('visibilitychange', reset);
    },
  };
}

// ── ui ──

// Font Awesome Free solid 字形；Shadow DOM 内显式使用宿主图标字体。
const ICONS = {
  comment: '\uf075',
  close: '\uf00d',
  moon: '\uf186',
  pen: '\uf303',
  gear: '\uf013',
  previous: '\uf053',
  next: '\uf054',
  refresh: '\uf2f1',
  like: '\uf164',
  check: '\uf00c',
  palette: '\uf53f',
};

// Only the native trigger lives in the page's light DOM. Reset its box so host
// button themes cannot override the isolated bubble; never style other buttons.
const TRIGGER_STYLE = `
button[data-hui-hc][type="button"] {
  all:initial !important; display:inline-flex !important; align-items:center !important; vertical-align:middle !important;
  box-sizing:border-box !important; max-width:100% !important; margin:3px 6px !important;
  padding:0 !important; border:0 !important; cursor:pointer !important;
  touch-action:manipulation !important; user-select:none !important; -webkit-user-select:none !important;
  -webkit-tap-highlight-color:transparent !important;
}
button[data-hui-hc][type="button"]::before,
button[data-hui-hc][type="button"]::after { content:none !important; display:none !important; }
button[data-hui-hc][type="button"]:focus-visible,
button[data-hui-hc][type="button"][aria-expanded="true"] {
  outline:2px solid var(--hc-accent) !important; outline-offset:3px !important;
}
button[data-hui-hc][type="button"]:active { transform:translateY(1px) !important; }
button[data-hui-hc][type="button"]:hover { filter:brightness(.96) !important; }
button[data-hui-hc][type="button"] > [data-hui-hc-visual] {
  all:initial !important; display:inline-flex !important; max-width:100% !important;
  pointer-events:none !important;
}
@media (pointer:coarse) {
  button[data-hui-hc][type="button"] { min-width:44px !important; min-height:44px !important; }
}
button[data-hui-hc][type="button"][data-skin="kongming"] { border-radius:999px !important; }
button[data-hui-hc][type="button"][data-skin="blueprint"] { border-radius:3px !important; }
`;

function createUI({
  win,
  styleText,
  getSettings,
  changeSettings,
  refresh,
  community,
  allRecords = () => [],
}: UIOptions) {
  const doc = win.document;
  const activation = createButtonActivation(win);
  const roots = new Set<ThemeElement>();
  let active:
    | { kind: 'comments'; record: BubbleRecord; trigger: HTMLButtonElement }
    | { kind: 'settings'; trigger?: undefined }
    | null = null;
  let lastFocus: HTMLElement | null = null;
  let saveError = '';
  let layer: HTMLDivElement | null = null;
  const make = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className?: string,
    text?: string,
  ): HTMLElementTagNameMap[K] => {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const fontProbe = make('i', 'fa-solid fa-comment');
  fontProbe.hidden = true;
  doc.body.append(fontProbe);
  const hostIconFont = win.getComputedStyle(fontProbe).fontFamily;
  const iconFont = /awesome/i.test(hostIconFont) ? hostIconFont : '"Font Awesome 6 Free", "Font Awesome 5 Free"';
  fontProbe.remove();
  const icon = (name: keyof typeof ICONS) => {
    const node = make('i', 'hc-icon fa-solid', ICONS[name]);
    if (name === 'refresh') node.classList.add('fa-arrows-rotate');
    node.setAttribute('aria-hidden', 'true');
    node.style.fontFamily = `${iconFont}, "Font Awesome 6 Free", "Font Awesome 5 Free"`;
    return node;
  };
  const button = (text: string, className: string, action?: Activation, focusKey?: string) => {
    const b = make('button', className, text);
    b.type = 'button';
    const actionIcons: Partial<Record<string, keyof typeof ICONS>> = {
      上一段: 'previous',
      下一段: 'next',
      重新识别: 'refresh',
      完成: 'check',
      重新吸取配色: 'palette',
      吸取酒馆配色: 'palette',
    };
    const actionIcon = actionIcons[text];
    if (actionIcon) b.prepend(icon(actionIcon));
    if (action) activation.bind(b, action);
    if (focusKey) b.dataset.focus = focusKey;
    return b;
  };
  const effSkin = () => effectiveSkin(getSettings(), win);
  const isBp = isBlueprintSkin;
  function applyTheme(
    host: ThemeElement,
    settings = getSettings(),
    skinId = effectiveSkin(settings, win),
    mode?: Mode,
  ) {
    const look = hostLook(win);
    host.dataset.skin = skinId;
    host.dataset.mode = mode || look.mode;
    if (look.lite) host.dataset.lite = '';
    else delete host.dataset.lite;
    const vars = themeVariables(settings, win, skinId, mode);
    // 换套时把上一套多出来的变量清掉，免得空明的玻璃色残留到晋江上
    for (const key of host.__hcKeys || []) if (!(key in vars)) host.style.removeProperty(key);
    host.__hcKeys = Object.keys(vars);
    Object.entries(vars).forEach(([key, value]) => host.style.setProperty(key, value));
  }
  function shadow(host: ThemeElement, themeHost: ThemeElement = host) {
    const root = host.attachShadow({ mode: 'open' });
    const style = make('style');
    style.textContent = styleText;
    root.append(style);
    roots.add(themeHost);
    applyTheme(themeHost);
    return root;
  }
  const triggerStyle = make('style');
  triggerStyle.dataset.huiHcStyle = '';
  triggerStyle.textContent = TRIGGER_STYLE;
  doc.head.append(triggerStyle);
  const overlayHost = make('div');
  overlayHost.dataset.huiOverlay = '';
  // ST's narrow layout can leave its transformed html at zero height.
  // Give our overlay a viewport height instead of stretching to that ancestor.
  overlayHost.style.cssText =
    'position:fixed;inset:0;height:100vh;height:100dvh;pointer-events:none;z-index:2147483000;';
  const overlayRoot = shadow(overlayHost);
  doc.body.append(overlayHost);

  function closePanel(restoreFocus = true) {
    if (active?.trigger) active.trigger.setAttribute('aria-expanded', 'false');
    active = null;
    layer?.remove();
    layer = null;
    if (restoreFocus && lastFocus?.isConnected) lastFocus.focus({ preventScroll: true });
    lastFocus = null;
  }

  // ── 不全屏：宽屏贴着气泡弹一张浮卡，窄屏或横屏矮屏用底部半屏抽屉 ──
  const SHEET_QUERY = '(max-width: 719px), (max-height: 539px)';
  const POP_WIDTH: Partial<Record<Skin | 'settings', number>> = {
    night: 660,
    ao3: 540,
    jinjiang: 520,
    paper: 520,
    settings: 520,
  };
  const layoutMode = () => (win.matchMedia(SHEET_QUERY).matches ? 'sheet' : 'pop');
  function place() {
    const panel = layer?.querySelector<HTMLElement>('.panel');
    if (!panel || !layer) return;
    const mode = layoutMode();
    layer.classList.toggle('as-sheet', mode === 'sheet');
    layer.classList.toggle('as-pop', mode === 'pop');
    panel.style.left = panel.style.top = panel.style.width = panel.style.maxHeight = panel.style.transform = '';
    if (mode === 'sheet') return;
    const vw = win.innerWidth,
      vh = win.innerHeight,
      edge = 16,
      gap = 10,
      cap = 600;
    const width = Math.min(POP_WIDTH[layer.dataset.key as Skin | 'settings'] || 440, vw - edge * 2);
    panel.style.width = `${width}px`;
    const trigger = active?.kind === 'comments' ? active.trigger : null;
    const r = trigger?.isConnected ? trigger.getBoundingClientRect() : null;
    if (!r || r.bottom < 0 || r.top > vh || (!r.width && !r.height)) {
      const mh = Math.min(cap + 40, vh - edge * 4);
      panel.style.maxHeight = `${mh}px`;
      panel.style.left = `${Math.round((vw - width) / 2)}px`;
      panel.style.top = `${Math.round(Math.max(edge, (vh - Math.min(mh, panel.offsetHeight)) / 2))}px`;
      panel.dataset.side = 'center';
      return;
    }
    const below = vh - r.bottom - gap - edge,
      above = r.top - gap - edge;
    const down = below >= 360 || below >= above;
    const mh = Math.max(220, Math.min(cap, down ? below : above));
    panel.style.maxHeight = `${mh}px`;
    const left = Math.min(Math.max(edge, r.left + r.width / 2 - width / 2), vw - edge - width);
    panel.style.left = `${Math.round(left)}px`;
    const h = Math.min(panel.offsetHeight, mh);
    panel.style.top = `${Math.round(down ? Math.min(r.bottom + gap, vh - edge - h) : Math.max(edge, r.top - gap - h))}px`;
    panel.dataset.side = down ? 'below' : 'above';
    // 弹出动画从气泡那一侧长出来
    panel.style.setProperty(
      '--hc-origin-x',
      `${Math.round(Math.min(Math.max(18, r.left + r.width / 2 - left), width - 18))}px`,
    );
  }
  let placeFrame = 0;
  const onResize = () => {
    if (!layer || placeFrame) return;
    placeFrame = win.requestAnimationFrame(() => {
      placeFrame = 0;
      place();
    });
  };
  win.addEventListener('resize', onResize, { passive: true });
  win.visualViewport?.addEventListener('resize', onResize, { passive: true });

  // 抽屉：按住标题栏往下拖超过 72px 就收起
  function bindSwipe(panel: HTMLElement, grip: HTMLElement) {
    let y0: number | null = null,
      dy = 0;
    grip.addEventListener(
      'touchstart',
      e => {
        if (!layer?.classList.contains('as-sheet') || e.touches.length !== 1 || (e.target as Element).closest('button'))
          return;
        y0 = e.touches[0].clientY;
        dy = 0;
        panel.style.transition = 'none';
      },
      { passive: true },
    );
    grip.addEventListener(
      'touchmove',
      e => {
        if (y0 === null) return;
        dy = Math.max(0, e.touches[0].clientY - y0);
        panel.style.transform = dy ? `translate3d(0,${dy}px,0)` : '';
      },
      { passive: true },
    );
    const end = () => {
      if (y0 === null) return;
      y0 = null;
      panel.style.transition = '';
      if (dy > 72) closePanel();
      else panel.style.transform = '';
    };
    grip.addEventListener('touchend', end);
    grip.addEventListener('touchcancel', end);
  }

  function shell(title: string, isSettings = false) {
    const replacing = Boolean(layer);
    layer?.remove();
    const skin = effSkin();
    layer = make(
      'div',
      `layer ${isSettings ? 'settings-layer' : 'reading-layer'} skin-${skin}${isBp(skin) ? ' bp' : ''}`,
    );
    layer.dataset.key = isSettings ? 'settings' : skin;
    if (hostLook(win).lite) layer.classList.add('lite');
    // 点空白（卡片外任何地方）就关；浮卡模式下在空白处滚轮也当作要关
    layer.addEventListener('click', e => {
      if (e.target === layer) closePanel();
    });
    const backdrop = (e: Event) => {
      if ((e.target as Element).closest('.scroll')) return;
      e.preventDefault();
      if (e.type === 'wheel' && e.target === layer && layer?.classList.contains('as-pop')) closePanel(false);
    };
    layer.addEventListener('wheel', backdrop, { passive: false });
    layer.addEventListener('touchmove', backdrop, { passive: false });
    const panel = make('section', `panel ${isSettings ? 'settings' : 'reading'} skin-${skin}`);
    if (replacing) panel.classList.add('no-enter');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', isSettings ? '段评设置' : '段评');
    panel.tabIndex = -1;
    const grip = make('div', 'grip');
    grip.setAttribute('aria-hidden', 'true');
    const head = make('header', 'panel-head');
    head.append(make('h2', '', title));
    const close = button('', 'icon-button close', () => closePanel(), 'close');
    close.append(icon('close'));
    close.setAttribute('aria-label', '关闭');
    head.append(close);
    panel.append(grip, head);
    layer.append(panel);
    overlayRoot.append(layer);
    bindSwipe(panel, grip);
    bindSwipe(panel, head);
    return { panel, head };
  }

  function reader(comment: ReaderComment, skin: Skin, index: number, record: BubbleRecord) {
    const key = stableKey(
      `${record.scope}|${record.entry.ordinal}|${record.entry.quote}|${index}|${comment.name}|${comment.text}`,
    );
    const profile = community.profile(comment.name);
    const article = make('article', `reader reader-${skin} community-reader`);
    const avatar = make('img', 'reader-avatar');
    avatar.src = profile.avatar;
    avatar.alt = '';
    avatar.width = 44;
    avatar.height = 44;
    avatar.decoding = 'async';
    avatar.loading = 'lazy';
    const body = make('div', 'community-body');
    const header = make('header', 'community-head');
    header.append(make('h3', 'community-name', comment.name));
    const badges = make('span', 'reader-badges');
    if (comment.title) badges.append(make('span', `reader-badge title-badge tone-${profile.color}`, comment.title));
    const level = make('span', `reader-badge level-badge tone-${(profile.level - 1) % 5}`, `Lv.${profile.level}`);
    level.title = `读者等级 ${profile.level}`;
    badges.append(level);
    header.append(badges);
    const prose = make('p', 'community-text', comment.text);
    const meta = make('div', 'reader-meta');
    const date = make('time');
    const stats = community.comment(key);
    date.dateTime = stats.dateTime;
    date.textContent = stats.date;
    meta.append(make('span', 'reader-floor', `${index + 1} 楼`), date);
    const likes = button('', 'like-button', () => {
      try {
        community.toggle(key);
        paintLike();
      } catch (error) {
        console.error('[小说段评] 点赞保存失败', error);
        likeStatus.textContent = '点赞保存失败，请重试';
      }
    });
    const likeIcon = icon('like');
    const likeCount = make('span', 'like-count');
    const likeStatus = make('span', 'sr-only');
    likeStatus.setAttribute('role', 'status');
    likes.append(likeIcon, likeCount);
    function paintLike() {
      const value = community.comment(key);
      likes.setAttribute('aria-pressed', String(value.liked));
      likes.setAttribute(
        'aria-label',
        `${value.liked ? '取消点赞' : '点赞'} ${comment.name} 的评论，${value.likes} 赞`,
      );
      likes.title = value.liked ? '取消点赞' : '点赞';
      likeCount.textContent = value.likes.toLocaleString();
      likeStatus.textContent = '';
    }
    paintLike();
    body.append(header, prose, meta, likeStatus);
    article.append(avatar, body, likes);
    return article;
  }

  function makeBubble(
    entry: Pick<ParsedEntry, 'face' | 'count'> & { tags?: string[] },
    skin = effSkin(),
    specimen = false,
  ) {
    const b = make('span', `bubble skin-${skin}`);
    const face = make('span', 'face', entry.face);
    const count = make('span', 'count', String(entry.count));
    if (skin === 'jinjiang') b.append(make('span', 'bubble-mark', '评'), face, count);
    else if (skin === 'lofter') b.append(icon('comment'), face, count);
    else if (skin === 'ao3') b.append(face, make('span', 'bracket', '['), count, make('span', 'bracket', ']'));
    else if (skin === 'paper') b.append(icon('pen'), count, face);
    else if (skin === 'kongming') b.append(make('span', 'bubble-mark', '评'), face, count);
    else if (skin === 'blueprint') b.append(make('span', 'bubble-mark', 'NOTE'), face, count);
    else b.append(icon('moon'), face, count);
    if (getSettings().showTags && !specimen) b.append(make('span', 'tiny-tag', entry.tags?.[0]));
    b.setAttribute('aria-hidden', 'true');
    return b;
  }

  function createBubble(entry: Annotation, record: BubbleRecord) {
    // A real button outside Shadow DOM is visible to host gesture/interactive
    // element detection. Its decorative shadow content never receives hits.
    const host = button('', '', () => openComments(record, host));
    host.dataset.huiHc = '';
    host.setAttribute('aria-expanded', 'false');
    host.setAttribute('aria-haspopup', 'dialog');
    host.setAttribute(
      'aria-label',
      `第 ${entry.ordinal || 1} 处段评，${entry.count} 条批注，展开阅读 ${entry.comments.length} 条`,
    );
    const visual = make('span');
    visual.dataset.huiHcVisual = '';
    visual.setAttribute('aria-hidden', 'true');
    const root = shadow(visual, host);
    root.append(makeBubble(entry));
    host.append(visual);
    return { host, button: host };
  }

  function openComments(record: BubbleRecord, trigger: HTMLButtonElement) {
    closePanel(false);
    lastFocus = trigger;
    active = { kind: 'comments', record, trigger };
    trigger?.setAttribute('aria-expanded', 'true');
    const { entry } = record;
    const skin = effSkin();
    const { panel, head } = shell((isBlueprintSkin(skin) ? BP_SKINS[skin] : THEMES[skin]).title);
    const total = make('span', 'comment-total', `${entry.count.toLocaleString()} 条`);
    total.title = `当前展示 ${entry.comments.length} 条批注`;
    head.insertBefore(total, head.lastChild);
    const scroll = make('div', 'scroll reading-body');
    const intro = make('div', 'intro');
    if (entry.quote) intro.append(make('blockquote', 'quote', entry.quote));
    const tags = make('div', 'tags');
    entry.tags.forEach(tag => tags.append(make('span', 'tag', tag)));
    intro.append(tags);
    scroll.append(intro);
    const comments = make('div', 'comment-list');
    if (entry.warnings.length) comments.append(make('div', 'notice', entry.warnings.join('；')));
    entry.comments.forEach((comment, i) => comments.append(reader(comment, skin, i, record)));
    scroll.append(comments);
    const foot = make('footer', 'panel-foot');
    const settingsButton = button('', 'icon-button settings-button', () => openSettings(), 'settings');
    settingsButton.setAttribute('aria-label', '段评设置');
    settingsButton.title = '段评设置';
    settingsButton.append(icon('gear'));
    foot.append(settingsButton);
    const nav = make('div', 'actions');
    for (const [delta, label] of [
      [-1, '上一段'],
      [1, '下一段'],
    ] as const) {
      const target = record.neighbors().find(r => r.entry.ordinal === entry.ordinal + delta);
      const b = button(label, 'soft', () => target && openComments(target, target.button), label);
      b.disabled = !target;
      nav.append(b);
    }
    foot.append(nav);
    panel.append(scroll, foot);
    place();
    panel.focus({ preventScroll: true });
  }

  function update(patch: Partial<Settings>) {
    saveError = changeSettings(patch) ? '' : '保存失败，修改仅临时生效。';
    lookKey = `${effSkin()}|${hostLook(win).mode}|${hostLook(win).lite}`;
    updateThemes();
    renderSettings(true);
  }
  function renderSettings(keepFocus = false) {
    const focusKey = (overlayRoot.activeElement as HTMLElement | null)?.dataset.focus;
    const scrollTop = keepFocus ? overlayRoot.querySelector('.scroll')?.scrollTop || 0 : 0;
    const s = getSettings();
    const { panel } = shell('段评设置', true);
    const scroll = make('div', 'scroll');
    const check = (label: string, key: 'enabled' | 'showTags') => {
      const row = make('label', 'check-row', label);
      const input = make('input');
      input.type = 'checkbox';
      input.checked = s[key];
      input.dataset.focus = key;
      input.addEventListener('change', () => update({ [key]: input.checked }));
      row.append(input);
      return row;
    };
    scroll.append(check('显示段评气泡', 'enabled'));
    const look = hostLook(win);
    // 样式：跟随全局 + 空明 + 格子图纸 + 原来五套，同一排格子里选
    scroll.append(make('h3', 'section-label', '样式'));
    const grid = make('div', 'theme-grid');
    const followShows = look.skin || s.skin;
    const tiles = [
      [
        'auto',
        `跟随全局 · ${(isBlueprintSkin(followShows) ? BP_SKINS[followShows] : THEMES[followShows]).name.split(' ')[0]}`,
        followShows,
      ],
      ...Object.entries(BP_SKINS).map(([id, t]) => [id, t.name, id]),
      ...Object.entries(THEMES).map(([id, t]) => [id, t.name, id]),
    ];
    for (const [id, label, shows] of tiles) {
      const pressed = id === 'auto' ? s.follow : !s.follow && s.skin === id;
      const choice = button(
        '',
        `theme-choice${id === 'auto' ? ' auto' : ''}`,
        () => update(id === 'auto' ? { follow: true } : { follow: false, skin: id as Skin }),
        id,
      );
      choice.setAttribute('aria-label', label);
      choice.setAttribute('aria-pressed', String(pressed));
      const sample = make('span', `theme-sample skin-${shows}`);
      applyTheme(sample, { ...s, skin: shows as Skin, colorMode: 'preset' }, shows as Skin);
      const mini = make('span', 'mini-page');
      mini.append(make('i', 'mini-title'), make('i', 'mini-line'), make('i', 'mini-line'), make('i', 'mini-line'));
      sample.append(mini, makeBubble({ face: '(｡･ω･｡)', count: 128 }, shows as Skin, true));
      const themeName = make('span', 'theme-name', label);
      if (id === 'auto') themeName.prepend(icon('refresh'));
      choice.append(sample, themeName);
      grid.append(choice);
    }
    scroll.append(grid, make('p', 'hint', '跟随全局：全局美化是空明 / 格子图纸时用它，选「原生」时用上次选的样式。'));
    if (isBp(effSkin())) {
      scroll.append(
        make('p', 'hint', `${BP_SKINS[effSkin() as BlueprintSkin].name}的颜色跟着全局日夜走，配色设置不生效。`),
      );
    } else scroll.append(make('h3', 'section-label', '配色'));
    const modes = make('div', 'segmented');
    for (const [key, label] of [
      ['preset', '默认配色'],
      ['follow', '跟随酒馆'],
      ['custom', '自定义'],
    ] as const) {
      const b = button(label, '', () => update({ colorMode: key }), key);
      b.setAttribute('aria-pressed', String(s.colorMode === key));
      modes.append(b);
    }
    if (!isBp(effSkin())) scroll.append(modes);
    if (!isBp(effSkin()) && s.colorMode === 'follow')
      scroll.append(
        button(
          '重新吸取配色',
          'soft sample-colors',
          () => {
            updateThemes();
          },
          'sample',
        ),
      );
    if (!isBp(effSkin()) && s.colorMode === 'custom') {
      const colors = make('div', 'color-row');
      for (const [key, label] of [
        ['accent', '强调'],
        ['paper', '底色'],
        ['ink', '文字'],
      ] as const) {
        const row = make('label', 'color-label', label);
        const input = make('input');
        input.type = 'color';
        input.value = s.custom[key];
        input.dataset.focus = key;
        input.addEventListener('change', () => update({ custom: { ...getSettings().custom, [key]: input.value } }));
        row.append(input);
        colors.append(row);
      }
      scroll.append(
        colors,
        button(
          '吸取酒馆配色',
          'soft sample-colors',
          () => {
            const context = doc.createElement('canvas').getContext('2d')!;
            const custom: Palette = { ...getSettings().custom };
            for (const [key, color] of Object.entries(sampleHostPalette(win))) {
              context.clearRect(0, 0, 1, 1);
              context.fillStyle = '#ffffff';
              context.fillStyle = color;
              if (typeof context.fillStyle === 'string' && /^#[\da-f]{6}$/i.test(context.fillStyle))
                custom[key as keyof Palette] = context.fillStyle;
              else {
                context.fillRect(0, 0, 1, 1);
                const bytes = context.getImageData(0, 0, 1, 1).data;
                custom[key as keyof Palette] = `#${Array.from(bytes)
                  .slice(0, 3)
                  .map(n => n.toString(16).padStart(2, '0'))
                  .join('')}`;
              }
            }
            update({ custom });
          },
          'copy-colors',
        ),
      );
    }
    scroll.append(check('气泡显示标签', 'showTags'));
    const size = make('label', 'range-row', '字号');
    const input = make('input');
    input.type = 'range';
    input.min = '13';
    input.max = '20';
    input.step = '1';
    input.value = String(s.fontSize);
    input.dataset.focus = 'size';
    const output = make('span', 'size-value', `${s.fontSize}`);
    input.addEventListener('input', () => {
      output.textContent = input.value;
    });
    input.addEventListener('change', () => update({ fontSize: Number(input.value) }));
    size.append(input, output);
    scroll.append(size);
    const foot = make('footer', 'panel-foot');
    foot.append(button('重新识别', 'soft', () => refresh(), 'refresh'));
    if (saveError) {
      const status = make('span', 'status', saveError);
      status.setAttribute('role', 'alert');
      foot.append(status);
    }
    foot.append(button('完成', 'primary', () => closePanel(), 'done'));
    panel.append(scroll, foot);
    place();
    scroll.scrollTop = scrollTop;
    if (keepFocus && focusKey) {
      const el = Array.from(overlayRoot.querySelectorAll<HTMLElement>('[data-focus]')).find(
        x => x.dataset.focus === focusKey,
      );
      (el || panel).focus({ preventScroll: true });
    } else panel.focus({ preventScroll: true });
  }
  function openSettings() {
    const trigger = active?.trigger || doc.activeElement;
    closePanel(false);
    lastFocus = trigger as HTMLElement | null;
    active = { kind: 'settings' };
    renderSettings();
  }
  function updateThemes() {
    for (const host of roots) {
      if (host.isConnected) applyTheme(host);
      else roots.delete(host);
    }
  }
  // 主脑切了全局美化 / 日夜 / 省电：气泡换装，开着的卡片原地重画
  let lookKey = '';
  function syncLook(force = false) {
    const look = hostLook(win);
    const key = `${effSkin()}|${look.mode}|${look.lite}`;
    if (!force && key === lookKey) return;
    lookKey = key;
    for (const record of allRecords()) {
      const root = record.host.firstElementChild?.shadowRoot;
      root?.querySelector('.bubble')?.replaceWith(makeBubble(record.entry));
    }
    updateThemes();
    if (active?.kind === 'comments' && active.record.host.isConnected) openComments(active.record, active.trigger);
    else if (active?.kind === 'settings') renderSettings(true);
  }
  const keydown = (e: KeyboardEvent) => {
    if (!active || !layer) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      closePanel();
    }
    if (e.key === 'Tab') {
      const focusables = Array.from(
        layer.querySelectorAll<HTMLElement>('button:not(:disabled), input, [tabindex="0"]'),
      ).filter(n => !n.hidden && n.tabIndex !== -1);
      const current = overlayRoot.activeElement;
      const first = focusables[0],
        last = focusables.at(-1);
      if (e.shiftKey && (current === first || !focusables.includes(current as HTMLElement))) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && (current === last || !focusables.includes(current as HTMLElement))) {
        e.preventDefault();
        first?.focus();
      }
    }
  };
  doc.addEventListener('keydown', keydown, true);
  lookKey = `${effSkin()}|${hostLook(win).mode}|${hostLook(win).lite}`;
  return {
    createBubble,
    openSettings,
    updateThemes,
    syncLook,
    forget(host: HTMLButtonElement) {
      roots.delete(host);
      activation.forget(host);
    },
    closeComments() {
      if (active?.kind === 'comments') closePanel(false);
    },
    checkActive() {
      if (active?.kind === 'comments' && !active.record.host.isConnected) closePanel(false);
    },
    refreshBubbles(records: BubbleRecord[]) {
      for (const record of records) {
        // Keep the native trigger, its listener and focus stable across themes.
        const root = record.host.firstElementChild?.shadowRoot;
        root?.querySelector('.bubble')?.replaceWith(makeBubble(record.entry));
      }
      updateThemes();
    },
    dispose() {
      activation.dispose();
      closePanel(false);
      doc.removeEventListener('keydown', keydown, true);
      win.removeEventListener('resize', onResize);
      win.visualViewport?.removeEventListener('resize', onResize);
      if (placeFrame) win.cancelAnimationFrame(placeFrame);
      overlayHost.remove();
      triggerStyle.remove();
      roots.clear();
    },
  };
}

// ── runtime ──

const RUNTIME_KEY = Symbol.for('hui.novel-comments.runtime');
const SETTINGS_KEY = 'hui_novel_comments_v1';
const COMMUNITY_KEY = 'hui_novel_comments_community_v1';
const EXCLUDED = 'pre,code,textarea,script,style,[contenteditable="true"],[data-hui-hc],[data-hui-overlay]';
const EXCLUDED_WITH_INLINE_CODE = EXCLUDED.replace('code,', '');

function createMarkdownProjection(host: HostWindow, doc: Document) {
  const Showdown = host.SillyTavern?.libs?.showdown || host.showdown;
  if (typeof Showdown?.Converter !== 'function') return null;
  // A separate converter avoids re-running message hooks, regexes or macros.
  // These are the host's baseline Markdown options; every result must still
  // match the actual DOM before it is used. Nothing from this template is mounted.
  const converter = new Showdown.Converter({
    emoji: true,
    literalMidWordUnderscores: true,
    parseImgDimensions: true,
    tables: true,
    underline: true,
    simpleLineBreaks: true,
    strikethrough: true,
    disableForced4SpacesIndentedSublists: true,
  });
  return (entry: Annotation) => {
    const template = doc.createElement('template');
    template.innerHTML = converter.makeHtml(entry.inner);
    const inner = template.content.textContent ?? '';
    // A stripped/retained hc tag and an escaped, visible hc tag are both common.
    return [entry.raw.replace(entry.inner, () => inner), inner];
  };
}

function normalizedMap(text: string) {
  let textOnly = '';
  const offsets = [];
  for (let i = 0; i < text.length; i++) {
    if (/\s/u.test(text[i])) continue;
    // 显示正则把 <hc> 里的反引号换成全角 ｀（不然会吞掉酒馆的对白高亮），比对时当成同一个字
    textOnly += text[i] === '\uFF40' ? '`' : text[i];
    offsets.push(i);
  }
  return { text: textOnly, offsets };
}

function decodeEntities(text: string) {
  return text.replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi, entity => {
    const named: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" };
    if (named[entity]) return named[entity];
    const hex = /^&#x/i.test(entity);
    const number = parseInt(entity.slice(hex ? 3 : 2, -1), hex ? 16 : 10);
    return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : entity;
  });
}

function findTextRange(container: Element, candidates: string[], doc: Document, allowInlineCode = false) {
  const nodes = [];
  let content = '';
  const walker = doc.createTreeWalker(container, 4 /* SHOW_TEXT */);
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    if (node.parentElement?.closest(allowInlineCode ? EXCLUDED_WITH_INLINE_CODE : EXCLUDED)) {
      content += '\u0000';
      continue;
    }
    nodes.push({ node, start: content.length, end: content.length + node.length });
    content += node.data;
  }
  const normalized = normalizedMap(content);
  for (const candidate of candidates) {
    const expected = normalizedMap(allowInlineCode ? candidate : decodeEntities(candidate)).text;
    if (!expected) continue;
    for (
      let startIndex = normalized.text.indexOf(expected);
      startIndex >= 0;
      startIndex = normalized.text.indexOf(expected, startIndex + 1)
    ) {
      const start = normalized.offsets[startIndex];
      const end = normalized.offsets[startIndex + expected.length - 1] + 1;
      const first = nodes.find(n => n.start <= start && n.end > start);
      const last = nodes.find(n => n.start < end && n.end >= end);
      if (!first || !last) continue;
      // Backticks inside a valid annotation can create a code span. Allow only
      // spans enclosed by the match, never a match inside a code example.
      if (allowInlineCode && (first.node.parentElement?.closest('code') || last.node.parentElement?.closest('code')))
        continue;
      const range = doc.createRange();
      range.setStart(first.node, start - first.start);
      range.setEnd(last.node, end - last.start);
      return range;
    }
  }
  return null;
}

async function startNovelComments(frame: ScriptWindow, { styleText }: { styleText: string }) {
  let host: HostWindow;
  try {
    host = frame.parent as HostWindow;
    void host.document.body;
  } catch {
    throw new Error('小说段评需要同源的酒馆助手脚本环境，无法访问宿主页面。');
  }
  const doc = host.document;
  host[RUNTIME_KEY]?.dispose();
  let disposed = false;
  let generating = false;
  let timer = 0;
  let observer: MutationObserver | undefined;
  let ui: ReturnType<typeof createUI>;
  let projectMarkdown: ReturnType<typeof createMarkdownProjection>;
  const subscriptions: { stop(): void }[] = [];
  const states = new Map<Element, MessageState>();
  const pending = new Set<Element>();
  let scanAll = false;
  let settings = normalizeSettings();
  const runtime = { dispose };
  host[RUNTIME_KEY] = runtime;
  frame.addEventListener('pagehide', dispose, { once: true });

  function restoreState(state: MessageState) {
    for (const record of state.records) {
      ui?.forget(record.host);
      if (record.host.parentNode) record.host.replaceWith(record.original);
    }
    state.records = [];
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    host.clearTimeout(timer);
    observer?.disconnect();
    pending.clear();
    for (const subscription of subscriptions) subscription.stop();
    for (const state of states.values()) restoreState(state);
    states.clear();
    ui?.dispose();
    frame.removeEventListener('pagehide', dispose);
    if (host[RUNTIME_KEY] === runtime) delete host[RUNTIME_KEY];
  }

  try {
    await (host.__TAURITAVERN__?.ready ?? host.__TAURITAVERN_MAIN_READY__);
    if (disposed) return runtime;
    if (typeof host.SillyTavern?.getContext !== 'function')
      throw new Error('没有找到酒馆宿主。请在酒馆助手的脚本库中导入并启用。');
    if (typeof frame.getVariables !== 'function' || typeof frame.updateVariablesWith !== 'function')
      throw new Error('缺少酒馆助手变量接口。请检查酒馆助手是否已启用。');
    projectMarkdown = createMarkdownProjection(host, doc);
    settings = normalizeSettings(frame.getVariables({ type: 'script' })[SETTINGS_KEY]);
    const community = createCommunityStore(
      () => frame.getVariables({ type: 'script' })[COMMUNITY_KEY],
      data => {
        frame.updateVariablesWith(vars => ({ ...vars, [COMMUNITY_KEY]: data }), { type: 'script' });
      },
    );
    const records = () => Array.from(states.values()).flatMap(state => state.records);
    ui = createUI({
      win: host,
      styleText,
      community,
      getSettings: () => settings,
      allRecords: () => records(),
      changeSettings(patch) {
        const oldEnabled = settings.enabled;
        const oldTags = settings.showTags;
        const oldSkin = effectiveSkin(settings, host);
        settings = normalizeSettings({ ...settings, ...patch });
        let saved = true;
        try {
          frame.updateVariablesWith(vars => ({ ...vars, [SETTINGS_KEY]: settings }), { type: 'script' });
        } catch (error) {
          saved = false;
          console.error('[小说段评] 保存设置失败', error);
        }
        if (oldEnabled !== settings.enabled) {
          for (const state of states.values()) restoreState(state);
          states.clear();
          scan();
        } else if (oldTags !== settings.showTags || oldSkin !== effectiveSkin(settings, host))
          ui.refreshBubbles(records());
        return saved;
      },
      refresh() {
        for (const state of states.values()) restoreState(state);
        states.clear();
        scan();
      },
    });

    function getMessage(element: Element) {
      const id = element.getAttribute('mesid');
      if (id === null || !/^\d+$/.test(id)) return null;
      const message = host.SillyTavern!.getContext().chat[Number(id)];
      if (
        !message ||
        message.is_user ||
        message.is_system ||
        message.role === 'tool' ||
        message.role === 'user' ||
        message.role === 'system'
      )
        return null;
      return typeof message.mes === 'string' ? message.mes : null;
    }

    function processMessage(element: Element) {
      const source = getMessage(element);
      const text = element.querySelector('.mes_text');
      let state = states.get(element);
      if (source === null || !text || !settings.enabled) {
        if (state) {
          restoreState(state);
          states.delete(element);
        }
        return;
      }
      if (!state || state.source !== source || state.text !== text) {
        if (state) {
          restoreState(state);
          ui.closeComments();
        }
        state = { element, text, source, parsed: parseAnnotations(source), records: [], projections: new Map() };
        states.set(element, state);
      }
      state.records = state.records.filter(record => {
        if (record.host.isConnected && text.contains(record.host)) return true;
        ui.forget(record.host);
        return false;
      });
      for (const entry of state.parsed.entries) {
        if (state.records.some(record => record.entry.start === entry.start)) continue;
        // Match the validated source against rendered DOM. No whole-message innerHTML rewrite.
        const hc = Array.from(text.querySelectorAll('hc')).find(
          node =>
            !node.closest(EXCLUDED) &&
            normalizedMap(node.textContent ?? '').text === normalizedMap(decodeEntities(entry.inner)).text,
        );
        let range;
        if (hc) {
          range = doc.createRange();
          range.selectNode(hc);
        } else range = findTextRange(text, [entry.raw, entry.inner], doc);
        if (!range && projectMarkdown) {
          let candidates = state.projections.get(entry.start);
          if (!candidates) {
            try {
              candidates = projectMarkdown(entry);
            } catch {
              candidates = [];
            } // A host converter failure leaves the entry visible.
            state.projections.set(entry.start, candidates);
          }
          const renderedHc = Array.from(text.querySelectorAll('hc')).find(
            node =>
              !node.closest(EXCLUDED) &&
              candidates.some(
                candidate => normalizedMap(node.textContent ?? '').text === normalizedMap(candidate).text,
              ),
          );
          if (renderedHc) {
            range = doc.createRange();
            range.selectNode(renderedHc);
          } else range = findTextRange(text, candidates, doc, true);
        }
        if (!range) continue;
        const original = range.extractContents();
        const context = host.SillyTavern!.getContext();
        const record = {
          scope: `${context.characterId ?? ''}|${context.getCurrentChatId?.() ?? context.chatId ?? ''}|${element.getAttribute('mesid')}`,
          entry,
          original,
          neighbors: () => state!.records.filter(r => r.host.isConnected),
        } as BubbleRecord;
        const bubble = ui.createBubble(entry, record);
        Object.assign(record, bubble);
        range.insertNode(bubble.host);
        state.records.push(record);
      }
    }

    function prune() {
      for (const [element, state] of states) {
        if (!element.isConnected) {
          restoreState(state);
          states.delete(element);
        }
      }
      ui.checkActive();
    }

    function scan() {
      if (disposed) return;
      if (generating) {
        scanAll = true;
        return;
      }
      observer?.disconnect();
      try {
        prune();
        const targets = scanAll || !pending.size ? doc.querySelectorAll('#chat .mes[mesid]') : Array.from(pending);
        pending.clear();
        scanAll = false;
        for (const element of targets) if (element.isConnected) processMessage(element);
        ui.checkActive();
      } finally {
        // 只盯聊天区：整页 body 的变动（面板、提示、别的插件）不再叫醒这里
        if (!disposed)
          observer?.observe(doc.getElementById('chat') || doc.body, {
            subtree: true,
            childList: true,
            characterData: true,
            attributes: true,
            attributeFilter: ['mesid'],
          });
      }
    }

    // 生成期间只收集楼层，结束后统一处理；普通 DOM 更新等待稳定后再渲染。
    function schedule(element?: Element) {
      if (element) pending.add(element);
      else scanAll = true;
      host.clearTimeout(timer);
      timer = 0;
      if (disposed || generating) return;
      timer = host.setTimeout(() => {
        timer = 0;
        scan();
      }, 180);
    }

    observer = new host.MutationObserver(mutations => {
      let relevant = false;
      for (const mutation of mutations) {
        const target = mutation.target.nodeType === 1 ? (mutation.target as Element) : mutation.target.parentElement;
        if (target?.closest('[data-hui-overlay],[data-hui-hc]')) continue;
        const message = target?.closest('#chat .mes[mesid]');
        if (message) {
          pending.add(message);
          relevant = true;
        } else if (
          target?.id === 'chat' ||
          target === doc.body ||
          [...mutation.addedNodes, ...mutation.removedNodes].some(
            node =>
              node.nodeType === 1 &&
              ((node as Element).matches('#chat,.mes') || (node as Element).querySelector('#chat,.mes')),
          )
        ) {
          scanAll = true;
          relevant = true;
        }
      }
      if (relevant) schedule(pending.values().next().value);
    });

    const listen = (event: string | undefined, handler: () => void) => {
      if (event && typeof frame.eventOn === 'function') subscriptions.push(frame.eventOn(event, handler));
    };
    const events = frame.tavern_events || host.SillyTavern!.getContext().eventTypes || {};
    for (const key of [
      'CHARACTER_MESSAGE_RENDERED',
      'MESSAGE_UPDATED',
      'MESSAGE_EDITED',
      'MESSAGE_SWIPED',
      'MESSAGE_DELETED',
      'MORE_MESSAGES_LOADED',
    ]) {
      listen(events[key], () => schedule());
    }
    listen(events.GENERATION_STARTED, () => {
      generating = true;
      host.clearTimeout(timer);
      timer = 0;
    });
    const finishGeneration = () => {
      generating = false;
      // 结束事件可能先于最后一次消息 DOM 更新；交由防抖合并。
      schedule();
    };
    listen(events.GENERATION_ENDED, finishGeneration);
    listen(events.GENERATION_STOPPED, finishGeneration);
    listen(events.CHAT_CHANGED, () => {
      generating = false;
      pending.clear();
      ui.closeComments();
      for (const state of states.values()) restoreState(state);
      states.clear();
      schedule();
    });
    listen(events.SETTINGS_UPDATED, () => ui.updateThemes());
    if (typeof frame.getButtonEvent === 'function') listen(frame.getButtonEvent('段评设置'), () => ui.openSettings());

    const themeObserver = new host.MutationObserver(() => {
      ui.syncLook();
      if (settings.colorMode === 'follow') ui.updateThemes();
    });
    themeObserver.observe(doc.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-bp-skin', 'data-bp-mode', 'data-bp-lite'],
    });
    themeObserver.observe(doc.body, { attributes: true, attributeFilter: ['class', 'style'] });
    themeObserver.observe(doc.head, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['href', 'media', 'disabled'],
    });
    subscriptions.push({ stop: () => themeObserver.disconnect() });
    scan();
    return runtime;
  } catch (error) {
    dispose();
    throw error;
  }
}

$(() => {
  void startNovelComments(window as ScriptWindow, { styleText }).catch((error: unknown) => {
    console.error('[小说段评]', error);
    toastr.error(error instanceof Error ? error.message : String(error), '小说段评');
  });
});
