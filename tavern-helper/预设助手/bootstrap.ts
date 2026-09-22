import { floatingIcons, normalizeFloatingIcon, type FloatingIcon } from './floatingIcons';
import type { ButtonApi } from './types';

export function resolveButtonApi(): ButtonApi {
  const parentWin = window.parent && window.parent !== window ? window.parent : window;
  const helper = (window as any).TavernHelper ?? (parentWin as any).TavernHelper;

  const contexts = [
    { source: window, bind: window },
    { source: parentWin, bind: parentWin },
    { source: helper, bind: helper },
    { source: helper?.scriptButtons, bind: helper?.scriptButtons },
  ].filter(entry => entry.source);

  const pick = (name: string) => {
    for (const { source, bind } of contexts) {
      const fn = source && (source as any)[name];
      if (typeof fn === 'function') {
        return fn.bind(bind);
      }
    }
    return null;
  };

  const replaceButtons = pick('replaceScriptButtons');
  const appendButtons = pick('appendInexistentScriptButtons') ?? replaceButtons;

  return {
    appendButtons,
    replaceButtons,
    getButtonEvent: pick('getButtonEvent'),
    eventOn: pick('eventOn') ?? pick('eventOnButton'),
  };
}

interface RegisterControlButtonDeps {
  showPanel: (showPresetsFirst?: boolean) => Promise<void>;
  hidePanel: () => void;
  isPanelVisible: () => boolean;
  onQuickReplyUnavailable?: () => void;
}

export interface ControlButtonController {
  sync: (enabled: boolean) => void;
  setNsfwActive: (active: boolean) => void;
  destroy: () => void;
}

const CONTROL_ENTRY_STYLE_ID = 'preset-helper-control-entry-style';
const CONTROL_ENTRY_SELECTOR = '#qr--bar button,.qr--buttons button,#quickReplies button,.qr--button';

function getUnsubscribe(result: unknown): (() => void) | null {
  if (typeof result === 'function') return result as () => void;
  if (result && typeof (result as EventOnReturn).stop === 'function') {
    return () => (result as EventOnReturn).stop();
  }
  return null;
}

