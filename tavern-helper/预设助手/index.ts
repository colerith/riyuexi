import { createPromptStateWriter } from './presetWrite';
import { handleQuickRequest, quickRequestActions, summaryActions } from './actions';
import { injectSettingsToAI } from './ai';
import {
  type ControlButtonController,
  type HostEntryController,
  registerAutoSwitch,
  registerControlButton,
  registerHostEntries,
  waitForTavernHelper,
} from './bootstrap';
import { CHANGELOGS, CURRENT_CHANGELOG_VERSION } from './changelog';
import { BUILTIN_QUICK_SWITCH_SCHEMES, defaultPreset } from './constants';
import { applyEnvironmentPromptToggles as applyEnvironmentPromptTogglesBase } from './environment';
import { getPrefillStatus, syncModelLinkedQuickSwitch } from './modelMode';
import {
  applyConfiguredNsfwMode,
  normalizeNsfwSettings,
  onNsfwStatusChange,
  refreshNsfwStatus,
  registerNsfwAutomation,
  type NsfwRuntimeStatus,
} from './nsfw';
import {
  bindEditorSettingHandler,
  bindGeneralActionHandler,
  bindPanelNavigation,
  bindStatusItemClickHandler,
  bindWordCountPresetHandler,
  enablePanelDragging,
} from './events';
import {
  applyDialogTheme as applyDialogThemeInPanel,
  containPanelTouchScroll,
  renderPresetEditor as renderPresetEditorInPanel,
  renderPresetsList as renderPresetsListInPanel,
  renderQuickSwitchPanel as renderQuickSwitchPanelInPanel,
  renderStatusDisplay as renderStatusDisplayInPanel,
  scrollToAndHighlightTarget as scrollToAndHighlightTargetInPanel,
  setPanelTheme as setPanelThemeInPanel,
  showChangelogPopup as showChangelogPopupInPanel,
  showWelcomePopup as showWelcomePopupInPanel,
} from './panel';
import {
  applyQuickSwitchRules,
  capturePromptStatesByRules,
  captureRulesFromEnabledPrompts,
  resolveRuleTargetForPrompt,
  restoreQuickSwitchRules,
  deactivateUnboundQuickSwitchProfiles,
} from './quickSwitch';
import {
  ensureReasoningFormatting,
  inspectReasoningFormatting,
  REASONING_FORMATTING_VERSION,
} from './reasoningFormatting';
import {
  activeSettings,
  generateId,
  getCustomQuickRequests,
  getActivePresetId,
  getCharacterId,
  acknowledgeChangelog,
  isChangelogAcknowledged,
  isTutorialCompleted,
  loadStorage,
  markTutorialCompleted,
  normalizePanelEntries,
  refreshActiveSettings,
  removeCustomQuickRequest,
  saveStorage,
  resolveThemeMode,
  saveThemeModeToStorage,
  setStorage,
  storage,
  upsertCustomQuickRequest,
} from './state';
import { panelCss, panelHtml, welcomeHtml } from './templates';
import { floatingIcons, normalizeFloatingIcon } from './floatingIcons';
import { applyThinkingMode, calculateNewPrompts } from './thinking';

// ============================================================
// 1. 运行时UI状态
// ============================================================
let stagedPrompts: any[] | null = null;
// Temporary storage for thinking style choice during editing
let tempThinkingStyle: 'conventional' | 'minimalist' | null = null;

// ============================================================
// 3. 注册主按钮 & UI 管理
// ============================================================
let panel: JQuery<HTMLElement> | null = null;
let styleTag: JQuery<HTMLElement> | null = null;
let controlButtonController: ControlButtonController | null = null;
let hostEntryController: HostEntryController | null = null;
let unregisterAutoSwitch: (() => void) | null = null;
let unregisterNsfwAutomation: (() => void) | null = null;
let unregisterNsfwStatus: (() => void) | null = null;
let modelModeSyncPromise: Promise<void> | null = null;
let unregisterConsoleCommands: (() => void) | null = null;
let panelOpening: Promise<void> | null = null;
let panelCloseTimer: ReturnType<typeof setTimeout> | undefined;
let quickReplyFallback = false;
let unregisterPanelViewportSync: (() => void) | null = null;

function syncNsfwEntryIndicators(status: NsfwRuntimeStatus) {
  controlButtonController?.setNsfwActive(status.active);
  hostEntryController?.setNsfwActive(status.active);
  if (panel?.hasClass('visible')) void renderStatusDisplay();
}

function applyEnvironmentPromptToggles(deps: Parameters<typeof applyEnvironmentPromptTogglesBase>[0]) {
  return applyEnvironmentPromptTogglesBase({ ...deps, isEnabled: () => storage.mvuAutoEnabled !== false });
}

async function applyNsfwSettings(settings = activeSettings) {
  await applyConfiguredNsfwMode(settings, { updatePresetWith, getLoadedPresetName });
}

type UiSkin = 'yuedu' | 'xiangyata';

function resolveUiSkinByLoadedPresetName(): UiSkin {
  const loadedPresetName = (getLoadedPresetName?.() || '').trim();
  if (loadedPresetName.includes('象牙塔')) return 'xiangyata';
  if (loadedPresetName.includes('日月西')) return 'yuedu';
  return 'yuedu';
}

function applyUiSkinToVisiblePanels() {
  const uiSkin = resolveUiSkinByLoadedPresetName();
  $('#control-panel-container .control-panel, #qr-welcome-popup .control-panel').attr('data-ui-skin', uiSkin);
  return uiSkin;
}

async function syncModelMode() {
  // 设置保存会再次触发 SETTINGS_UPDATED；正在同步时直接忽略，避免事件链互相等待。
  if (modelModeSyncPromise || promptStateWriter.isWriting()) return;
  modelModeSyncPromise = (async () => {
    const storageChanged = await syncModelLinkedQuickSwitch({
      schemes: BUILTIN_QUICK_SWITCH_SCHEMES,
      storage,
      getActivePresetId,
      getLoadedPresetName,
      applyRules: rules => applyQuickSwitchRules(rules, { updatePresetWith, getLoadedPresetName }),
    });
    if (storageChanged) saveStorage();
    renderAutomationSettings();
  })().finally(() => {
    modelModeSyncPromise = null;
  });
  await modelModeSyncPromise;
}
const promptStateWriter = createPromptStateWriter({
  getPreset: name => getPreset(name),
  getLoadedPresetName: () => getLoadedPresetName(),
  getCharacterId: () => getCharacterId(),
  setPreset: (name, patch) => setPreset(name, patch),
});
const updatePresetWith = promptStateWriter.update;

let editingPresetId: string | null = null;

async function openTutorial() {
  const uiSkin = resolveUiSkinByLoadedPresetName();
  await showWelcomePopupInPanel({
    welcomeHtml,
    panelCss,
    uiSkin,
    setStyleTag: tag => {
      styleTag = tag;
    },
    showPanel,
    enablePanelDragging,
    onDismiss: markTutorialCompleted,
  });
}

async function openChangelog(required = false) {
  const uiSkin = resolveUiSkinByLoadedPresetName();
  await showChangelogPopupInPanel({
    panelCss,
    uiSkin,
    required,
    entries: required ? undefined : CHANGELOGS,
    setStyleTag: tag => {
      styleTag = tag;
    },
    enablePanelDragging,
    onAcknowledge: acknowledgeChangelog,
  });
}

function registerConsoleCommands() {
  const hostWindow = window.parent && window.parent !== window ? window.parent : window;
  const host = hostWindow as any;
  const namespace = host.PresetHelper && typeof host.PresetHelper === 'object' ? host.PresetHelper : {};
  const previousCommand = namespace.reactivateChangelog;

  const reactivateChangelog = async () => {
    if ($('#qr-welcome-popup').length) {
      toastr.warning('请先关闭当前的新手教学或更新日志弹窗，再重新执行命令。');
      return;
    }
    if (!storage.onboarding) {
      storage.onboarding = {
        tutorialCompleted: false,
        acknowledgedChangelogVersions: [],
        changelogSuppressed: false,
      };
    }
    storage.onboarding.changelogSuppressed = false;
    storage.onboarding.acknowledgedChangelogVersions = storage.onboarding.acknowledgedChangelogVersions.filter(
      version => version !== CURRENT_CHANGELOG_VERSION,
    );
    saveStorage();
    await openChangelog(true);
  };

  namespace.reactivateChangelog = reactivateChangelog;
  host.PresetHelper = namespace;
  console.info('预设助手: 可在浏览器控制台执行 PresetHelper.reactivateChangelog() 重新激活必读更新日志。');

  return () => {
    if (namespace.reactivateChangelog !== reactivateChangelog) return;
    if (previousCommand === undefined) delete namespace.reactivateChangelog;
    else namespace.reactivateChangelog = previousCommand;
  };
}