export function registerControlButton(deps: RegisterControlButtonDeps): ControlButtonController {
  const hostDoc = (() => {
    try {
      return window.parent && window.parent !== window ? window.parent.document : document;
    } catch {
      return document;
    }
  })();
  let unsubscribe: (() => void) | null = null;
  let destroyed = false;
  let nsfwActive = false;
  let observer: MutationObserver | null = null;
  let dressFrame: number | null = null;
  let pending = Promise.resolve();
  let opening = false;
  let currentEnabled = false;
  let ignoreApiEventUntil = 0;
  const togglePanel = async () => {
    if (destroyed || opening) return;
    opening = true;
    try {
      if (deps.isPanelVisible()) deps.hidePanel();
      else await deps.showPanel();
    } catch (error) {
      console.error('预设助手: 打开面板失败:', error);
      toastr.error('预设助手面板打开失败，请重试。');
    } finally {
      opening = false;
    }
  };
  const isEntryButton = (node: Element) => {
    const compact = (value: string | null | undefined) => String(value || '').replace(/\s+/g, '');
    const label = compact(node.textContent);
    const title = compact(node.getAttribute('title'));
    const ariaLabel = compact(node.getAttribute('aria-label'));
    return [label, title, ariaLabel].some(value => value.includes('🌙预设助手'));
  };
  const toElement = (target: EventTarget | null | undefined) => {
    if (!target) return null;
    const candidate = target as Element;
    return typeof candidate.matches === 'function' && typeof candidate.closest === 'function' ? candidate : null;
  };
  const findEntryButton = (event: Event) => {
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    for (const target of path) {
      const element = toElement(target);
      if (!element) continue;
      const entry = element.matches(CONTROL_ENTRY_SELECTOR) ? element : element.closest(CONTROL_ENTRY_SELECTOR);
      if (entry && isEntryButton(entry)) return entry;
    }
    const target = toElement(event.target);
    if (!target) return null;
    const entry = target.matches(CONTROL_ENTRY_SELECTOR) ? target : target.closest(CONTROL_ENTRY_SELECTOR);
    return entry && isEntryButton(entry) ? entry : null;
  };
  const onHostClick = (event: Event) => {
    if (!currentEnabled || !findEntryButton(event)) return;
    // 酒馆通常还会为同一次 DOM 点击派发按钮自定义事件；短时间忽略它，避免面板打开后又被关闭。
    ignoreApiEventUntil = Date.now() + 1000;
    void togglePanel();
  };
  const onButtonEvent = () => {
    if (!currentEnabled || Date.now() < ignoreApiEventUntil) return;
    void togglePanel();
  };
  const dressEntries = () => {
    dressFrame = null;
    hostDoc.querySelectorAll(CONTROL_ENTRY_SELECTOR).forEach(node => {
      if (!isEntryButton(node)) return;
      node.classList.add('preset-helper-control-entry');
      node.classList.toggle('nsfw-active', nsfwActive);
    });
  };
  const scheduleDress = () => {
    if (dressFrame !== null) return;
    const hostWin = hostDoc.defaultView || window;
    dressFrame = hostWin.requestAnimationFrame(dressEntries);
  };
  const ensureIndicatorStyle = () => {
    if (hostDoc.getElementById(CONTROL_ENTRY_STYLE_ID) || !hostDoc.head) return;
    const style = hostDoc.createElement('style');
    style.id = CONTROL_ENTRY_STYLE_ID;
    style.textContent = `
      .preset-helper-control-entry{position:relative!important}
      .preset-helper-control-entry.nsfw-active::after{content:""!important;position:absolute!important;z-index:3!important;top:3px!important;right:3px!important;width:8px!important;height:8px!important;border:1px solid rgba(255,255,255,.82)!important;border-radius:50%!important;background:#ef6574!important;box-shadow:0 0 7px rgba(239,101,116,.72)!important;pointer-events:none!important}`;
    hostDoc.head.appendChild(style);
  };
  const ensureObserver = () => {
    if (observer || !hostDoc.documentElement) return;
    observer = new MutationObserver(scheduleDress);
    observer.observe(hostDoc.documentElement, { childList: true, subtree: true });
  };
  const sync = (nextEnabled: boolean) => {
    currentEnabled = nextEnabled;
    pending = pending
      .then(async () => {
        if (destroyed) return;
        const api = resolveButtonApi();
        const write = api.replaceButtons ?? api.appendButtons;
        if (!write || !api.getButtonEvent || !api.eventOn) {
          if (nextEnabled) deps.onQuickReplyUnavailable?.();
          return;
        }
        // 兼容返回 Promise 的版本；按钮创建完成后再获取事件名。
        await write([{ name: '🌙 预设助手', visible: nextEnabled }]);
        if (destroyed) return;
        const eventName = api.getButtonEvent('🌙 预设助手');
        if (!eventName) throw new Error('无法获取快捷回复按钮事件');
        unsubscribe?.();
        unsubscribe = getUnsubscribe(api.eventOn(eventName, onButtonEvent));
        ensureIndicatorStyle();
        ensureObserver();
        scheduleDress();
      })
      .catch(error => {
        console.warn('预设助手: 快捷回复入口不可用，启用备用入口:', error);
        if (!destroyed && nextEnabled) deps.onQuickReplyUnavailable?.();
      });
  };
  // 捕获阶段直接监听宿主快速回复按钮，作为自定义按钮事件未转发时的可靠兜底。
  hostDoc.addEventListener('click', onHostClick, true);
  return {
    sync,
    setNsfwActive(active) {
      nsfwActive = active;
      ensureIndicatorStyle();
      scheduleDress();
    },
    destroy() {
      destroyed = true;
      unsubscribe?.();
      unsubscribe = null;
      observer?.disconnect();
      observer = null;
      hostDoc.removeEventListener('click', onHostClick, true);
      if (dressFrame !== null) (hostDoc.defaultView || window).cancelAnimationFrame(dressFrame);
      dressFrame = null;
      hostDoc
        .querySelectorAll('.preset-helper-control-entry')
        .forEach(node => node.classList.remove('preset-helper-control-entry', 'nsfw-active'));
      hostDoc.getElementById(CONTROL_ENTRY_STYLE_ID)?.remove();
    },
  };
}

export interface HostEntryController {
  sync: (settings: { floatingBall: boolean; extensionsMenu: boolean; floatingIcon?: FloatingIcon }) => void;
  setPanelOpen: (open: boolean) => void;
  setNsfwActive: (active: boolean) => void;
  destroy: () => void;
}

const FLOATING_ID = 'preset-helper-floating-entry';
const FLOATING_STYLE_ID = 'preset-helper-floating-entry-style';
const EXTENSION_ENTRY_ID = 'preset-helper-extension-entry';
const FAB_SIZE = 46;
const FAB_IMAGE_SIZE = 42;
const FAB_SAFE_GAP = 10;
const FAB_VISIBLE = Math.round((FAB_SIZE * 2) / 3);
const FAB_SNAP_THRESHOLD = 56;
const FAB_REDOCK_THRESHOLD = 8;
const FAB_POSITION_KEY = 'preset_helper_fab_position_v1';