async function showPanel(showPresetsFirst = false) {
  clearTimeout(panelCloseTimer);
  // 必读弹窗与主面板不能叠放；否则主面板会在同层级盖住弹窗，形成“日志闪一下”的错觉。
  if ($('#qr-welcome-popup').length) return;
  if (panelOpening) return panelOpening;
  panelOpening = createOrShowPanel(showPresetsFirst)
    .catch(error => {
      panel?.remove();
      panel = null;
      unregisterPanelViewportSync?.();
      hostEntryController?.setPanelOpen(false);
      throw error;
    })
    .finally(() => {
      panelOpening = null;
    });
  return panelOpening;
}

function prepareControlPanelLayout($container: JQuery<HTMLElement>) {
  const containerNode = $container[0];
  const $controlPanel = $container.find('.control-panel').first();
  const controlPanelNode = $controlPanel[0];
  if (!containerNode || !controlPanelNode) return;

  const hostWindow = containerNode.ownerDocument.defaultView || window;
  const viewport = hostWindow.visualViewport;
  const layoutWidth = containerNode.ownerDocument.documentElement.clientWidth || hostWindow.innerWidth;
  const viewWidth = Math.min(viewport?.width || layoutWidth, layoutWidth);
  const viewHeight = viewport?.height || hostWindow.innerHeight || 0;
  const safeTop = Math.max(0, Math.round(viewport?.offsetTop || 0));
  const safeLeft = Math.max(0, Math.round(viewport?.offsetLeft || 0));
  const safeRight = Math.max(0, Math.round(layoutWidth - viewWidth - safeLeft));
  const safeBottom = Math.max(0, Math.round((hostWindow.innerHeight || 0) - viewHeight - safeTop));
  const compactLayout = viewWidth <= 768 || (viewWidth <= 900 && viewHeight > viewWidth);

  [containerNode, controlPanelNode].forEach(node => {
    node.style.setProperty('--th-runtime-safe-top', `${safeTop}px`);
    node.style.setProperty('--th-runtime-safe-right', `${safeRight}px`);
    node.style.setProperty('--th-runtime-safe-bottom', `${safeBottom}px`);
    node.style.setProperty('--th-runtime-safe-left', `${safeLeft}px`);
    node.style.setProperty('--th-runtime-view-width', `${Math.max(1, Math.round(viewWidth))}px`);
    node.style.setProperty('--th-runtime-view-height', `${Math.max(1, Math.round(viewHeight))}px`);
  });

  // 部分平板竖屏的媒体查询宽度与 visualViewport 不一致，必须由运行时显式启用全屏布局。
  containerNode.classList.toggle('is-compact-layout', compactLayout);
  if (compactLayout) {
    controlPanelNode.style.setProperty('top', '0px', 'important');
    controlPanelNode.style.setProperty('left', '0px', 'important');
    return;
  }

  const panelWidth = $controlPanel.outerWidth() ?? 0;
  const panelHeight = $controlPanel.outerHeight() ?? 0;
  const initialX = safeLeft + Math.max(16, (viewWidth - panelWidth) / 2);
  const initialY = safeTop + Math.max(16, (viewHeight - panelHeight) / 2);
  controlPanelNode.style.setProperty('top', `${initialY}px`, 'important');
  controlPanelNode.style.setProperty('left', `${initialX}px`, 'important');
}

function bindPanelViewportSync($container: JQuery<HTMLElement>) {
  unregisterPanelViewportSync?.();
  const ownerWindow = $container[0]?.ownerDocument.defaultView || window;
  let frame: number | null = null;
  const schedule = () => {
    if (frame !== null) return;
    frame = ownerWindow.requestAnimationFrame(() => {
      frame = null;
      if ($container[0]?.isConnected) prepareControlPanelLayout($container);
    });
  };
  ownerWindow.addEventListener('resize', schedule);
  ownerWindow.addEventListener('orientationchange', schedule);
  ownerWindow.visualViewport?.addEventListener('resize', schedule);
  ownerWindow.visualViewport?.addEventListener('scroll', schedule);
  unregisterPanelViewportSync = () => {
    if (frame !== null) ownerWindow.cancelAnimationFrame(frame);
    frame = null;
    ownerWindow.removeEventListener('resize', schedule);
    ownerWindow.removeEventListener('orientationchange', schedule);
    ownerWindow.visualViewport?.removeEventListener('resize', schedule);
    ownerWindow.visualViewport?.removeEventListener('scroll', schedule);
    unregisterPanelViewportSync = null;
  };
}

async function createOrShowPanel(showPresetsFirst = false) {
  await refreshNsfwStatus();
  if ($('#control-panel-container').length > 0) {
    applyUiSkinToVisiblePanels();
    panel = $('#control-panel-container');
    prepareControlPanelLayout(panel);
    if (!unregisterPanelViewportSync) bindPanelViewportSync(panel);
    panel.addClass('visible');
    hostEntryController?.setPanelOpen(true);
    if (showPresetsFirst) {
      setTimeout(() => {
        $('#control-panel-container').find('button[data-panel="presets"]').trigger('click');
      }, 50);
    }
    return;
  }
  await loadStorage(); // Reload storage when opening
  // 复用酒馆自带图标。追加全局图标样式会覆盖 .mes_ghost 等宿主显示规则。
  const $existingStyle = $('#control-panel-style');
  if ($existingStyle.length) {
    $existingStyle.html(panelCss);
    styleTag = $existingStyle;
  } else {
    styleTag = $('<style>').attr('id', 'control-panel-style').html(panelCss).appendTo('head');
  }
  panel = $(panelHtml);
  $('body').append(panel);
  bindPanelViewportSync(panel);
  containPanelTouchScroll(panel);
  panel.find('.control-panel').attr('data-ui-skin', resolveUiSkinByLoadedPresetName());

  stagedPrompts = null;
  editingPresetId = null;
  tempThinkingStyle = null;

  setPanelTheme(activeSettings.theme as 'light' | 'dark');
  bindPanelEvents();
  const openingPanel = panel;
  hostEntryController?.setPanelOpen(true);
  // 旧版缺少某个预设 API 时，仅降级对应区域，仍保留设置和关闭按钮。
  const renders = await Promise.allSettled([renderStatusDisplay(), renderPresetsList(), renderQuickSwitchPanel()]);
  renders.forEach((result, index) => {
    if (result.status === 'rejected') console.warn(`预设助手: 面板区域 ${index + 1} 加载失败:`, result.reason);
  });
  if (panel !== openingPanel || !openingPanel[0]?.isConnected) return;

  // 等异步内容全部写入后再按最终尺寸定位并显示，避免先按空面板高度居中造成整体偏下。
  prepareControlPanelLayout(openingPanel);
  openingPanel.addClass('visible');
  if (showPresetsFirst) openingPanel.find('button[data-panel="presets"]').trigger('click');
}

function hidePanel() {
  hostEntryController?.setPanelOpen(false);
  clearTimeout(panelCloseTimer);
  const closingPanel = panel;
  if (!closingPanel) return;
  closingPanel.removeClass('visible');
  panelCloseTimer = setTimeout(() => {
    if (panel !== closingPanel || closingPanel.hasClass('visible')) return;
    closingPanel.remove();
    panel = null;
    unregisterPanelViewportSync?.();
    styleTag?.remove();
    styleTag = null;
  }, 300);
}

function setPanelTheme(theme: 'light' | 'dark') {
  if (!panel) return;
  setPanelThemeInPanel(panel, theme);
}

function applyDialogTheme($dialog: JQuery<HTMLElement>) {
  applyDialogThemeInPanel(panel, $dialog);
}

function renderReasoningCheck() {
  if (!panel) return;
  const result = inspectReasoningFormatting(getLoadedPresetName);
  const status = panel.find('[data-reasoning-status]');
  const signature = JSON.stringify(result);
  if (status.data('checkSignature') === signature) return;
  status.data('checkSignature', signature).attr('data-state', result.state);
  status.find('[data-check-title]').text(result.title);
  const list = status.find('[data-check-details]').empty();
  result.details.forEach(detail => list.append($('<li>').text(detail)));
}

function renderAutomationSettings() {
  if (!panel) return;
  panel
    .find('[data-automation="reasoningFormattingEnabled"]')
    .attr('aria-checked', String(storage.reasoningFormattingEnabled !== false));
  panel.find('[data-automation="mvuAutoEnabled"]').attr('aria-checked', String(storage.mvuAutoEnabled !== false));
  panel.find('[data-reinject-reasoning]').prop('disabled', storage.reasoningFormattingEnabled === false);
  renderReasoningCheck();
  const status = getPrefillStatus(storage, BUILTIN_QUICK_SWITCH_SCHEMES, getLoadedPresetName());
  panel.find('[data-prefill-toggle]').attr('aria-checked', String(status.enabled)).prop('disabled', !status.model);
  panel
    .find('[data-prefill-status]')
    .text(
      `模型：${status.model || '未识别'}。${status.reason}${status.manual ? ` 已手动覆盖：${status.enabled ? '预填充' : '不预填充'}（已记住）。` : ' 当前跟随自动识别。'}`,
    );
}