function getHostDocument() {
  try {
    return window.parent && window.parent !== window ? window.parent.document : document;
  } catch {
    return document;
  }
}

function getHostWindow() {
  try {
    return window.parent && window.parent !== window ? window.parent : window;
  } catch {
    return window;
  }
}

export function registerHostEntries(deps: RegisterControlButtonDeps): HostEntryController {
  const hostDoc = getHostDocument();
  const hostWin = getHostWindow();
  let current: Parameters<HostEntryController['sync']>[0] = { floatingBall: false, extensionsMenu: false };
  let panelOpen = false;
  let menuObserver: MutationObserver | null = null;
  let dragging = false;
  let suppressClick = false;
  let dockEdge: 'left' | 'right' | null = null;
  let position = { left: 0, top: 0 };
  let resizeFrame: number | null = null;
  let opening = false;
  let nsfwActive = false;
  let suppressClickTimer: ReturnType<typeof setTimeout> | undefined;
  let cancelDrag: (() => void) | null = null;

  const togglePanel = async () => {
    if (opening) return;
    opening = true;
    try {
      if (deps.isPanelVisible()) deps.hidePanel();
      else await deps.showPanel();
    } catch (error) {
      console.error('预设助手: 打开面板失败:', error);
      toastr.error('预设助手面板打开失败，请重试。');
    } finally {
      opening = false;
    }
  };

  const viewportInsets = () => {
    const vv = hostWin.visualViewport;
    const left = Math.max(0, vv?.offsetLeft || 0);
    const top = Math.max(0, vv?.offsetTop || 0);
    return {
      left,
      top,
      right: Math.max(0, hostWin.innerWidth - (vv?.width || hostWin.innerWidth) - left),
      bottom: Math.max(0, hostWin.innerHeight - (vv?.height || hostWin.innerHeight) - top),
    };
  };
  const clamp = (left: number, top: number, gap = FAB_SAFE_GAP) => {
    const insets = viewportInsets();
    return {
      left: Math.min(
        Math.max(left, insets.left + gap),
        Math.max(insets.left + gap, hostWin.innerWidth - insets.right - FAB_SIZE - gap),
      ),
      top: Math.min(
        Math.max(top, insets.top + gap),
        Math.max(insets.top + gap, hostWin.innerHeight - insets.bottom - FAB_SIZE - gap),
      ),
    };
  };
  const dockedLeft = (edge: 'left' | 'right') => {
    const insets = viewportInsets();
    return edge === 'left' ? insets.left + FAB_VISIBLE - FAB_SIZE : hostWin.innerWidth - insets.right - FAB_VISIBLE;
  };
  const edgeAlignedLeft = (edge: 'left' | 'right') => {
    const insets = viewportInsets();
    return edge === 'left' ? insets.left : hostWin.innerWidth - insets.right - FAB_SIZE;
  };
  const detectDockEdge = (left: number, threshold = FAB_SNAP_THRESHOLD) => {
    const insets = viewportInsets();
    const leftDistance = left - insets.left;
    const rightDistance = hostWin.innerWidth - insets.right - left - FAB_SIZE;
    if (Math.min(leftDistance, rightDistance) > threshold) return null;
    return leftDistance <= rightDistance ? ('left' as const) : ('right' as const);
  };
  const savePosition = () => {
    try {
      hostWin.localStorage.setItem(FAB_POSITION_KEY, JSON.stringify(position));
    } catch (error) {
      console.warn('预设助手: 保存悬浮球位置失败:', error);
    }
  };
  const loadPosition = () => {
    try {
      const parsed = JSON.parse(hostWin.localStorage.getItem(FAB_POSITION_KEY) || 'null');
      if (Number.isFinite(parsed?.left) && Number.isFinite(parsed?.top)) {
        position = parsed;
        dockEdge = detectDockEdge(position.left);
        return;
      }
    } catch (error) {
      console.warn('预设助手: 读取悬浮球位置失败:', error);
    }
    const insets = viewportInsets();
    const visibleHeight = hostWin.innerHeight - insets.top - insets.bottom;
    position = clamp(
      hostWin.innerWidth - insets.right - FAB_SIZE - 20,
      insets.top + Math.max(96, Math.round((visibleHeight - FAB_SIZE) * 0.56)),
    );
    dockEdge = null;
  };
  const applyPosition = () => {
    const fab = hostDoc.getElementById(FLOATING_ID) as HTMLButtonElement | null;
    if (!fab) return;
    const fixed = clamp(position.left, position.top, dragging ? 0 : FAB_SAFE_GAP);
    position.top = fixed.top;
    position.left = dockEdge ? dockedLeft(dockEdge) : fixed.left;
    fab.style.left = `${Math.round(position.left)}px`;
    fab.style.top = `${Math.round(position.top)}px`;
    fab.dataset.edge = dockEdge || '';
    fab.classList.toggle('is-docked', !!dockEdge && !panelOpen && !dragging);
    fab.classList.toggle('is-dragging', dragging);
    fab.classList.toggle('is-open', panelOpen);
    fab.classList.toggle('nsfw-active', nsfwActive);
  };

  const ensureFloating = () => {
    if (!current.floatingBall || !hostDoc.body || !hostDoc.head) return;
    if (!hostDoc.getElementById(FLOATING_STYLE_ID)) {
      const style = hostDoc.createElement('style');
      style.id = FLOATING_STYLE_ID;
      style.textContent = `
        #${FLOATING_ID}{position:fixed;width:${FAB_SIZE}px;height:${FAB_SIZE}px;z-index:2147482998;border:0;border-radius:0;background:transparent;color:inherit;box-shadow:none;padding:0;display:flex;align-items:center;justify-content:center;cursor:grab;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;touch-action:none;will-change:left,top,transform;transition:opacity .18s ease,transform .18s ease}
        #${FLOATING_ID} img{display:block;width:${FAB_IMAGE_SIZE}px;height:${FAB_IMAGE_SIZE}px;max-width:${FAB_IMAGE_SIZE}px;max-height:${FAB_IMAGE_SIZE}px;object-fit:contain;pointer-events:none;-webkit-user-drag:none;filter:drop-shadow(0 5px 7px rgba(0,0,0,.28))}
        #${FLOATING_ID}:active{transform:scale(.96)}
        #${FLOATING_ID}.is-dragging{cursor:grabbing;transition:opacity .1s ease}
        #${FLOATING_ID}.is-docked{opacity:.58}
        #${FLOATING_ID}.is-docked:hover,#${FLOATING_ID}.is-docked:focus-visible,#${FLOATING_ID}.is-open,#${FLOATING_ID}.is-dragging{opacity:1}
        #${FLOATING_ID}.nsfw-active::after{content:""!important;position:absolute!important;z-index:3!important;top:2px!important;right:1px!important;width:9px!important;height:9px!important;border:1px solid rgba(255,255,255,.86)!important;border-radius:50%!important;background:#ef6574!important;box-shadow:0 0 8px rgba(239,101,116,.76)!important;pointer-events:none!important}
        #${FLOATING_ID}:focus-visible{outline:2px solid #fff;outline-offset:2px}`;
      hostDoc.head.appendChild(style);
    }
    let fab = hostDoc.getElementById(FLOATING_ID) as HTMLButtonElement | null;
    const iconUrl = floatingIcons[normalizeFloatingIcon(current.floatingIcon)].url;
    if (fab) {
      const image = fab.querySelector('img');
      if (image && image.getAttribute('src') !== iconUrl) {
        image.style.visibility = '';
        image.src = iconUrl;
      }
      return applyPosition();
    }
    fab = hostDoc.createElement('button');
    fab.id = FLOATING_ID;
    fab.type = 'button';
    fab.title = '打开预设助手（可拖动）';
    fab.setAttribute('aria-label', '打开预设助手');
    const image = hostDoc.createElement('img');
    image.src = iconUrl;
    image.alt = '';
    image.setAttribute('aria-hidden', 'true');
    const fallback = hostDoc.createElement('span');
    fallback.textContent = '🌙';
    fallback.style.cssText = 'position:absolute;font-size:30px;line-height:1;pointer-events:none';
    fab.appendChild(fallback);
    image.style.position = 'relative';
    image.addEventListener('load', () => {
      fallback.hidden = true;
    });
    image.addEventListener('error', () => {
      fallback.hidden = false;
      image.style.visibility = 'hidden';
    });
    fab.appendChild(image);
    hostDoc.body.appendChild(fab);
    loadPosition();
    applyPosition();
    fab.addEventListener('click', () => {
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      void togglePanel();
    });
    fab.addEventListener('pointerdown', event => {
      if (panelOpen) return;
      const pointerId = event.pointerId;
      const startX = event.clientX;
      const startY = event.clientY;
      const dragThreshold = event.pointerType === 'touch' ? 6 : 3;
      const startingDockEdge = dockEdge;
      // 贴边悬浮球起拖时先回到屏幕内沿，再跟随指针移动，避免负坐标让它像被边缘“粘住”。
      const baseLeft = startingDockEdge ? edgeAlignedLeft(startingDockEdge) : position.left;
      const baseTop = position.top;
      dragging = false;
      if (event.isPrimary === false || event.button > 0) return;
      cancelDrag?.();
      try {
        fab!.setPointerCapture?.(pointerId);
      } catch {
        /* 某些 WebView 不支持捕获，使用文档监听。 */
      }
      const move = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) return;
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        if (!dragging && Math.hypot(dx, dy) <= dragThreshold) return;
        dragging = true;
        dockEdge = null;
        position = clamp(baseLeft + dx, baseTop + dy, 0);
        if (moveEvent.cancelable) moveEvent.preventDefault();
        applyPosition();
      };
      const end = (endEvent: PointerEvent) => {
        if (endEvent.pointerId !== pointerId) return;
        cancelDrag?.();
        try {
          if (fab!.hasPointerCapture?.(pointerId)) fab!.releasePointerCapture(pointerId);
        } catch {
          /* 捕获可能已由浏览器释放。 */
        }
        if (dragging) {
          // 从贴边状态主动拉出时仅在几乎仍贴着边缘时回吸；普通拖动仍保留宽松的自动吸附。
          dockEdge = detectDockEdge(position.left, startingDockEdge ? FAB_REDOCK_THRESHOLD : FAB_SNAP_THRESHOLD);
          if (dockEdge) position.left = dockedLeft(dockEdge);
          else position = clamp(position.left, position.top);
          savePosition();
        }
        suppressClick = dragging;
        clearTimeout(suppressClickTimer);
        suppressClickTimer = setTimeout(() => {
          suppressClick = false;
        }, 400);
        dragging = false;
        applyPosition();
      };
      hostDoc.addEventListener('pointermove', move);
      hostDoc.addEventListener('pointerup', end);
      hostDoc.addEventListener('pointercancel', end);
      fab!.addEventListener('lostpointercapture', end);
      cancelDrag = () => {
        hostDoc.removeEventListener('pointermove', move);
        hostDoc.removeEventListener('pointerup', end);
        hostDoc.removeEventListener('pointercancel', end);
        fab!.removeEventListener('lostpointercapture', end);
        cancelDrag = null;
      };
    });
  };

  const ensureExtensionMenu = () => {
    hostDoc.getElementById(EXTENSION_ENTRY_ID)?.remove();
    if (!current.extensionsMenu) return;
    const menu = hostDoc.getElementById('extensionsMenu');
    if (!menu) return;
    const container = hostDoc.createElement('div');
    container.id = EXTENSION_ENTRY_ID;
    container.className = 'extension_container interactable';
    container.tabIndex = 0;
    container.innerHTML =
      '<div class="list-group-item flex-container flexGap5 interactable"><i class="fa-solid fa-moon fa-fw extensionsMenuExtensionButton"></i><span>预设助手</span></div>';
    const open = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      const menuButton = hostDoc.getElementById('extensionsMenuButton');
      if (menuButton && (menu as HTMLElement).offsetParent !== null) (menuButton as HTMLElement).click();
      void togglePanel();
    };
    container.addEventListener('click', open);
    container.addEventListener('keydown', event => {
      if ((event as KeyboardEvent).key === 'Enter' || (event as KeyboardEvent).key === ' ') open(event);
    });
    menu.appendChild(container);
  };

  const ensureMenuObserver = () => {
    if (menuObserver || !hostDoc.body) return;
    menuObserver = new MutationObserver(() => {
      if (current.extensionsMenu && !hostDoc.getElementById(EXTENSION_ENTRY_ID)) ensureExtensionMenu();
      if (current.floatingBall && (!hostDoc.getElementById(FLOATING_ID) || !hostDoc.getElementById(FLOATING_STYLE_ID)))
        ensureFloating();
    });
    menuObserver.observe(hostDoc.documentElement, { childList: true, subtree: true });
  };
  const syncMenuObserver = () => {
    if (current.extensionsMenu || current.floatingBall) {
      ensureMenuObserver();
      return;
    }
    menuObserver?.disconnect();
    menuObserver = null;
  };
  const onResize = () => {
    if (resizeFrame !== null) return;
    resizeFrame = hostWin.requestAnimationFrame(() => {
      resizeFrame = null;
      applyPosition();
    });
  };
  hostWin.addEventListener('resize', onResize);
  hostWin.addEventListener('pageshow', onResize);
  hostWin.visualViewport?.addEventListener('scroll', onResize);
  hostWin.visualViewport?.addEventListener('resize', onResize);

  return {
    sync(settings) {
      current = { ...settings };
      if (current.floatingBall) ensureFloating();
      else hostDoc.getElementById(FLOATING_ID)?.remove();
      ensureExtensionMenu();
      syncMenuObserver();
    },
    setPanelOpen(open) {
      panelOpen = open;
      applyPosition();
    },
    setNsfwActive(active) {
      nsfwActive = active;
      applyPosition();
    },
    destroy() {
      menuObserver?.disconnect();
      menuObserver = null;
      cancelDrag?.();
      clearTimeout(suppressClickTimer);
      hostWin.removeEventListener('resize', onResize);
      hostWin.removeEventListener('pageshow', onResize);
      hostWin.visualViewport?.removeEventListener('scroll', onResize);
      hostWin.visualViewport?.removeEventListener('resize', onResize);
      if (resizeFrame !== null) {
        hostWin.cancelAnimationFrame(resizeFrame);
        resizeFrame = null;
      }
      hostDoc.getElementById(FLOATING_ID)?.remove();
      hostDoc.getElementById(FLOATING_STYLE_ID)?.remove();
      hostDoc.getElementById(EXTENSION_ENTRY_ID)?.remove();
    },
  };
}