function renderPanelEntrySettings() {
  if (!panel) return;
  renderAutomationSettings();
  const entries = normalizePanelEntries();
  (Object.keys(entries) as Array<keyof typeof entries>).forEach(mode => {
    panel!.find(`[data-entry-mode="${mode}"]`).attr('aria-checked', String(entries[mode]));
  });
  panel.find('#panel-theme-mode').val(activeSettings.themeMode || 'system');
  const iconSelect = panel.find('#panel-floating-icon').empty();
  Object.entries(floatingIcons).forEach(([value, icon]) => {
    iconSelect.append($('<option>').val(value).text(icon.label));
  });
  iconSelect.val(normalizeFloatingIcon(storage.floatingIcon));
}

function syncPanelEntries() {
  const entries = normalizePanelEntries();
  controlButtonController?.sync(entries.quickReply);
  hostEntryController?.sync({
    ...entries,
    floatingBall: entries.floatingBall || (entries.quickReply && quickReplyFallback),
    floatingIcon: normalizeFloatingIcon(storage.floatingIcon),
  });
  renderPanelEntrySettings();
}

// ============================================================
// 4. 动态UI渲染
// ============================================================

async function renderStatusDisplay() {
  if (!panel) return;
  await renderStatusDisplayInPanel({ panel, activeSettings, storage, getCharacterId });
}

async function renderPresetsList() {
  if (!panel) return;
  await renderPresetsListInPanel({ panel, storage, getCharacterId });
}

async function renderPresetEditor(presetId: string) {
  if (!panel) return;
  await renderPresetEditorInPanel({
    panel,
    presetId,
    storage,
    setStagedPrompts: prompts => {
      stagedPrompts = prompts;
    },
    setTempThinkingStyle: style => {
      tempThinkingStyle = style;
    },
  });
}

async function renderQuickSwitchPanel() {
  if (!panel) return;
  await renderQuickSwitchPanelInPanel({
    panel,
    storage,
    getActivePresetId,
    getCharacterId,
    getPreset,
    builtinQuickSwitchSchemes: BUILTIN_QUICK_SWITCH_SCHEMES,
  });
}

// ============================================================
// 6. 事件绑定
// ============================================================
function bindPanelEvents() {
  if (!panel) return;

  enablePanelDragging(panel.find('.control-panel'));
  bindPanelNavigation({
    panel,
    quickRequestActions,
    getCustomQuickRequests,
    renderStatusDisplay,
    renderPresetsList,
    setEditingPresetId: id => {
      editingPresetId = id;
    },
  });

  panel.find('.close-button').on('click', hidePanel);
  renderPanelEntrySettings();
  panel.on('click', '[data-nsfw-home-mode]', async event => {
    event.preventDefault();
    event.stopPropagation();
    const mode = String($(event.currentTarget).attr('data-nsfw-home-mode')) as 'off' | 'on' | 'auto';
    if (!['off', 'on', 'auto'].includes(mode)) return;
    const preset = storage.presets[getActivePresetId()];
    if (!preset) return;
    const button = $(event.currentTarget).prop('disabled', true);
    preset.nsfw = { ...normalizeNsfwSettings(preset.nsfw), mode, configured: true };
    preset.updateTime = Date.now();
    saveStorage();
    refreshActiveSettings();
    try {
      await applyNsfwSettings();
      await renderStatusDisplay();
    } catch (error) {
      console.warn('预设助手[NSFW]: 首页模式切换失败', error);
      toastr.error('NSFW 模式切换失败，请查看控制台。');
    } finally {
      button.prop('disabled', false);
    }
  });
  panel.on('click', '[data-nsfw-home-worldbook]', async event => {
    event.preventDefault();
    event.stopPropagation();
    const mode = String($(event.currentTarget).attr('data-nsfw-home-worldbook')) as 'none' | 'blue' | 'green';
    if (!['none', 'blue', 'green'].includes(mode)) return;
    const preset = storage.presets[getActivePresetId()];
    if (!preset) return;
    const button = $(event.currentTarget).prop('disabled', true);
    preset.nsfw = { ...normalizeNsfwSettings(preset.nsfw), worldbookMode: mode };
    preset.updateTime = Date.now();
    saveStorage();
    refreshActiveSettings();
    try {
      await applyNsfwSettings();
      await renderStatusDisplay();
    } catch (error) {
      console.warn('预设助手[NSFW世界书]: 首页联动切换失败', error);
      toastr.error('NSFW 世界书联动切换失败，请查看控制台。');
    } finally {
      button.prop('disabled', false);
    }
  });
  panel.on('change', '#panel-theme-mode', event => {
    const mode = String($(event.currentTarget).val()) as 'system' | 'day' | 'night';
    if (!['system', 'day', 'night'].includes(mode)) return;
    activeSettings.themeMode = mode;
    activeSettings.autoTheme = mode === 'system';
    const resolvedTheme = resolveThemeMode(mode);
    activeSettings.theme = resolvedTheme;
    setPanelTheme(resolvedTheme);
    saveThemeModeToStorage(mode);
  });
  panel.on('change', '#panel-floating-icon', event => {
    storage.floatingIcon = normalizeFloatingIcon($(event.currentTarget).val());
    saveStorage();
    syncPanelEntries();
  });
  panel.on('click', '[data-automation]', async event => {
    const key = $(event.currentTarget).attr('data-automation') as 'reasoningFormattingEnabled' | 'mvuAutoEnabled';
    storage[key] = storage[key] === false;
    saveStorage();
    renderAutomationSettings();
    try {
      if (key === 'reasoningFormattingEnabled') {
        await ensureReasoningFormatting({
          getLoadedPresetName,
          isEnabled: () => storage.reasoningFormattingEnabled !== false,
        });
      } else {
        await applyEnvironmentPromptToggles({ updatePresetWith, getLoadedPresetName });
      }
    } catch (error) {
      console.error(error);
      toastr.error('应用设置失败，请重试。');
    }
  });
  panel.on('click', '[data-reinject-reasoning]', async event => {
    const button = $(event.currentTarget).prop('disabled', true);
    try {
      const applied = await ensureReasoningFormatting({
        getLoadedPresetName,
        isEnabled: () => storage.reasoningFormattingEnabled !== false,
      });
      if (applied) toastr.success('推理内容格式化已重新注入。');
      else toastr.info('未注入：请开启此功能、切换到日月西预设，并确认酒馆格式化功能已就绪。');
    } catch (error) {
      console.error(error);
      toastr.error('重新注入失败，请重试。');
    } finally {
      button.prop('disabled', storage.reasoningFormattingEnabled === false);
      renderReasoningCheck();
    }
  });
  panel.on('click', '[data-prefill-toggle], [data-prefill-auto]', async event => {
    const status = getPrefillStatus(storage, BUILTIN_QUICK_SWITCH_SCHEMES, getLoadedPresetName());
    if (!status.model) return;
    storage.prefillOverrides ??= {};
    if ($(event.currentTarget).is('[data-prefill-auto]')) delete storage.prefillOverrides[status.key];
    else storage.prefillOverrides[status.key] = !status.enabled;
    saveStorage();
    renderAutomationSettings();
    try {
      if (modelModeSyncPromise) await modelModeSyncPromise;
      await syncModelMode();
    } catch (error) {
      console.error(error);
      toastr.error('应用预填充失败，请重试。');
    }
  });
  panel.on('click', '[data-entry-mode]', event => {
    const mode = String($(event.currentTarget).attr('data-entry-mode')) as
      | 'floatingBall'
      | 'quickReply'
      | 'extensionsMenu';
    if (!['floatingBall', 'quickReply', 'extensionsMenu'].includes(mode)) return;
    const entries = normalizePanelEntries();
    const nextValue = !entries[mode];
    const enabledCount = Object.values(entries).filter(Boolean).length;
    if (!nextValue && enabledCount <= 1) {
      toastr.warning('请至少保留一个面板打开入口。');
      return;
    }
    entries[mode] = nextValue;
    saveStorage();
    syncPanelEntries();
  });

  bindGeneralActionHandler({
    panel,
    summaryActions,
    quickRequestActions,
    hidePanel,
    handleQuickRequest,
    getCustomQuickRequests,
    upsertCustomQuickRequest,
    removeCustomQuickRequest,
    triggerRenderPresetsList: renderPresetsList,
    triggerRenderStatusDisplay: renderStatusDisplay,
    triggerRenderPresetEditor: renderPresetEditor,
    triggerRenderQuickSwitchPanel: renderQuickSwitchPanel,
    getEditingPresetId: () => editingPresetId,
    setEditingPresetId: id => {
      editingPresetId = id;
    },
    getTempThinkingStyle: () => tempThinkingStyle,
    getStagedPrompts: () => stagedPrompts,
    setStagedPrompts: prompts => {
      stagedPrompts = prompts;
    },
    storage,
    activeSettings,
    defaultPreset,
    generateId,
    saveStorage,
    refreshActiveSettings,
    injectSettingsToAI,
    getCharacterId,
    applyThinkingMode,
    applyEnvironmentPromptToggles,
    applyNsfwSettings,
    updatePresetWith,
    getLoadedPresetName,
    getPreset,
    getActivePresetId,
    captureRulesFromEnabledPrompts,
    capturePromptStatesByRules,
    resolveRuleTargetForPrompt,
    quickSwitchPromptGroups: [],
    builtinQuickSwitchSchemes: BUILTIN_QUICK_SWITCH_SCHEMES,
    applyQuickSwitchRules,
    restoreQuickSwitchRules,
    openTutorial,
    openChangelog,
    scrollToAndHighlightTarget: target => {
      if (panel) {
        scrollToAndHighlightTargetInPanel(panel, target);
      }
    },
  });

  bindWordCountPresetHandler({
    panel,
    getEditingPresetId: () => editingPresetId,
    storage,
  });

  bindEditorSettingHandler({
    panel,
    getEditingPresetId: () => editingPresetId,
    storage,
    getCharacterId,
    getPreset,
    calculateNewPrompts,
    getStyleTag: () => styleTag,
    applyDialogTheme,
    setTempThinkingStyle: v => {
      tempThinkingStyle = v;
    },
    getTempThinkingStyle: () => tempThinkingStyle,
    setStagedPrompts: prompts => {
      stagedPrompts = prompts;
    },
  });

  bindStatusItemClickHandler({
    panel,
    storage,
    setEditingPresetId: id => {
      editingPresetId = id;
    },
    renderPresetEditor,
    scrollToAndHighlightTarget: target => {
      if (panel) {
        scrollToAndHighlightTargetInPanel(panel, target);
      }
    },
  });
}