interface RegisterAutoSwitchDeps {
  onChatChanged: () => Promise<void>;
  onSettingsUpdated?: () => Promise<void>;
  onPresetChanged?: () => Promise<void>;
}

export function registerAutoSwitch(deps: RegisterAutoSwitchDeps) {
  const api = resolveButtonApi();
  const unsubscribers: Array<() => void> = [];
  if (!api.eventOn) return () => undefined;
  const subscribe = (eventName: string, handler: (...args: any[]) => any) => {
    if (!eventName) return;
    const off = api.eventOn?.(eventName, handler);
    const stop = getUnsubscribe(off);
    if (stop) unsubscribers.push(stop);
  };
  if (tavern_events) {
    subscribe(tavern_events.CHAT_CHANGED, deps.onChatChanged);
    if (deps.onSettingsUpdated) {
      const modelLinkedEvents = [
        tavern_events.SETTINGS_UPDATED,
        tavern_events.EXTENSION_SETTINGS_LOADED,
        tavern_events.CHATCOMPLETION_SOURCE_CHANGED,
        tavern_events.CHATCOMPLETION_MODEL_CHANGED,
        tavern_events.CONNECTION_PROFILE_LOADED,
        tavern_events.CONNECTION_PROFILE_UPDATED,
        tavern_events.MAIN_API_CHANGED,
      ].filter(Boolean);
      new Set(modelLinkedEvents).forEach(eventName => subscribe(eventName, deps.onSettingsUpdated!));
    }
    if (deps.onPresetChanged) {
      subscribe(tavern_events.OAI_PRESET_CHANGED_AFTER, deps.onPresetChanged);
      subscribe(tavern_events.PRESET_CHANGED, deps.onPresetChanged);
    }
  }
  // 兼容未转发预设事件的宿主；等酒馆完成下拉框的 change 处理后再同步。
  let presetTimer: ReturnType<typeof setTimeout> | undefined;
  $('body').on('change.qrPresetSync', '#settings_preset_openai', () => {
    clearTimeout(presetTimer);
    presetTimer = setTimeout(() => {
      void deps.onPresetChanged?.().catch(console.error);
    }, 0);
  });
  return () => {
    clearTimeout(presetTimer);
    $('body').off('.qrPresetSync');
    unsubscribers.splice(0).forEach(off => off());
  };
}

export async function waitForTavernHelper(timeoutMs = 15000) {
  return await new Promise<any | null>(resolve => {
    const start = Date.now();
    const interval = setInterval(() => {
      const tavernHelper =
        (window as any).TavernHelper ??
        ((window.parent as any) ?? window).TavernHelper ??
        (typeof getVariables === 'function' && typeof getPreset === 'function' ? window : null);
      if (tavernHelper) {
        clearInterval(interval);
        resolve(tavernHelper);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        resolve(null);
      }
    }, 150);
  });
}