async function initializeScript() {
  console.log('预设助手: initializeScript start');
  await loadStorage();

  if (!storage.initialized) {
    console.log('预设助手 [初始化]: 未找到数据，初始化默认存储。');
    setStorage({
      presets: { default: { ...defaultPreset } },
      customQuickRequests: {},
      bindings: {},
      globalPresetId: 'default',
      initialized: true,
      onboarding: {
        tutorialCompleted: false,
        acknowledgedChangelogVersions: [],
        changelogSuppressed: false,
      },
      panelEntries: {
        floatingBall: true,
        quickReply: false,
        extensionsMenu: true,
      },
    });
    saveStorage();
    refreshActiveSettings();
  }

  refreshActiveSettings();
}

async function initializeOptionalFeatures() {
  const tasks = [
    async () => {
      if (
        await ensureReasoningFormatting({
          configuredVersion: storage.reasoningFormattingVersion,
          isEnabled: () => storage.reasoningFormattingEnabled !== false,
          getLoadedPresetName,
        })
      ) {
        if (storage.reasoningFormattingVersion !== REASONING_FORMATTING_VERSION) {
          storage.reasoningFormattingVersion = REASONING_FORMATTING_VERSION;
          saveStorage();
        }
      }
    },
    async () => {
      await syncCharacterQuickSwitches();

      // Initial active settings calculation
      refreshActiveSettings();
      await syncModelMode();
      await applyEnvironmentPromptToggles({
        updatePresetWith,
        getLoadedPresetName,
      });
      await applyNsfwSettings();
      // We can also auto-inject on load if desired, but let's wait for user interaction or chat event
    },
    async () => {
      // 启动顺序固定为：当前版本更新日志 -> 首次新手教学。
      if (!isChangelogAcknowledged(CURRENT_CHANGELOG_VERSION) && !panel?.hasClass('visible') && !panelOpening) {
        await openChangelog(true);
      }
      if (!isTutorialCompleted()) {
        await openTutorial();
      }
    },
  ];
  await Promise.all(
    tasks.map(async task => {
      try {
        await task();
      } catch (error) {
        console.warn('预设助手: 可选功能初始化失败，保留面板入口:', error);
      }
    }),
  );
}

async function syncCharacterQuickSwitches() {
  if (
    await deactivateUnboundQuickSwitchProfiles({
      storage,
      getCharacterId,
      getPreset,
      updatePresetWith,
      getLoadedPresetName,
    })
  )
    saveStorage();
}

async function handleChatChanged() {
  promptStateWriter.invalidate();
  console.log('预设助手 [AutoSwitch]: Chat changed, refreshing settings.');
  await loadStorage();
  await syncCharacterQuickSwitches();
  refreshActiveSettings();
  await syncModelMode();
  applyUiSkinToVisiblePanels();
  await injectSettingsToAI(activeSettings);
  const isSpecial = ['dialogue', 'outline', 'summary'].includes(activeSettings.aiMode);
  await applyThinkingMode(isSpecial ? 'special' : 'conventional', activeSettings.thinkingStyle, {
    updatePresetWith,
    getLoadedPresetName,
  });
  await applyEnvironmentPromptToggles({
    updatePresetWith,
    getLoadedPresetName,
  });
  await applyNsfwSettings();
  if (panel?.hasClass('visible')) await renderQuickSwitchPanel();
}

async function handlePresetChanged() {
  if (promptStateWriter.isWriting()) return;
  if (
    await ensureReasoningFormatting({
      configuredVersion: storage.reasoningFormattingVersion,
      isEnabled: () => storage.reasoningFormattingEnabled !== false,
      getLoadedPresetName,
    })
  ) {
    if (storage.reasoningFormattingVersion !== REASONING_FORMATTING_VERSION) {
      storage.reasoningFormattingVersion = REASONING_FORMATTING_VERSION;
      saveStorage();
    }
  }
  if (modelModeSyncPromise) {
    // 保留切换期间的新同步请求，但不阻塞可能由当前同步触发的事件。
    void modelModeSyncPromise.then(() => syncModelMode()).catch(console.error);
  } else {
    await syncModelMode();
  }
  await applyNsfwSettings();
  if (panel?.hasClass('visible')) {
    await renderQuickSwitchPanel();
  }
}

$(async () => {
  const helper = await waitForTavernHelper();

  if (!helper) {
    console.error('预设助手: TavernHelper not available after 15s.');
    toastr.error('预设助手: TavernHelper not available.');
    return;
  }

  await initializeScript();
  unregisterConsoleCommands = registerConsoleCommands();
  const entryDeps = {
    showPanel,
    hidePanel,
    isPanelVisible: () => !!(panel && panel.hasClass('visible')),
    onQuickReplyUnavailable: () => {
      quickReplyFallback = true;
      const entries = normalizePanelEntries();
      hostEntryController?.sync({
        ...entries,
        floatingBall: true,
        floatingIcon: normalizeFloatingIcon(storage.floatingIcon),
      });
    },
  };
  hostEntryController = registerHostEntries(entryDeps);
  controlButtonController = registerControlButton(entryDeps);
  unregisterNsfwStatus = onNsfwStatusChange(syncNsfwEntryIndicators);
  unregisterNsfwAutomation = registerNsfwAutomation({
    getSettings: () => activeSettings,
    updatePresetWith,
    getLoadedPresetName,
  });
  syncPanelEntries();
  unregisterAutoSwitch = registerAutoSwitch({
    onChatChanged: handleChatChanged,
    onSettingsUpdated: syncModelMode,
    onPresetChanged: handlePresetChanged,
    onPresetChanging: promptStateWriter.invalidate,
  });

  void initializeOptionalFeatures();

  const reasoningCheckTimer = setInterval(() => {
    if (panel?.hasClass('visible')) renderReasoningCheck();
  }, 1500);

  $(window).on('pagehide', () => {
    clearInterval(reasoningCheckTimer);
    hidePanel();
    unregisterAutoSwitch?.();
    unregisterAutoSwitch = null;
    unregisterNsfwAutomation?.();
    unregisterNsfwAutomation = null;
    unregisterNsfwStatus?.();
    unregisterNsfwStatus = null;
    unregisterConsoleCommands?.();
    unregisterConsoleCommands = null;
    controlButtonController?.destroy();
    controlButtonController = null;
    hostEntryController?.destroy();
    hostEntryController = null;
  });
});
