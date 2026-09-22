import type { QuickSwitchPromptGroupConfig } from './types';

import { combineDisplayRules, resolveBaiBaiGroupRules } from './presetGroups';
import { applyStartReplyWith } from './modelMode';
import { DEFAULT_NSFW_SETTINGS, normalizeNsfwSettings, splitNsfwKeywords } from './nsfw';

const PROMPT_GROUP_FLAT_ORDER_STORAGE_KEY = 'th_qs_prompt_group_flat_order_v1';

export function enablePanelDragging($targetPanel: JQuery<HTMLElement>) {
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let windowStartX = 0;
  let windowStartY = 0;

  const $headers = $targetPanel.find('.panel-header');
  const targetDocument = $targetPanel[0]?.ownerDocument || document;
  const targetWindow = targetDocument.defaultView || window.parent || window;
  const $dragDocument = $(targetDocument);

  const getDragViewportSize = () => {
    const viewport = targetWindow.visualViewport;
    return {
      width: Math.max(
        1,
        Math.round(viewport?.width || targetDocument.documentElement.clientWidth || targetWindow.innerWidth),
      ),
      height: Math.max(
        1,
        Math.round(viewport?.height || targetDocument.documentElement.clientHeight || targetWindow.innerHeight),
      ),
    };
  };

  const getDragViewportInsets = () => {
    const viewport = targetWindow.visualViewport;
    const documentWidth = Math.round(targetDocument.documentElement.clientWidth || targetWindow.innerWidth || 0);
    const documentHeight = Math.round(targetDocument.documentElement.clientHeight || targetWindow.innerHeight || 0);
    const visibleWidth = Math.round(viewport?.width || documentWidth);
    const visibleHeight = Math.round(viewport?.height || documentHeight);
    const left = Math.max(0, Math.round(viewport?.offsetLeft || 0));
    const top = Math.max(0, Math.round(viewport?.offsetTop || 0));
    return {
      top,
      left,
      right: Math.max(0, documentWidth - visibleWidth - left),
      bottom: Math.max(0, documentHeight - visibleHeight - top),
    };
  };

  const getEventCoords = (e: any) => {
    const original = e.originalEvent;
    if (original && 'touches' in original && original.touches.length > 0) {
      return { x: original.touches[0].clientX, y: original.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  };

  const syncRuntimeSafeArea = () => {
    const insets = getDragViewportInsets();
    const host = $targetPanel.closest('#control-panel-container, #qr-welcome-popup, .qs-builder-overlay');
    const targets = host.length ? host.add($targetPanel) : $targetPanel;
    targets.each((_, el) => {
      const node = el as HTMLElement;
      node.style.setProperty('--th-runtime-safe-top', `${insets.top}px`);
      node.style.setProperty('--th-runtime-safe-right', `${insets.right}px`);
      node.style.setProperty('--th-runtime-safe-bottom', `${insets.bottom}px`);
      node.style.setProperty('--th-runtime-safe-left', `${insets.left}px`);
    });
  };

  const startDrag = (e: JQuery.TriggeredEvent) => {
    if ($(e.target).closest('button').length) return;
    if ($targetPanel.closest('#control-panel-container.is-compact-layout').length) return;

    syncRuntimeSafeArea();
    isDragging = true;
    const coords = getEventCoords(e);
    dragStartX = coords.x;
    dragStartY = coords.y;

    const panelRect = $targetPanel[0]?.getBoundingClientRect();
    windowStartX = panelRect?.left ?? 0;
    windowStartY = panelRect?.top ?? 0;

    $dragDocument.on('mousemove.acuWindowDrag touchmove.acuWindowDrag', moveDrag);
    $dragDocument.on('mouseup.acuWindowDrag touchend.acuWindowDrag touchcancel.acuWindowDrag', endDrag);
  };

  const moveDrag = (e: JQuery.Event) => {
    if (!isDragging) return;
    e.preventDefault();

    const coords = getEventCoords(e);
    const dx = coords.x - dragStartX;
    const dy = coords.y - dragStartY;
    const { width: viewW, height: viewH } = getDragViewportSize();
    const insets = getDragViewportInsets();
    const panelW = $targetPanel.outerWidth() ?? 0;
    const panelH = $targetPanel.outerHeight() ?? 0;
    const minLeft = insets.left + 8;
    const minTop = insets.top + 8;
    const maxLeft = Math.max(minLeft, insets.left + viewW - panelW - 8);
    const maxTop = Math.max(minTop, insets.top + viewH - panelH - 8);
    const nextLeft = _.clamp(windowStartX + dx, minLeft, maxLeft);
    const nextTop = _.clamp(windowStartY + dy, minTop, maxTop);

    const panelNode = $targetPanel[0] as HTMLElement | undefined;
    if (panelNode) {
      // 居中时 left/top 使用了 inline !important；拖动也必须以同优先级更新。
      panelNode.style.setProperty('left', `${nextLeft}px`, 'important');
      panelNode.style.setProperty('top', `${nextTop}px`, 'important');
    }
  };

  const endDrag = () => {
    isDragging = false;
    $dragDocument.off('.acuWindowDrag');
  };

  $headers.on('mousedown touchstart', startDrag);
  syncRuntimeSafeArea();
}

function getViewportContext($panel?: JQuery<HTMLElement>) {
  const ownerDocument = $panel?.[0]?.ownerDocument || document;
  const ownerWindow = ownerDocument.defaultView || window;
  return { ownerDocument, ownerWindow };
}

function getViewportSize($panel?: JQuery<HTMLElement>) {
  const { ownerDocument, ownerWindow } = getViewportContext($panel);
  const doc = ownerDocument.documentElement;
  const vv = ownerWindow.visualViewport;
  const localWidth = Math.round(vv?.width || doc.clientWidth || ownerWindow.innerWidth || 0);
  const localHeight = Math.round(vv?.height || doc.clientHeight || ownerWindow.innerHeight || 0);
  if (localWidth > 0 && localHeight > 0) {
    return { width: localWidth, height: localHeight };
  }

  // Some embedded contexts report 0x0 viewport; fall back to parent viewport.
  const parentWidth = Math.round(ownerWindow.parent?.innerWidth || 0);
  const parentHeight = Math.round(ownerWindow.parent?.innerHeight || 0);
  if (parentWidth > 0 && parentHeight > 0) {
    return { width: parentWidth, height: parentHeight };
  }

  return {
    width: Math.max(localWidth, parentWidth, 1),
    height: Math.max(localHeight, parentHeight, 1),
  };
}

function getViewportInsets($panel?: JQuery<HTMLElement>) {
  const { ownerDocument, ownerWindow } = getViewportContext($panel);
  const vv = ownerWindow.visualViewport;
  const doc = ownerDocument.documentElement;
  const docWidth = Math.round(doc.clientWidth || ownerWindow.innerWidth || ownerWindow.parent?.innerWidth || 0);
  const docHeight = Math.round(doc.clientHeight || ownerWindow.innerHeight || ownerWindow.parent?.innerHeight || 0);
  const visibleWidth = Math.round(vv?.width || docWidth);
  const visibleHeight = Math.round(vv?.height || docHeight);
  const left = Math.max(0, Math.round(vv?.offsetLeft || 0));
  const top = Math.max(0, Math.round(vv?.offsetTop || 0));
  const right = Math.max(0, docWidth - visibleWidth - left);
  const bottom = Math.max(0, docHeight - visibleHeight - top);
  return { top, right, bottom, left };
}

function shouldLogDialogLayout() {
  try {
    return localStorage.getItem('th_qs_layout_debug') === '1';
  } catch {
    return false;
  }
}

function logDialogLayout(
  stage: string,
  $panel: JQuery<HTMLElement>,
  extra: Record<string, unknown> = {},
  force = false,
) {
  if (!force && !shouldLogDialogLayout()) return;
  const node = $panel[0];
  const rect = node?.getBoundingClientRect();
  const view = getViewportSize($panel);
  const { ownerWindow } = getViewportContext($panel);
  const computed = node ? ownerWindow.getComputedStyle(node) : null;
  console.log('[预设助手][定制面板定位]', {
    stage,
    viewport: view,
    rect: rect
      ? {
          left: Math.round(rect.left),
          top: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        }
      : null,
    css: computed
      ? {
          left: computed.left,
          top: computed.top,
          width: computed.width,
          maxWidth: computed.maxWidth,
          position: computed.position,
          transform: computed.transform,
          margin: computed.margin,
        }
      : null,
    parentViewport: {
      width: Math.round(ownerWindow.parent?.innerWidth || 0),
      height: Math.round(ownerWindow.parent?.innerHeight || 0),
    },
    ...extra,
  });
}

function centerFloatingDialog($panel: JQuery<HTMLElement>) {
  const { width: viewW, height: viewH } = getViewportSize($panel);
  const insets = getViewportInsets($panel);
  const panelW = $panel.outerWidth() ?? 0;
  const panelH = $panel.outerHeight() ?? 0;
  const isQsFullscreenDialog =
    ($panel.hasClass('qs-builder-panel') || $panel.hasClass('qs-sub-panel')) && (viewW <= 768 || viewH <= 620);
  const host = $panel.closest('#control-panel-container, #qr-welcome-popup, .qs-builder-overlay');
  const targets = host.length ? host.add($panel) : $panel;
  targets.each((_, el) => {
    const node = el as HTMLElement;
    node.style.setProperty('--th-runtime-safe-top', `${insets.top}px`);
    node.style.setProperty('--th-runtime-safe-right', `${insets.right}px`);
    node.style.setProperty('--th-runtime-safe-bottom', `${insets.bottom}px`);
    node.style.setProperty('--th-runtime-safe-left', `${insets.left}px`);
  });
  const x = isQsFullscreenDialog ? insets.left : insets.left + Math.max(16, (viewW - panelW) / 2);
  const y = isQsFullscreenDialog ? insets.top : insets.top + Math.max(16, (viewH - panelH) / 2);

  const node = $panel[0] as HTMLElement | undefined;
  if (node) {
    node.style.setProperty('position', 'fixed', 'important');
    node.style.setProperty('left', `${x}px`, 'important');
    node.style.setProperty('top', `${y}px`, 'important');
    node.style.setProperty('transform', 'none', 'important');
    node.style.setProperty('margin', '0', 'important');
  } else {
    $panel.css({
      position: 'fixed',
      left: `${x}px`,
      top: `${y}px`,
      transform: 'none',
      margin: '0',
    });
  }

  logDialogLayout('centerFloatingDialog', $panel, {
    target: {
      x: Math.round(x),
      y: Math.round(y),
      panelW: Math.round(panelW),
      panelH: Math.round(panelH),
      isQsFullscreenDialog,
    },
  });
}

function mountDialogWithThemeAndDrag(
  panel: JQuery<HTMLElement>,
  $dialog: JQuery<HTMLElement>,
  panelSelector = '.control-panel',
  forceDebugLog = false,
) {
  const $mainPanel = panel.find('.control-panel').first();
  const isDark = $mainPanel.hasClass('dark-mode');
  const uiSkin = $mainPanel.attr('data-ui-skin');
  const $dialogPanel = $dialog.find(panelSelector).first();
  $dialogPanel.toggleClass('dark-mode', isDark);
  if (uiSkin) {
    $dialogPanel.attr('data-ui-skin', uiSkin);
  }

  const { width: viewW, height: viewH } = getViewportSize($dialogPanel);
  const availableWidth = Math.max(1, viewW - 32);
  const availableHeight = Math.max(1, viewH - 32);
  const isQuickSwitchDialog = $dialogPanel.hasClass('qs-builder-panel') || $dialogPanel.hasClass('qs-sub-panel');
  const isQuickSwitchFullscreen = isQuickSwitchDialog && (viewW <= 768 || viewH <= 620);
  const mainPanelWidth = $mainPanel.outerWidth() ?? 0;
  if (isQuickSwitchFullscreen) {
    $dialogPanel.css({
      width: `${Math.round(viewW)}px`,
      maxWidth: `${Math.round(viewW)}px`,
      height: `${Math.round(viewH)}px`,
      maxHeight: `${Math.round(viewH)}px`,
    });
  } else if (mainPanelWidth > 0) {
    const dialogWidth = Math.min(mainPanelWidth, availableWidth);
    $dialogPanel.css({
      width: `${Math.round(dialogWidth)}px`,
      maxWidth: `${Math.round(dialogWidth)}px`,
    });
  }
  const mainPanelHeight = $mainPanel.outerHeight() ?? 0;
  if (isQuickSwitchDialog && !isQuickSwitchFullscreen && mainPanelHeight > 0) {
    const dialogHeight = Math.min(mainPanelHeight, availableHeight, 860);
    $dialogPanel.css({
      height: `${Math.round(dialogHeight)}px`,
      maxHeight: `${Math.round(dialogHeight)}px`,
    });
  }

  $dialogPanel.css('visibility', 'hidden');
  $('body').append($dialog);
  logDialogLayout('mount:after-append', $dialogPanel, { panelSelector }, forceDebugLog);
  centerFloatingDialog($dialogPanel);
  requestAnimationFrame(() => {
    centerFloatingDialog($dialogPanel);
    $dialogPanel.css('visibility', 'visible');
    requestAnimationFrame(() => {
      logDialogLayout('mount:after-double-raf', $dialogPanel, { panelSelector }, forceDebugLog);
    });
  });
  enablePanelDragging($dialogPanel);
}

function normalizeBuiltinScheme(raw: any) {
  const parseBoolish = (value: unknown, fallback = false): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
      if (['false', '0', 'no', 'off', ''].includes(normalized)) return false;
    }
    if (typeof value === 'number') return value !== 0;
    return fallback;
  };

  if (raw?.type === 'customize' || raw?.kind === 'customize') {
    const customize = raw?.customize || {};
    return {
      type: 'customize' as const,
      name: String(raw?.name || '未命名定制'),
      customize: {
        groups: Array.isArray(customize.groups) ? customize.groups : [],
        sectionPattern: typeof customize.sectionPattern === 'string' ? customize.sectionPattern : '',
        sectionNames: Array.isArray(customize.sectionNames) ? customize.sectionNames.map(String) : [],
        sectionDescriptions: Object.fromEntries(
          Object.entries(customize.sectionDescriptions || {})
            .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
            .map(([name, description]) => [name.trim(), description.trim()]),
        ),
        itemPrefixes: Array.isArray(customize.itemPrefixes) ? customize.itemPrefixes.map(String).filter(Boolean) : [],
        itemSuffixes: Array.isArray(customize.itemSuffixes) ? customize.itemSuffixes.map(String).filter(Boolean) : [],
        includeBeforeFirstSection: parseBoolish(customize.includeBeforeFirstSection, false),
      },
    };
  }

  const isMode = (raw?.type === 'mode' || raw?.kind === 'mode') && Array.isArray(raw?.modes) && raw.modes.length > 0;
  if (isMode) {
    const modes = (raw.modes as any[])
      .map(mode => ({
        id: String(mode?.id || ''),
        label: String(mode?.label || mode?.id || '未命名模式'),
        rules: Array.isArray(mode?.rules) ? mode.rules : [],
        modelPattern: typeof mode?.modelPattern === 'string' ? mode.modelPattern : undefined,
        startReplyWith: typeof mode?.startReplyWith === 'string' ? mode.startReplyWith : undefined,
      }))
      .filter(mode => mode.id && mode.rules.length > 0);

    return {
      type: 'mode' as const,
      name: String(raw?.name || '未命名方案'),
      defaultModeId: String(raw?.defaultModeId || modes[0]?.id || ''),
      modes,
    };
  }

  const onRules = Array.isArray(raw?.on?.rules) ? raw.on.rules : Array.isArray(raw?.rules) ? raw.rules : [];
  const offRules = Array.isArray(raw?.off?.rules) ? raw.off.rules : null;
  const selection = raw?.on?.selection || {};
  const displayRules = Array.isArray(selection?.displayRules) ? selection.displayRules : null;
  const selectionGroups = Array.isArray(selection?.groups) ? selection.groups : [];

  return {
    type: 'toggle' as const,
    name: String(raw?.name || '未命名方案'),
    defaultEnabled: parseBoolish(raw?.defaultEnabled, false),
    onRules,
    offRules,
    selectionEnabled: parseBoolish(selection.enabled, true),
    defaultSelection: (selection.defaultSelection || 'all') as 'all' | 'none' | 'remember',
    displayRules,
    selectionGroups,
  };
}

function resolveBuiltinGroupLinkedRules(
  preset: Preset,
  rules: any[],
  displayRules: any[] | null,
  selectionGroups: any[],
) {
  const groupRules = resolveBaiBaiGroupRules(preset, selectionGroups, rules);
  return {
    rules: rules.length ? rules : groupRules,
    displayRules: combineDisplayRules(displayRules, groupRules),
    groupRuleCount: groupRules.length,
  };
}

function findCustomQuickSwitchProfile(storage: any, profileId: string) {
  const rootProfile = storage?.quickSwitchProfiles?.[profileId];
  if (rootProfile) return { ownerPresetId: null, ownerPreset: null, profile: rootProfile };
  for (const [ownerPresetId, preset] of Object.entries(storage?.presets || {})) {
    const profile = (preset as any)?.quickSwitchProfiles?.[profileId];
    if (profile) return { ownerPresetId, ownerPreset: preset as any, profile };
  }
  return null;
}

function escapeQuickSwitchHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getCharacterBindingOptions() {
  try {
    return (SillyTavern.getContext().characters || []).map((character: any, index: number) => ({
      id: String(index),
      name: String(character?.name || `未命名角色 ${index + 1}`),
    }));
  } catch {
    return [] as Array<{ id: string; name: string }>;
  }
}

function buildCharacterBindingRows(selectedIds: string[]) {
  const selectedSet = new Set(selectedIds.map(String));
  const characters = getCharacterBindingOptions();
  if (!characters.length) return '<div class="qs-character-bind-empty">暂无可绑定的角色卡。</div>';
  return characters
    .map(character => {
      const checked = selectedSet.has(character.id);
      return `
        <div class="qs-character-bind-row ${checked ? 'is-bound' : ''}" data-character-id="${escapeQuickSwitchHtml(character.id)}" data-character-search="${escapeQuickSwitchHtml(character.name.toLowerCase())}">
          <label class="qs-character-bind-check-wrap" aria-label="绑定 ${escapeQuickSwitchHtml(character.name)}">
            <input type="checkbox" class="qs-character-bind-check" ${checked ? 'checked' : ''}>
            <span class="qs-character-bind-checkmark"><i class="fas fa-check"></i></span>
          </label>
          <span class="qs-character-bind-name">${escapeQuickSwitchHtml(character.name)}</span>
          <span class="qs-character-bind-status ${checked ? 'is-bound' : ''}">${checked ? '已绑定此条目' : '未绑定'}</span>
        </div>
      `;
    })
    .join('');
}

function buildCharacterBindingPanel(selectedIds: string[]) {
  return `
    <button type="button" class="qs-character-bind-launch">
      <span><i class="fas fa-user-friends"></i> 管理绑定角色卡</span>
      <span class="qs-character-bind-launch-meta"><span class="qs-character-bind-launch-count"></span><i class="fas fa-chevron-right"></i></span>
    </button>
    <div class="qs-character-bind-page">
      <div class="qs-character-bind-page-header">
        <button type="button" class="qs-character-bind-page-back" aria-label="返回快捷开关编辑"><i class="fas fa-chevron-left"></i></button>
        <div class="qs-character-bind-page-title">绑定角色卡</div>
        <button type="button" class="qs-character-bind-page-done">完成</button>
      </div>
      <div class="qs-character-bind-panel" data-character-bind-filter="all">
        <div class="qs-character-bind-title">
          <span>选择绑定角色卡（可多选）</span>
          <span class="qs-character-bind-summary"></span>
        </div>
        <div class="qs-character-bind-search-wrap">
          <i class="fas fa-search"></i>
          <input type="search" class="qs-character-bind-search" placeholder="搜索角色卡名称">
          <button type="button" class="qs-character-bind-search-clear" aria-label="清空角色卡搜索" title="清空搜索"><i class="fas fa-times"></i></button>
        </div>
        <div class="qs-character-bind-filters" role="tablist" aria-label="角色卡绑定筛选">
          <button type="button" class="active" data-character-bind-filter="all">全部 <span data-character-count="all">0</span></button>
          <button type="button" data-character-bind-filter="selected">已选择 <span data-character-count="selected">0</span></button>
          <button type="button" data-character-bind-filter="unselected">未选择 <span data-character-count="unselected">0</span></button>
        </div>
        <div class="qs-character-bind-list">${buildCharacterBindingRows(selectedIds)}</div>
        <div class="qs-character-bind-filter-empty" style="display:none;">没有符合条件的角色卡。</div>
      </div>
    </div>
  `;
}

function bindCharacterBindingPanelEvents($dialog: JQuery<HTMLElement>) {
  let filterTimer: number | null = null;

  const applyFilter = ($panel: JQuery<HTMLElement>) => {
    const keyword = String($panel.find('.qs-character-bind-search').val() || '')
      .trim()
      .toLowerCase();
    const filter = String($panel.attr('data-character-bind-filter') || 'all');
    let selectedCount = 0;
    let visibleCount = 0;
    const panelElement = $panel.get(0);
    if (!panelElement) return;
    const rows = Array.from(panelElement.querySelectorAll<HTMLElement>('.qs-character-bind-row'));
    rows.forEach(rowElement => {
      const selected = !!rowElement.querySelector<HTMLInputElement>('.qs-character-bind-check')?.checked;
      if (selected) selectedCount += 1;
      const matchesKeyword = !keyword || String(rowElement.dataset.characterSearch || '').includes(keyword);
      const matchesFilter = filter === 'all' || (filter === 'selected' ? selected : !selected);
      const visible = matchesKeyword && matchesFilter;
      rowElement.classList.toggle('is-filter-hidden', !visible);
      if (visible) visibleCount += 1;
    });
    const totalCount = rows.length;
    $panel.find('[data-character-count="all"]').text(totalCount);
    $panel.find('[data-character-count="selected"]').text(selectedCount);
    $panel.find('[data-character-count="unselected"]').text(totalCount - selectedCount);
    $panel.find('.qs-character-bind-summary').text(`已选 ${selectedCount}/${totalCount}`);
    $panel.closest('.qs-character-bind-field').find('.qs-character-bind-launch-count').text(`已选 ${selectedCount}`);
    $panel.find('.qs-character-bind-filter-empty').toggle(visibleCount === 0);
    $panel.find('.qs-character-bind-search-wrap').toggleClass('has-value', !!keyword);
  };

  const scheduleFilter = ($panel: JQuery<HTMLElement>, immediate = false) => {
    if (filterTimer !== null) {
      window.clearTimeout(filterTimer);
      filterTimer = null;
    }
    if (immediate) {
      applyFilter($panel);
      return;
    }
    filterTimer = window.setTimeout(() => {
      filterTimer = null;
      applyFilter($panel);
    }, 55);
  };

  $dialog.find('.qs-character-bind-panel').each((_, panelElement) => applyFilter($(panelElement)));
  $dialog.on('click', '.qs-character-bind-launch', e => {
    $(e.currentTarget).siblings('.qs-character-bind-page').addClass('is-open');
  });
  $dialog.on('click', '.qs-character-bind-page-back, .qs-character-bind-page-done', e => {
    $(e.currentTarget).closest('.qs-character-bind-page').removeClass('is-open');
  });
  $dialog.on('input', '.qs-character-bind-search', e => {
    scheduleFilter($(e.currentTarget).closest('.qs-character-bind-panel'));
  });
  $dialog.on('click', '.qs-character-bind-search-clear', e => {
    const $panel = $(e.currentTarget).closest('.qs-character-bind-panel');
    $panel.find('.qs-character-bind-search').val('').trigger('focus');
    scheduleFilter($panel, true);
  });
  $dialog.on('click', '.qs-character-bind-filters button[data-character-bind-filter]', e => {
    const $button = $(e.currentTarget);
    const $panel = $button.closest('.qs-character-bind-panel');
    $panel.attr('data-character-bind-filter', String($button.attr('data-character-bind-filter') || 'all'));
    $panel.find('[data-character-bind-filter]').removeClass('active');
    $button.addClass('active');
    scheduleFilter($panel, true);
  });
  $dialog.on('change', '.qs-character-bind-check', e => {
    const $check = $(e.currentTarget);
    const checked = !!$check.prop('checked');
    const $row = $check.closest('.qs-character-bind-row');
    $row.toggleClass('is-bound', checked);
    $row
      .find('.qs-character-bind-status')
      .toggleClass('is-bound', checked)
      .text(checked ? '已绑定此条目' : '未绑定');
    scheduleFilter($row.closest('.qs-character-bind-panel'), true);
  });
  $dialog.on('click', '.qs-character-bind-row', e => {
    if ($(e.target).closest('.qs-character-bind-check-wrap').length) return;
    const $check = $(e.currentTarget).find('.qs-character-bind-check');
    $check.prop('checked', !$check.prop('checked')).trigger('change');
  });
}

function resolveBuiltinEnabled(runtimeState: any, defaultEnabled: boolean): boolean {
  if (!runtimeState) return defaultEnabled;
  if (typeof runtimeState.enabled === 'boolean') {
    return runtimeState.enabled;
  }
  return defaultEnabled;
}

interface PromptMetaSnapshot {
  rowKey: string;
  promptId: string;
  promptName: string;
  enabled: boolean;
}

interface GroupedPromptSegment {
  groupName: string | null;
  collapsedByDefault: boolean;
  items: PromptMetaSnapshot[];
}

interface PromptListViewAnchor {
  scrollTop: number;
}

interface CachedPromptGroupLayout {
  signature: string;
  groups: Array<{
    groupKey: string;
    groupName: string;
    collapsedByDefault: boolean;
    rowKeys: string[];
  }>;
}

function normalizeGroupKey(name: string, fallbackIndex = 0): string {
  const normalized = String(name || '').trim();
  return normalized ? `group:${normalized}` : `group-index:${fallbackIndex}`;
}

function normalizePresetScopeKey(presetName: unknown) {
  const normalized = String(presetName || '').trim();
  return normalized || '__default__';
}

function readScopedStorageMap<T>(key: string): Record<string, T> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, T>;
  } catch {
    // ignore
  }
  return null;
}

function loadFlatOrderOverride(presetName: string): string[] | null {
  const scopeKey = normalizePresetScopeKey(presetName);
  try {
    const raw = localStorage.getItem(PROMPT_GROUP_FLAT_ORDER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const scoped = (parsed as Record<string, string[]>)[scopeKey];
      return Array.isArray(scoped) ? scoped.map(String) : null;
    }
  } catch {
    // ignore
  }
  return null;
}

function saveFlatOrderOverride(presetName: string, rowKeys: string[]) {
  const scopeKey = normalizePresetScopeKey(presetName);
  const map = readScopedStorageMap<string[]>(PROMPT_GROUP_FLAT_ORDER_STORAGE_KEY) || {};
  map[scopeKey] = rowKeys;
  localStorage.setItem(PROMPT_GROUP_FLAT_ORDER_STORAGE_KEY, JSON.stringify(map));
}

function buildPromptGroupMatcherSignature(matcher: QuickSwitchPromptGroupConfig['start'] | undefined): string {
  if (!matcher) return '';
  return [
    normalizeMatcherText(matcher.nameIncludes),
    normalizeMatcherText(matcher.promptId),
    normalizeMatcherText(matcher.promptIdIncludes),
  ].join('\u001f');
}

function computePromptGroupingSignature(
  prompts: Array<Pick<PromptMetaSnapshot, 'rowKey' | 'promptId' | 'promptName'>>,
  groups: QuickSwitchPromptGroupConfig[],
): string {
  const promptKey = prompts.map(item => [item.rowKey, item.promptId, item.promptName].join('\u001e')).join('\u001d');
  const groupKey = groups
    .map((group, index) =>
      [
        normalizeGroupKey(group?.name || '', index),
        normalizeMatcherText(group?.name),
        buildPromptGroupMatcherSignature(group?.start),
        buildPromptGroupMatcherSignature(group?.end),
        group?.collapsedByDefault ? '1' : '0',
      ].join('\u001e'),
    )
    .join('\u001d');
  return `${promptKey}\u001c${groupKey}`;
}

function hasPromptGroupingUi($list: JQuery<HTMLElement>): boolean {
  if (!$list.length) return false;
  return $list.find(`${PROMPT_GROUP_HEADER_SELECTOR}, ${PROMPT_GROUP_WRAPPER_SELECTOR}`).length > 0;
}

function isEnvironmentToggleWritebackWindowActiveForGrouping() {
  try {
    const until = Number((window as any).__QR_ENV_TOGGLE_WRITEBACK_UNTIL__ || 0);
    return until > Date.now();
  } catch {
    return false;
  }
}

function setPromptGroupWrapperCollapsed($wrapper: JQuery<HTMLElement>, collapsed: boolean) {
  if (!$wrapper.length) return;
  $wrapper.toggleClass('is-collapsed', collapsed).removeAttr('aria-hidden');
  if ($wrapper.is('details')) {
    const nextOpen = !collapsed;
    const currentOpen = !!$wrapper.prop('open');
    if (currentOpen !== nextOpen) {
      $wrapper.prop('open', nextOpen);
    }
  }
  const wrapperEl = $wrapper.get(0);
  if (wrapperEl instanceof HTMLElement) {
    window.setTimeout(() => {
      wrapperEl.removeAttribute('aria-hidden');
    }, 0);
    window.requestAnimationFrame(() => {
      wrapperEl.removeAttribute('aria-hidden');
    });
  }
}

const PROMPT_MANAGER_LIST_SELECTOR = '#completion_prompt_manager_list';
const PROMPT_MANAGER_ITEM_SELECTOR = 'li.completion_prompt_manager_prompt';
const PROMPT_MANAGER_HEAD_SELECTOR = 'li.completion_prompt_manager_list_head';
const PROMPT_GROUP_HEADER_SELECTOR = '.th-qs-group-header';
const PROMPT_GROUP_WRAPPER_SELECTOR = '.th-qs-group-wrapper';
const PROMPT_GROUP_RUNTIME_STYLE_ID = 'th-qs-prompt-group-style';
const PROMPT_GROUP_RUNTIME_STYLE = `
#completion_prompt_manager_list.pt-entry-grouping-root {
  --th-qs-group-text: var(--SmartThemeBodyColor, var(--SmartThemeEmColor, var(--pt-text, inherit)));
  --th-qs-group-border: var(--SmartThemeBorderColor, var(--panel-border, var(--pt-border, currentColor)));
  --th-qs-group-bg: var(--SmartThemeBlurTintColor, var(--panel-soft-module, var(--pt-section-bg, transparent)));
  --th-qs-group-accent: var(--SmartThemeQuoteColor, var(--panel-text-accent, var(--pt-accent, currentColor)));
}

#completion_prompt_manager_list.pt-entry-grouping-pending > li:not(.completion_prompt_manager_list_head):not(.th-qs-head-tools-row) {
  pointer-events: none !important;
}

#completion_prompt_manager_list.pt-entry-grouping-pending.pt-entry-grouping-root .th-qs-group-header,
#completion_prompt_manager_list.pt-entry-grouping-pending.pt-entry-grouping-root .th-qs-group-wrapper {
  pointer-events: none !important;
}

#completion_prompt_manager_list.pt-entry-grouping-root .th-qs-group-header {
  position: relative !important;
  list-style: none !important;
  margin: 0 !important;
  padding: 7px 12px !important;
  border-radius: 10px !important;
  border: 1px solid color-mix(in srgb, var(--th-qs-group-border) 86%, transparent) !important;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--th-qs-group-bg) 92%, transparent) 0%,
    color-mix(in srgb, var(--th-qs-group-bg) 84%, transparent) 100%
  ) !important;
  color: var(--th-qs-group-text) !important;
  box-shadow: 0 1px 0 color-mix(in srgb, var(--th-qs-group-text) 8%, transparent) inset,
    0 2px 8px color-mix(in srgb, var(--th-qs-group-text) 16%, transparent) !important;
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  cursor: pointer !important;
  user-select: none !important;
  -webkit-user-select: none !important;
  pointer-events: auto !important;
  transition: border-color .18s ease, box-shadow .18s ease, transform .14s ease, background .18s ease !important;
  font-size: inherit !important;
  line-height: 1.2 !important;
}

#completion_prompt_manager_list.pt-entry-grouping-root .th-qs-group-header:hover {
  border-color: color-mix(in srgb, var(--th-qs-group-border) 72%, var(--th-qs-group-accent) 28%) !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 1px 0 color-mix(in srgb, var(--th-qs-group-text) 8%, transparent) inset,
    0 5px 14px color-mix(in srgb, var(--th-qs-group-accent) 20%, transparent) !important;
}

#completion_prompt_manager_list.pt-entry-grouping-root .th-qs-group-header:active {
  transform: translateY(0) scale(.998) !important;
}

#completion_prompt_manager_list.pt-entry-grouping-root .th-qs-group-header:focus-visible {
  outline: none !important;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--th-qs-group-accent) 34%, transparent),
    0 4px 12px color-mix(in srgb, var(--th-qs-group-accent) 18%, transparent) !important;
}

#completion_prompt_manager_list.pt-entry-grouping-root .th-qs-group-header .th-qs-group-caret {
  width: 12px !important;
  display: inline-flex !important;
  justify-content: center !important;
  align-items: center !important;
  opacity: .88 !important;
  transition: transform .2s cubic-bezier(.2,.8,.2,1), opacity .16s ease !important;
}

#completion_prompt_manager_list.pt-entry-grouping-root .th-qs-group-header .th-qs-group-caret:before {
  content: none !important;
  display: none !important;
}

#completion_prompt_manager_list.pt-entry-grouping-root .th-qs-group-header:not(.is-collapsed) .th-qs-group-caret {
  transform: rotate(90deg) !important;
}

#completion_prompt_manager_list.pt-entry-grouping-root .th-qs-group-header .th-qs-group-title {
  flex: 1 1 auto !important;
  text-align: left !important;
  font-weight: 650 !important;
}

#completion_prompt_manager_list.pt-entry-grouping-root .th-qs-group-header .th-qs-group-count {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  min-width: 26px !important;
  height: 20px !important;
  padding: 0 8px !important;
  border-radius: 999px !important;
  border: 1px solid color-mix(in srgb, var(--th-qs-group-border) 68%, transparent) !important;
  background: color-mix(in srgb, var(--th-qs-group-bg) 74%, var(--th-qs-group-accent) 26%) !important;
  color: color-mix(in srgb, var(--th-qs-group-text) 85%, var(--th-qs-group-accent) 15%) !important;
  font-size: .74em !important;
  font-weight: 700 !important;
  line-height: 1 !important;
  letter-spacing: .01em !important;
  opacity: .96 !important;
  transition: transform .16s ease, background-color .16s ease, border-color .16s ease !important;
}

#completion_prompt_manager_list.pt-entry-grouping-root .th-qs-group-header:hover .th-qs-group-count {
  transform: translateY(-1px) !important;
}

#completion_prompt_manager_list.pt-entry-grouping-root .th-qs-group-item-collapsed {
  display: none !important;
}

#completion_prompt_manager_list.pt-entry-grouping-root .th-qs-group-wrapper {
  display: block;
  list-style: none !important;
  margin: 4px 0 !important;
  padding: 0 !important;
}

#completion_prompt_manager_list.pt-entry-grouping-root .th-qs-group-wrapper.is-collapsed {
  display: block !important;
}

#completion_prompt_manager_list.pt-entry-grouping-root .th-qs-group-wrapper > summary {
  list-style: none !important;
}

#completion_prompt_manager_list.pt-entry-grouping-root .th-qs-group-wrapper > summary::-webkit-details-marker,
#completion_prompt_manager_list.pt-entry-grouping-root .th-qs-group-wrapper > summary::marker {
  display: none !important;
  content: '' !important;
}

#completion_prompt_manager_list li.completion_prompt_manager_list_head .th-qs-name-tools-host {
  display: none !important;
}

#completion_prompt_manager_list li.th-qs-head-tools-row {
  list-style: none;
  margin: 6px 0 8px;
  padding: 0;
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

#completion_prompt_manager_list li.th-qs-head-tools-row .th-qs-name-tools-host {
  display: inline-flex !important;
  flex-direction: column;
  align-items: flex-start;
  width: auto;
  min-width: 0;
  margin: 0;
  gap: 6px;
}

#completion_prompt_manager_list li.th-qs-head-tools-row .th-qs-list-tools {
  display: inline-flex !important;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  max-width: 100%;
  white-space: nowrap;
  vertical-align: middle;
}

#completion_prompt_manager_list li.th-qs-head-tools-row .th-qs-tool-btn {
  font: inherit;
  color: inherit;
  background: color-mix(in srgb, var(--SmartThemeBlurTintColor, transparent) 75%, transparent);
  border: 1px solid color-mix(in srgb, var(--SmartThemeBorderColor, currentColor) 55%, transparent);
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: auto;
  max-width: none;
  height: 24px;
  line-height: 1;
  padding: 0 8px;
  cursor: pointer;
  white-space: nowrap;
  overflow: visible;
  text-overflow: clip;
  flex: 0 0 auto;
}

#completion_prompt_manager_list li.th-qs-head-tools-row .th-qs-tool-btn .th-qs-tool-label {
  display: inline-block;
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
  overflow: visible;
  text-overflow: clip;
}

#completion_prompt_manager_list li.th-qs-head-tools-row .th-qs-tool-btn[data-action="th_qs_manage_grouping"] {
  min-width: 104px;
}

#completion_prompt_manager_list li.th-qs-head-tools-row .th-qs-tool-btn[data-action="th_qs_expand_all"],
#completion_prompt_manager_list li.th-qs-head-tools-row .th-qs-tool-btn[data-action="th_qs_collapse_all"] {
  min-width: 86px;
}

#completion_prompt_manager_list li.th-qs-head-tools-row .th-qs-tool-btn:hover,
#completion_prompt_manager_list li.th-qs-head-tools-row .th-qs-tool-btn:focus-visible {
  border-color: color-mix(in srgb, var(--SmartThemeQuoteColor, currentColor) 55%, transparent);
}
`;

function ensurePromptGroupRuntimeStyle(doc: Document) {
  if (doc.getElementById(PROMPT_GROUP_RUNTIME_STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = PROMPT_GROUP_RUNTIME_STYLE_ID;
  style.textContent = PROMPT_GROUP_RUNTIME_STYLE;
  (doc.head || doc.documentElement).appendChild(style);
}

function setPromptGroupingPendingState($list: JQuery<HTMLElement>, pending: boolean) {
  if (!$list.length) return;
  $list.toggleClass('pt-entry-grouping-pending', pending);
}

function normalizeMatcherText(value: unknown): string {
  return String(value || '').trim();
}

function normalizeCompareText(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

function shouldLogQuickSwitchGroupingDebug() {
  try {
    return localStorage.getItem('th_qs_group_debug') === '1';
  } catch {
    return false;
  }
}

function logQuickSwitchGroupingDebug(message: string, payload?: Record<string, unknown>) {
  if (!shouldLogQuickSwitchGroupingDebug()) return;
  if (payload) {
    console.log(`[预设助手][快捷开关分组] ${message}`, payload);
    return;
  }
  console.log(`[预设助手][快捷开关分组] ${message}`);
}

function getHeaderTypographySnapshot($list: JQuery<HTMLElement>) {
  const $header = $list.find(PROMPT_GROUP_HEADER_SELECTOR).first();
  const headerEl = $header.get(0) as HTMLElement | undefined;
  const style = headerEl ? getComputedStyle(headerEl) : null;
  return {
    headerCount: $list.find(PROMPT_GROUP_HEADER_SELECTOR).length,
    firstHeaderClass: $header.attr('class') || '',
    firstHeaderInlineStyle: $header.attr('style') || '',
    computedFontSize: style?.fontSize || '',
    computedFontWeight: style?.fontWeight || '',
    computedLineHeight: style?.lineHeight || '',
    computedFontFamily: style?.fontFamily || '',
  };
}

function isPromptMatchedByGroupMatcher(
  prompt: { promptId: string; promptName: string },
  matcher: QuickSwitchPromptGroupConfig['start'] | undefined,
): boolean {
  if (!matcher) return false;
  const nameIncludes = normalizeMatcherText(matcher.nameIncludes);
  const promptId = normalizeMatcherText(matcher.promptId);
  const promptIdIncludes = normalizeMatcherText(matcher.promptIdIncludes);
  if (!nameIncludes && !promptId && !promptIdIncludes) return false;

  if (promptId && prompt.promptId === promptId) return true;
  if (promptIdIncludes && prompt.promptId.includes(promptIdIncludes)) return true;
  if (nameIncludes) {
    const normalizedNameIncludes = normalizeCompareText(nameIncludes).replace(/\u271F/g, '\u2020');
    const normalizedPromptName = normalizeCompareText(prompt.promptName).replace(/\u271F/g, '\u2020');
    if (normalizedPromptName.includes(normalizedNameIncludes)) return true;
  }
  return false;
}

function buildGroupedPromptSegments(
  prompts: PromptMetaSnapshot[],
  groups: QuickSwitchPromptGroupConfig[],
): GroupedPromptSegment[] {
  if (!prompts.length) return [];
  if (!groups.length) {
    return [{ groupName: null, collapsedByDefault: false, items: prompts }];
  }

  const segments: GroupedPromptSegment[] = [];
  let buffer: PromptMetaSnapshot[] = [];

  const flushBuffer = () => {
    if (!buffer.length) return;
    segments.push({ groupName: null, collapsedByDefault: false, items: buffer });
    buffer = [];
  };

  for (let i = 0; i < prompts.length; i += 1) {
    const current = prompts[i];
    const matchedGroup = groups.find(group => isPromptMatchedByGroupMatcher(current, group.start));

    if (!matchedGroup) {
      buffer.push(current);
      continue;
    }

    flushBuffer();

    const groupedItems: PromptMetaSnapshot[] = [];
    let endIndex = i;
    for (; endIndex < prompts.length; endIndex += 1) {
      const item = prompts[endIndex];
      groupedItems.push(item);
      if (isPromptMatchedByGroupMatcher(item, matchedGroup.end)) {
        break;
      }
    }

    segments.push({
      groupName: matchedGroup.name,
      collapsedByDefault: !!matchedGroup.collapsedByDefault,
      items: groupedItems,
    });

    i = endIndex;
  }

  flushBuffer();
  return segments;
}

function buildGroupedPromptSegmentsWithRuntime(
  prompts: PromptMetaSnapshot[],
  groups: QuickSwitchPromptGroupConfig[],
): GroupedPromptSegment[] {
  try {
    const runtime = (window as any)?.__th_qs_prompt_group_runtime__;
    const resolver = runtime?.buildResolvedSegments;
    if (typeof resolver === 'function') {
      const resolved = resolver(prompts, groups);
      if (Array.isArray(resolved)) {
        return resolved as GroupedPromptSegment[];
      }
    }
  } catch {
    // ignore runtime resolver failures
  }
  return buildGroupedPromptSegments(prompts, groups);
}

function getPromptNameFromManagerRow($row: JQuery<HTMLElement>): string {
  const rowEl = $row[0] as HTMLElement | undefined;
  const directNameCandidates = [
    $row.attr('data-pm-name'),
    $row.find('.completion_prompt_manager_prompt_name').first().attr('data-pm-name'),
    rowEl?.dataset?.pmName,
  ];
  const directName = directNameCandidates.find(value => normalizeMatcherText(value).length > 0);
  if (directName) {
    return normalizeMatcherText(directName);
  }

  const $name = $row.find('.completion_prompt_manager_prompt_name').first();
  if ($name.length) {
    const plainText = $name.clone().children().remove().end().text().trim();
    if (plainText) {
      return plainText;
    }

    const anchorText = $name.find('a').first().text().trim();
    if (anchorText) {
      return anchorText;
    }

    const titleText = $name.find('a').first().attr('title');
    if (titleText) {
      return normalizeMatcherText(titleText);
    }
  }

  const fallbackText = $row.text().trim();
  return normalizeMatcherText(fallbackText);
}

function getPromptIdFromManagerRow($row: JQuery<HTMLElement>): string {
  const el = $row[0] as HTMLElement | undefined;
  const attrCandidates = [
    $row.attr('data-pm-identifier'),
    $row.attr('data-prompt-id'),
    $row.attr('data-id'),
    el?.dataset?.pmIdentifier,
    el?.dataset?.promptId,
    el?.dataset?.id,
    el?.id,
  ];
  const match = attrCandidates.find(Boolean);
  return normalizeMatcherText(match);
}

function getPromptStableKeyFromManagerRow($row: JQuery<HTMLElement>, fallbackIndex = 0): string {
  const promptId = getPromptIdFromManagerRow($row);
  if (promptId) return promptId;
  const promptName = getPromptNameFromManagerRow($row);
  if (promptName) return `name:${promptName}#${fallbackIndex}`;
  return `row:${fallbackIndex}`;
}

function getPromptEnabledFromManagerRow($row: JQuery<HTMLElement>): boolean {
  const $checkbox = $row.find('input[type="checkbox"]').first();
  if ($checkbox.length) {
    return !!$checkbox.prop('checked');
  }
  return !$row.hasClass('completion_prompt_manager_prompt_disabled');
}

function collectPromptManagerSnapshots(): PromptMetaSnapshot[] {
  const $list = $(PROMPT_MANAGER_LIST_SELECTOR).first();
  if (!$list.length) return [];

  return $list
    .find(PROMPT_MANAGER_ITEM_SELECTOR)
    .toArray()
    .map((row, index) => {
      const $row = $(row as HTMLElement);
      return {
        rowKey: getPromptStableKeyFromManagerRow($row, index),
        promptId: getPromptIdFromManagerRow($row),
        promptName: getPromptNameFromManagerRow($row),
        enabled: getPromptEnabledFromManagerRow($row),
      };
    });
}

function sanitizePromptManagerListDom($list: JQuery<HTMLElement>) {
  if (!$list.length) return;

  // Remove empty wrappers/headers left by interrupted renders.
  $list.find(`${PROMPT_GROUP_WRAPPER_SELECTOR}[data-th-qs-group-key]`).each((_, wrapperEl) => {
    const $wrapper = $(wrapperEl as HTMLElement);
    const hasRows = $wrapper.find(PROMPT_MANAGER_ITEM_SELECTOR).length > 0;
    if (!hasRows) {
      const key = String($wrapper.attr('data-th-qs-group-key') || '');
      if (key) {
        $list.find(`.th-qs-group-header[data-th-qs-group-key="${key}"]`).remove();
      }
      $wrapper.remove();
    }
  });

  // Deduplicate prompt rows by stable key to recover from historical duplication bugs.
  const seen = new Set<string>();
  $list.find(PROMPT_MANAGER_ITEM_SELECTOR).each((index, rowEl) => {
    const $row = $(rowEl as HTMLElement);
    const key = getPromptStableKeyFromManagerRow($row, index);
    if (!key) return;
    if (seen.has(key)) {
      $row.remove();
      return;
    }
    seen.add(key);
  });
}

function mergePromptOrderByManager(basePrompts: PromptMetaSnapshot[]): PromptMetaSnapshot[] {
  const managerPrompts = collectPromptManagerSnapshots();
  if (!managerPrompts.length) return basePrompts;

  const byPromptId = new Map(basePrompts.map(item => [item.promptId, item]));
  const byPromptName = new Map<string, PromptMetaSnapshot[]>();
  basePrompts.forEach(item => {
    const key = item.promptName;
    const list = byPromptName.get(key) || [];
    list.push(item);
    byPromptName.set(key, list);
  });

  const usedPromptIds = new Set<string>();
  const merged: PromptMetaSnapshot[] = [];

  managerPrompts.forEach(managerItem => {
    const idMatched = managerItem.promptId && byPromptId.get(managerItem.promptId);
    if (idMatched && !usedPromptIds.has(idMatched.promptId)) {
      usedPromptIds.add(idMatched.promptId);
      merged.push({
        ...idMatched,
        promptName: managerItem.promptName || idMatched.promptName,
        enabled: managerItem.enabled,
      });
      return;
    }

    const sameNameQueue = byPromptName.get(managerItem.promptName);
    if (!sameNameQueue || !sameNameQueue.length) return;

    const fallback = sameNameQueue.find(item => !usedPromptIds.has(item.promptId));
    if (!fallback) return;
    usedPromptIds.add(fallback.promptId);
    merged.push({ ...fallback, enabled: managerItem.enabled });
  });

  basePrompts.forEach(item => {
    if (!usedPromptIds.has(item.promptId)) {
      merged.push(item);
    }
  });

  return merged;
}

let promptManagerGroupingHookInstalled = false;

async function installPromptManagerGroupingHook() {
  if (promptManagerGroupingHookInstalled) return;
  promptManagerGroupingHookInstalled = true;
  try {
    const dynamicImport = new Function('path', 'return import(path);') as (path: string) => Promise<any>;
    const mod = await dynamicImport('/scripts/PromptManager.js');
    const PromptManager = (mod as any)?.PromptManager;
    if (!PromptManager?.prototype) return;
    if ((PromptManager.prototype as any).__thQsGroupingHooked) return;
    const originalMakeDraggable = PromptManager.prototype.makeDraggable;
    if (typeof originalMakeDraggable !== 'function') return;

    PromptManager.prototype.makeDraggable = function (...args: any[]) {
      const result = originalMakeDraggable.apply(this, args);
      try {
        $(document).trigger('th_qs_prompt_manager_rendered');
      } catch {
        // ignore hook dispatch errors
      }
      return result;
    };
    (PromptManager.prototype as any).__thQsGroupingHooked = true;
  } catch {
    // ignore hook failures; observer fallback still works
  }
}

export function setupPromptManagerQuickSwitchGroupsCore(params: {
  quickSwitchPromptGroups: QuickSwitchPromptGroupConfig[];
}) {
  const groupConfigs = params.quickSwitchPromptGroups || [];
  const diagEnabled = shouldLogQuickSwitchGroupingDebug();
  const diagLog = (message: string, payload?: Record<string, unknown>) => {
    if (!diagEnabled) return;
    if (payload) {
      console.log(`[预设助手][快捷开关分组][diag] ${message}`, payload);
      return;
    }
    console.log(`[预设助手][快捷开关分组][diag] ${message}`);
  };
  logQuickSwitchGroupingDebug('setup init', {
    selector: PROMPT_MANAGER_LIST_SELECTOR,
    groupCount: groupConfigs.length,
    groupNames: groupConfigs.map(group => group.name),
  });
  const collapsedMap = new Map<string, boolean>();
  const LIST_ATTACH_SETTLE_WINDOW_MS = 360;
  const ROW_TOGGLE_HOST_SETTLE_WINDOW_MS = 1600;
  let disposed = false;
  let listObserver: MutationObserver | null = null;
  let observedList: HTMLElement | null = null;
  let selfApplying = false;
  let pendingApplyAfterDrag = false;
  let sortingActive = false;
  let renderScheduled = false;
  let renderDelayTimer: number | null = null;
  let attachSettleTimer: number | null = null;
  let lastListAttachAt = 0;
  let listRebindTimer: number | null = null;
  let loadingObserver: MutationObserver | null = null;
  let autoExpandedFromFullyCollapsed = false;
  let pendingViewAnchor: PromptListViewAnchor | null = null;
  let rowToggleInteractionAt = 0;
  let rowToggleRegroupConsumedAt = 0;
  let lastAppliedSignature = '';
  let lastAppliedDomSignature = '';
  let lastApplyReason = '';
  let cachedLayout: CachedPromptGroupLayout | null = null;
  let transientRetryCount = 0;
  let initialLoadRetryCount = 0;
  const COLLAPSE_STATE_STORAGE_KEY = 'th_qs_prompt_group_collapsed_state_v1';
  const GROUPING_ENABLED_STORAGE_KEY = 'th_qs_prompt_grouping_enabled_v1';
  let groupingEnabled = true;
  try {
    const raw = localStorage.getItem(GROUPING_ENABLED_STORAGE_KEY);
    if (raw == null) {
      groupingEnabled = true;
    } else if (raw === '1' || raw === '0') {
      groupingEnabled = raw === '1';
    } else {
      const parsed = JSON.parse(String(raw));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const currentPresetName = getLoadedPresetName();
        groupingEnabled = currentPresetName ? (parsed[currentPresetName] ?? true) : true;
      } else {
        groupingEnabled = true;
      }
    }
  } catch {
    groupingEnabled = true;
  }
  const persistedCollapsedState = (() => {
    try {
      const raw = localStorage.getItem(COLLAPSE_STATE_STORAGE_KEY);
      if (!raw) return {} as Record<string, boolean>;
      const parsed = JSON.parse(String(raw));
      if (!parsed || typeof parsed !== 'object') return {} as Record<string, boolean>;
      return parsed as Record<string, boolean>;
    } catch {
      return {} as Record<string, boolean>;
    }
  })();

  const persistCollapsedState = () => {
    const next: Record<string, boolean> = { ...persistedCollapsedState };
    collapsedMap.forEach((value, key) => {
      next[key] = !!value;
    });
    Object.keys(persistedCollapsedState).forEach(key => {
      persistedCollapsedState[key] = next[key];
    });
    try {
      localStorage.setItem(COLLAPSE_STATE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage failures
    }
  };

  const pruneCollapsedState = (validKeys: Set<string>) => {
    Array.from(collapsedMap.keys()).forEach(key => {
      if (!validKeys.has(key)) {
        collapsedMap.delete(key);
      }
    });
    Object.keys(persistedCollapsedState).forEach(key => {
      if (!validKeys.has(key)) {
        delete persistedCollapsedState[key];
      }
    });
    persistCollapsedState();
  };

  const applyPromptListSortableDisabled = (disabled: boolean) => {
    const $list = $(PROMPT_MANAGER_LIST_SELECTOR).first();
    if (!$list.length) return;
    if (!$list.hasClass('ui-sortable')) return;
    try {
      ($list as any).sortable('option', 'disabled', disabled);
    } catch {
      // ignore when sortable instance is unavailable
    }
  };

  const stopLoadingObserver = () => {
    if (!loadingObserver) return;
    try {
      loadingObserver.disconnect();
    } catch {
      // ignore observer cleanup errors
    }
    loadingObserver = null;
  };

  const ensureLoadingObserver = () => {
    if (loadingObserver) return;
    if (!document.body) return;
    loadingObserver = new MutationObserver(() => {
      const $list = $(PROMPT_MANAGER_LIST_SELECTOR).first();
      if (!$list.length) return;
      const rowCount = $list.find(PROMPT_MANAGER_ITEM_SELECTOR).length;
      const childCount = ($list.get(0) as HTMLElement | undefined)?.children?.length ?? 0;
      if (rowCount > 6 || childCount > 10) {
        logQuickSwitchGroupingDebug('full prompt list detected by loading observer', {
          rowCount,
          childCount,
        });
        stopLoadingObserver();
        scheduleApplyGrouping('loading-observer:full-list-ready');
      }
    });
    try {
      loadingObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    } catch {
      loadingObserver = null;
    }
  };

  const stripGroupingArtifacts = () => {
    const $list = $(PROMPT_MANAGER_LIST_SELECTOR).first();
    if (!$list.length) return;
    $list.removeClass('pt-entry-grouping-root pt-entry-grouping-pending');
    $list.find(PROMPT_GROUP_WRAPPER_SELECTOR).each((_, wrapperEl) => {
      $(wrapperEl).contents().unwrap();
    });
    $list.find(PROMPT_GROUP_HEADER_SELECTOR).remove();
    $list
      .find(PROMPT_MANAGER_ITEM_SELECTOR)
      .removeClass('th-qs-group-item th-qs-group-item-collapsed')
      .removeAttr('data-th-qs-group')
      .removeAttr('aria-hidden');
    lastAppliedDomSignature = '';
    cachedLayout = null;
  };

  const logListDomSnapshot = (stage: string) => {
    if (!diagEnabled) return;
    const $list = $(PROMPT_MANAGER_LIST_SELECTOR).first();
    const $header = $list.find(PROMPT_GROUP_HEADER_SELECTOR).first();
    const headerEl = $header.get(0) as HTMLElement | undefined;
    const style = headerEl ? getComputedStyle(headerEl) : null;
    diagLog('dom snapshot', {
      stage,
      hasList: $list.length > 0,
      listClass: $list.attr('class') || '',
      headerCount: $list.find(PROMPT_GROUP_HEADER_SELECTOR).length,
      itemCount: $list.find(PROMPT_MANAGER_ITEM_SELECTOR).length,
      firstHeaderClass: $header.attr('class') || '',
      firstHeaderAriaExpanded: $header.attr('aria-expanded') || '',
      firstHeaderInlineStyle: $header.attr('style') || '',
      firstHeaderDisplay: style?.display || '',
      firstHeaderVisibility: style?.visibility || '',
      firstHeaderPointerEvents: style?.pointerEvents || '',
      firstHeaderBackground: style?.background || '',
      firstHeaderBorder: style?.border || '',
      firstHeaderFontSize: style?.fontSize || '',
      firstHeaderFontWeight: style?.fontWeight || '',
      firstHeaderLineHeight: style?.lineHeight || '',
    });
  };

  const logCollapsedStateSnapshot = (reason: string) => {
    if (!diagEnabled) return;
    diagLog('collapsed snapshot', {
      reason,
      size: collapsedMap.size,
      entries: Array.from(collapsedMap.entries()).slice(0, 20),
    });
  };

  const isToggleDrivenReason = (reason: string) => {
    return (
      reason === 'pm-hook:makeDraggable' || reason === 'list-observer:attach' || reason === 'list-observer:mutations'
    );
  };

  const capturePromptListViewAnchor = (sourceEl?: HTMLElement | null): PromptListViewAnchor | null => {
    const $list = $(PROMPT_MANAGER_LIST_SELECTOR).first();
    const listEl = $list.get(0) as HTMLElement | undefined;
    if (!listEl) return null;
    const anchor = {
      scrollTop: listEl.scrollTop,
    };
    diagLog('view anchor captured', {
      scrollTop: anchor.scrollTop,
      sourceClass: sourceEl?.className || '',
    });
    return anchor;
  };

  const restorePromptListViewAnchor = () => {
    if (!pendingViewAnchor) return;
    const anchor = pendingViewAnchor;
    const $list = $(PROMPT_MANAGER_LIST_SELECTOR).first();
    const listEl = $list.get(0) as HTMLElement | undefined;
    if (!listEl) return;

    const restore = () => {
      if (pendingViewAnchor !== anchor) return;
      const currentListEl = $(PROMPT_MANAGER_LIST_SELECTOR).get(0) as HTMLElement | undefined;
      if (!currentListEl) return;
      diagLog('view anchor restore attempt', {
        currentScrollTop: currentListEl.scrollTop,
        targetScrollTop: anchor.scrollTop,
      });
      currentListEl.scrollTop = anchor.scrollTop;
      diagLog('view anchor restored by raw scrollTop', {
        finalScrollTop: currentListEl.scrollTop,
      });
      pendingViewAnchor = null;
    };

    requestAnimationFrame(restore);
  };

  const applyPromptManagerListVisibility = () => {
    const $list = $(PROMPT_MANAGER_LIST_SELECTOR).first();
    if (!$list.length) return;

    $list.find(`${PROMPT_GROUP_WRAPPER_SELECTOR}[data-th-qs-group-key]`).each((_, wrapperEl) => {
      const $wrapper = $(wrapperEl as HTMLElement);
      const groupKey = String($wrapper.attr('data-th-qs-group-key') || '');
      const collapsed = groupKey ? !!collapsedMap.get(groupKey) : false;
      setPromptGroupWrapperCollapsed($wrapper, collapsed);
      $wrapper
        .find(PROMPT_MANAGER_ITEM_SELECTOR)
        .toggleClass('th-qs-group-item-collapsed', collapsed)
        .attr('aria-hidden', collapsed ? 'true' : 'false');
    });

    $list.find(PROMPT_GROUP_HEADER_SELECTOR).each((_, headerEl) => {
      const $header = $(headerEl as HTMLElement);
      $header.show();
    });

    // Safety guard: only recover if both headers and rows disappear.
    const visiblePromptRows = $list.find(`${PROMPT_MANAGER_ITEM_SELECTOR}:visible`).length;
    const wrapperCount = $list.find(`${PROMPT_GROUP_WRAPPER_SELECTOR}[data-th-qs-group-key]`).length;
    const visibleHeaderCount = $list.find(`${PROMPT_GROUP_HEADER_SELECTOR}:visible`).length;
    if (!autoExpandedFromFullyCollapsed && wrapperCount > 0 && visiblePromptRows === 0 && visibleHeaderCount === 0) {
      autoExpandedFromFullyCollapsed = true;
      $list.find(`${PROMPT_GROUP_WRAPPER_SELECTOR}[data-th-qs-group-key]`).each((_, wrapperEl) => {
        const $wrapper = $(wrapperEl as HTMLElement);
        const groupKey = String($wrapper.attr('data-th-qs-group-key') || '');
        if (!groupKey) return;
        collapsedMap.set(groupKey, false);
      });
      $list.find('.th-qs-group-header[data-th-qs-group-key]').each((_, headerEl) => {
        const $header = $(headerEl as HTMLElement);
        $header.removeClass('is-collapsed').attr('aria-expanded', 'true');
      });
      $list.find(`${PROMPT_GROUP_WRAPPER_SELECTOR}[data-th-qs-group-key]`).each((_, wrapperEl) => {
        setPromptGroupWrapperCollapsed($(wrapperEl as HTMLElement), false);
      });
      $list.find(PROMPT_MANAGER_ITEM_SELECTOR).removeClass('th-qs-group-item-collapsed').attr('aria-hidden', 'false');
      persistCollapsedState();
      logCollapsedStateSnapshot('auto-expand-fully-collapsed');
    }
  };

  const refreshGroupedHeaderCounts = () => {
    const $list = $(PROMPT_MANAGER_LIST_SELECTOR).first();
    if (!$list.length) return;
    $list.find('.th-qs-group-header[data-th-qs-group-key]').each((_, headerEl) => {
      const $header = $(headerEl as HTMLElement);
      const groupKey = String($header.attr('data-th-qs-group-key') || '');
      if (!groupKey) return;
      const $rows = $list.find(
        `${PROMPT_GROUP_WRAPPER_SELECTOR}[data-th-qs-group-key="${groupKey}"] ${PROMPT_MANAGER_ITEM_SELECTOR}`,
      );
      const totalCount = $rows.length;
      const enabledCount = $rows.filter((_, rowEl) => getPromptEnabledFromManagerRow($(rowEl as HTMLElement))).length;
      $header
        .find('.th-qs-group-count, .pt-entry-group-count')
        .first()
        .attr('title', `激活 ${enabledCount} / 总计 ${totalCount}`)
        .text(`${enabledCount}/${totalCount}`);
    });
  };

  const ensureHeadersVisibleFallback = () => {
    const $list = $(PROMPT_MANAGER_LIST_SELECTOR).first();
    if (!$list.length) return;
    const $headers = $list.find('.th-qs-group-header[data-th-qs-group-key]');
    if (!$headers.length) return;

    const visibleHeaderCount = $headers.filter((_, el) => {
      const style = getComputedStyle(el as HTMLElement);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    }).length;

    if (visibleHeaderCount > 0) return;

    // Fallback: if host styles hide headers unexpectedly, force-show them and uncollapse once.
    $headers.each((_, el) => {
      const header = el as HTMLElement;
      header.style.setProperty('display', 'flex', 'important');
      header.style.setProperty('visibility', 'visible', 'important');
      header.style.setProperty('opacity', '1', 'important');
    });
    applyPromptManagerListVisibility();
    refreshGroupedHeaderCounts();
    logQuickSwitchGroupingDebug('headers visibility fallback applied');
  };

  const applyAllGroupsCollapsed = (collapsed: boolean) => {
    const $list = $(PROMPT_MANAGER_LIST_SELECTOR).first();
    if (!$list.length) return;
    $list.find(PROMPT_GROUP_HEADER_SELECTOR).each((_, headerEl) => {
      const $header = $(headerEl as HTMLElement);
      const groupKey = String($header.attr('data-th-qs-group-key') || '');
      if (!groupKey) return;
      collapsedMap.set(groupKey, collapsed);
      $header.toggleClass('is-collapsed', collapsed).attr('aria-expanded', collapsed ? 'false' : 'true');
    });
    persistCollapsedState();
    logCollapsedStateSnapshot(`apply-all:${collapsed ? 'collapsed' : 'expanded'}`);
    applyPromptManagerListVisibility();
  };

  const ensurePromptManagerHeadTools = () => {
    const $list = $(PROMPT_MANAGER_LIST_SELECTOR).first();
    if (!$list.length) return;
    const $existing = $list.find('li.th-qs-head-tools-row .th-qs-list-tools').first();
    if ($existing.length) {
      const $groupBtn = $existing.find('.th-qs-tool-btn[data-action="th_qs_manage_grouping"]').first();
      $groupBtn
        .attr('title', groupingEnabled ? '分组管理（当前分组已启用）' : '分组管理（当前分组已停用）')
        .attr('aria-label', '打开分组管理')
        .find('.th-qs-tool-label')
        .text('分组管理');
      return;
    }
    const $head = $list.find(PROMPT_MANAGER_HEAD_SELECTOR).first();
    if (!$head.length) return;

    const $tools = $(
      `<span class="th-qs-name-tools-host">
        <span class="th-qs-list-tools th-qs-list-tools-row1">
          <button type="button" class="th-qs-tool-btn" data-action="th_qs_manage_grouping" title="打开分组管理" aria-label="打开分组管理"><i class="fas fa-layer-group"></i><span class="th-qs-tool-label">分组管理</span></button>
        </span>
        <span class="th-qs-list-tools th-qs-list-tools-row2">
          <button type="button" class="th-qs-tool-btn" data-action="th_qs_expand_all" title="全部展开" aria-label="全部展开"><i class="fas fa-angle-double-down"></i><span class="th-qs-tool-label">全部展开</span></button>
          <button type="button" class="th-qs-tool-btn" data-action="th_qs_collapse_all" title="全部折叠" aria-label="全部折叠"><i class="fas fa-angle-double-up"></i><span class="th-qs-tool-label">全部折叠</span></button>
        </span>
      </span>`,
    );

    $tools.find('.th-qs-tool-btn').on('click', e => {
      e.preventDefault();
      e.stopPropagation();
      const action = String($(e.currentTarget).attr('data-action') || '');
      if (action === 'th_qs_manage_grouping') {
        const manager = (window as any)?.__th_qs_prompt_group_runtime__?.openManager;
        if (typeof manager === 'function') {
          void manager();
        } else {
          toastr.warning('分组管理尚未就绪，请稍后重试。');
        }
      } else if (action === 'th_qs_expand_all') {
        applyAllGroupsCollapsed(false);
      } else if (action === 'th_qs_collapse_all') {
        applyAllGroupsCollapsed(true);
      }
    });

    const $toolRow = $('<li class="th-qs-head-tools-row"></li>');
    $toolRow.append($tools);
    $list.find('li.th-qs-head-tools-row').remove();
    $head.after($toolRow);
  };

  const recordFlatOrderFromManager = () => {
    if (groupingEnabled) return;
    const $list = $(PROMPT_MANAGER_LIST_SELECTOR).first();
    if (!$list.length) return;
    const rowKeys = $list
      .find(PROMPT_MANAGER_ITEM_SELECTOR)
      .toArray()
      .map((row, index) => getPromptStableKeyFromManagerRow($(row as HTMLElement), index))
      .filter(Boolean);
    if (!rowKeys.length) return;
    const presetName = (typeof getLoadedPresetName === 'function' && getLoadedPresetName()) || '__default__';
    const previous = loadFlatOrderOverride(presetName);
    if (previous && JSON.stringify(previous) === JSON.stringify(rowKeys)) return;
    saveFlatOrderOverride(presetName, rowKeys);
    logQuickSwitchGroupingDebug('flat order recorded', { presetName, rowCount: rowKeys.length });
  };

  const applyGrouping = () => {
    if (disposed || selfApplying) return;
    const $list = $(PROMPT_MANAGER_LIST_SELECTOR).first();
    if (!$list.length) {
      logQuickSwitchGroupingDebug('apply skipped: list not found', {
        selector: PROMPT_MANAGER_LIST_SELECTOR,
      });
      return;
    }
    sanitizePromptManagerListDom($list);
    ensurePromptManagerHeadTools();
    applyPromptListSortableDisabled(groupingEnabled);
    if (!groupingEnabled) {
      stripGroupingArtifacts();
      return;
    }
    const listDoc = ($list.get(0) as HTMLElement).ownerDocument || document;
    const beforeTypography = getHeaderTypographySnapshot($list);
    ensurePromptGroupRuntimeStyle(listDoc);
    const afterTypography = getHeaderTypographySnapshot($list);
    logQuickSwitchGroupingDebug('typography snapshot around ensurePromptGroupRuntimeStyle', {
      before: beforeTypography,
      after: afterTypography,
    });
    $list.addClass('pt-entry-grouping-root');

    const snapshots = $list
      .find(PROMPT_MANAGER_ITEM_SELECTOR)
      .toArray()
      .map((row, index) => {
        const $row = $(row as HTMLElement);
        return {
          $row,
          rowKey: getPromptStableKeyFromManagerRow($row, index),
          promptId: getPromptIdFromManagerRow($row),
          promptName: getPromptNameFromManagerRow($row),
          enabled: getPromptEnabledFromManagerRow($row),
        };
      });

    const listChildCount = ($list.get(0) as HTMLElement | undefined)?.children?.length ?? 0;
    const withinRowToggleSettleWindow =
      rowToggleInteractionAt > 0 && Date.now() - rowToggleInteractionAt < ROW_TOGGLE_HOST_SETTLE_WINDOW_MS;
    if (groupConfigs.length > 0 && snapshots.length > 0 && snapshots.length <= 6 && listChildCount <= 10) {
      initialLoadRetryCount += 1;
      const hasInjectedGrouping = hasPromptGroupingUi($list);
      logQuickSwitchGroupingDebug('initial list looks incomplete; defer grouping', {
        promptRows: snapshots.length,
        childCount: listChildCount,
        initialLoadRetryCount,
        hasInjectedGrouping,
        withinRowToggleSettleWindow,
      });
      if (!hasInjectedGrouping && !withinRowToggleSettleWindow) {
        stripGroupingArtifacts();
      }
      ensureLoadingObserver();
      if (renderDelayTimer != null) {
        clearTimeout(renderDelayTimer);
      }
      const retryDelay = initialLoadRetryCount <= 8 ? 180 : 500;
      renderDelayTimer = window.setTimeout(() => {
        renderDelayTimer = null;
        scheduleApplyGrouping('initial-load:incomplete-list');
      }, retryDelay);
      return;
    }
    stopLoadingObserver();
    initialLoadRetryCount = 0;
    const promptEntries: PromptMetaSnapshot[] = snapshots.map(item => ({
      rowKey: item.rowKey,
      promptId: item.promptId,
      promptName: item.promptName,
      enabled: item.enabled,
    }));
    const nextSignature = computePromptGroupingSignature(promptEntries, groupConfigs);
    const hasInjectedHeaders = $list.find('.th-qs-group-header').length > 0;
    const hasInjectedWrappers = $list.find(`${PROMPT_GROUP_WRAPPER_SELECTOR}[data-th-qs-group-key]`).length > 0;
    const hasInjectedGrouping = hasPromptGroupingUi($list);
    const nextDomSignature = buildHealthSignature($list);
    if ((hasInjectedHeaders || hasInjectedWrappers) && snapshots.length === 0) {
      if (renderDelayTimer != null) {
        clearTimeout(renderDelayTimer);
      }
      renderDelayTimer = window.setTimeout(() => {
        renderDelayTimer = null;
        scheduleApplyGrouping('transient-empty-list-retry');
      }, 200);
      return;
    }
    if (
      nextSignature === lastAppliedSignature &&
      nextDomSignature === lastAppliedDomSignature &&
      hasInjectedGrouping &&
      hasInjectedHeaders &&
      hasInjectedWrappers
    ) {
      applyPromptManagerListVisibility();
      refreshGroupedHeaderCounts();
      ensureHeadersVisibleFallback();
      setPromptGroupingPendingState($list, false);
      return;
    }
    if (!hasInjectedGrouping && nextSignature === lastAppliedSignature && cachedLayout) {
      selfApplying = true;
      try {
        if (listObserver) {
          try {
            listObserver.disconnect();
          } catch {
            // ignore observer disconnect errors
          }
        }
        const restored = tryRestoreCachedGroupingLayout($list, snapshots, nextSignature);
        if (restored) {
          ensurePromptManagerHeadTools();
          restorePromptListViewAnchor();
          setPromptGroupingPendingState($list, false);
          logListDomSnapshot('after fast restore');
          requestAnimationFrame(() => {
            const persistedHeaderCount = $list.find(PROMPT_GROUP_HEADER_SELECTOR).length;
            diagLog('next frame check', {
              persistedHeaderCount,
              listChildCount: $list.children().length,
              fastRestore: true,
            });
            logListDomSnapshot('next frame');
          });
          return;
        }
      } finally {
        const listEl = $(PROMPT_MANAGER_LIST_SELECTOR).get(0) as HTMLElement | undefined;
        if (!disposed && listEl && listObserver) {
          try {
            listObserver.observe(listEl, {
              childList: true,
              subtree: false,
            });
          } catch {
            // ignore observer rebind errors
          }
        }
        selfApplying = false;
      }
    }
    const segments = buildGroupedPromptSegmentsWithRuntime(promptEntries, groupConfigs);
    const keyToRows = new Map<string, JQuery<HTMLElement>>();
    snapshots.forEach(item => {
      keyToRows.set(item.rowKey, item.$row);
    });
    const groupedSegmentsRawCount = segments.filter(segment => !!segment.groupName && segment.items.length > 0).length;
    const resolvableSegments = segments.filter(
      segment => !!segment.groupName && segment.items.length > 0 && keyToRows.has(segment.items[0].rowKey),
    );
    const groupedSegmentsCount = resolvableSegments.length;

    // During add/remove operations, prompt manager can briefly enter an intermediate DOM state.
    // In that window, clearing headers causes visible disappearance and may not recover immediately.
    if (hasInjectedHeaders && groupedSegmentsCount === 0 && groupConfigs.length > 0 && promptEntries.length > 0) {
      transientRetryCount += 1;
      diagLog('transient zero-group detected; keep headers and retry', {
        transientRetryCount,
        promptRows: snapshots.length,
        groupConfigCount: groupConfigs.length,
      });
      if (transientRetryCount <= 3) {
        if (renderDelayTimer != null) {
          clearTimeout(renderDelayTimer);
        }
        renderDelayTimer = window.setTimeout(() => {
          renderDelayTimer = null;
          scheduleApplyGrouping('transient-zero-group-retry');
        }, 120);
        return;
      }
    } else {
      transientRetryCount = 0;
    }

    diagLog('build segments', {
      promptRows: snapshots.length,
      groupedSegmentsCount,
      groupedSegmentsRawCount,
      groupedNames: segments.filter(segment => !!segment.groupName).map(segment => segment.groupName),
      firstPromptNames: promptEntries.slice(0, 6).map(item => item.promptName),
    });

    selfApplying = true;
    try {
      // Temporarily pause observer while we patch DOM to avoid self-trigger loops/flicker.
      if (listObserver) {
        try {
          listObserver.disconnect();
        } catch {
          // ignore observer disconnect errors
        }
      }

      const insertedHeaderHtmlSamples: string[] = [];
      let movedRowCount = 0;
      const desiredGroupKeys = new Set<string>();
      const assignedRowKeys = new Set<string>();
      const headerByGroupKey = new Map<string, JQuery<HTMLElement>>();
      const wrapperByGroupKey = new Map<string, JQuery<HTMLElement>>();

      $list.find('.th-qs-group-header[data-th-qs-group-key]').each((_, headerEl) => {
        const $header = $(headerEl as HTMLElement);
        const key = String($header.attr('data-th-qs-group-key') || '');
        if (!key) return;
        headerByGroupKey.set(key, $header);
      });
      $list.find(`${PROMPT_GROUP_WRAPPER_SELECTOR}[data-th-qs-group-key]`).each((_, wrapperEl) => {
        const $wrapper = $(wrapperEl as HTMLElement);
        const key = String($wrapper.attr('data-th-qs-group-key') || '');
        if (!key) return;
        wrapperByGroupKey.set(key, $wrapper);
      });

      const bindWrapperEvents = ($wrapper: JQuery<HTMLElement>) => {
        $wrapper.off('toggle.qsPromptGroupsLocal').on('toggle.qsPromptGroupsLocal', e => {
          if (selfApplying) return;
          const $currentWrapper = $(e.currentTarget as HTMLElement);
          const groupKey = String($currentWrapper.attr('data-th-qs-group-key') || '');
          if (!groupKey) return;
          const nextCollapsed = !$currentWrapper.prop('open');
          const currentCollapsed = !!collapsedMap.get(groupKey);
          if (nextCollapsed === currentCollapsed) return;
          collapsedMap.set(groupKey, nextCollapsed);
          persistCollapsedState();
          const $header = $currentWrapper.children(PROMPT_GROUP_HEADER_SELECTOR).first();
          $header.toggleClass('is-collapsed', nextCollapsed).attr('aria-expanded', nextCollapsed ? 'false' : 'true');
          applyPromptManagerListVisibility();
          $currentWrapper.removeAttr('aria-hidden');
          logCollapsedStateSnapshot(`details-toggle:${groupKey}:${nextCollapsed ? 'collapsed' : 'expanded'}`);
          diagLog('toggle apply', {
            groupKey,
            nextCollapsed,
            matchedRows: $currentWrapper.find(PROMPT_MANAGER_ITEM_SELECTOR).length,
            headerClass: $header.attr('class') || '',
            headerAriaExpanded: $header.attr('aria-expanded') || '',
          });
        });
      };

      wrapperByGroupKey.forEach($wrapper => {
        bindWrapperEvents($wrapper);
      });

      resolvableSegments.forEach((segment, segmentIndex) => {
        try {
          if (!segment.groupName || !segment.items.length) return;
          const firstKey = segment.items[0].rowKey;
          const $first = keyToRows.get(firstKey);
          if (!$first || !$first.length) {
            diagLog('skip segment: first target row not found', {
              groupName: segment.groupName,
              segmentIndex,
              firstKey,
            });
            return;
          }

          const groupKey = normalizeGroupKey(segment.groupName, segmentIndex);
          desiredGroupKeys.add(groupKey);
          const isCollapsed = collapsedMap.has(groupKey)
            ? !!collapsedMap.get(groupKey)
            : groupKey in persistedCollapsedState
              ? !!persistedCollapsedState[groupKey]
              : !!segment.collapsedByDefault;
          collapsedMap.set(groupKey, isCollapsed);
          const enabledCount = segment.items.filter(item => item.enabled).length;
          const totalCount = segment.items.length;

          let $header = headerByGroupKey.get(groupKey);
          if (!$header || !$header.length) {
            $header = $(
              `<summary class="th-qs-group-header" data-th-qs-group-key="${groupKey}">
                <span class="pt-entry-group-toggle th-qs-group-caret" aria-hidden="true"><i class="fas fa-chevron-right"></i></span>
                <span class="pt-entry-group-name th-qs-group-title"></span>
                <span class="pt-entry-group-count th-qs-group-count"></span>
              </summary>`,
            );
            headerByGroupKey.set(groupKey, $header);
            insertedHeaderHtmlSamples.push(($header.get(0) as HTMLElement)?.outerHTML || '');
          }
          let $wrapper = wrapperByGroupKey.get(groupKey);
          if (!$wrapper || !$wrapper.length) {
            $wrapper = $(`<details class="th-qs-group-wrapper" data-th-qs-group-key="${groupKey}"></details>`);
            wrapperByGroupKey.set(groupKey, $wrapper);
            bindWrapperEvents($wrapper);
          }

          $header
            .toggleClass('is-collapsed', isCollapsed)
            .attr('aria-expanded', isCollapsed ? 'false' : 'true')
            .find('.th-qs-group-title, .pt-entry-group-name')
            .first()
            .text(segment.groupName);
          $header
            .find('.th-qs-group-count, .pt-entry-group-count')
            .first()
            .attr('title', `激活 ${enabledCount} / 总计 ${totalCount}`)
            .text(`${enabledCount}/${totalCount}`);

          if ($first.prev().get(0) !== $wrapper.get(0)) {
            $first.before($wrapper);
          }
          if (
            $header.parent().get(0) !== $wrapper.get(0) ||
            $wrapper.children(PROMPT_GROUP_HEADER_SELECTOR).first().get(0) !== $header.get(0)
          ) {
            $wrapper.prepend($header);
          }
          setPromptGroupWrapperCollapsed($wrapper, isCollapsed);

          segment.items.forEach(item => {
            assignedRowKeys.add(item.rowKey);
            const $row = keyToRows.get(item.rowKey);
            if (!$row || !$row.length) return;
            $row
              .attr('data-th-qs-group', groupKey)
              .addClass('th-qs-group-item')
              .toggleClass('th-qs-group-item-collapsed', isCollapsed)
              .attr('aria-hidden', isCollapsed ? 'true' : 'false');
            if ($row.parent().get(0) !== $wrapper!.get(0)) {
              $wrapper!.append($row);
              movedRowCount += 1;
            }
          });
        } catch (error) {
          console.error('[预设助手][快捷开关分组] segment render failed', {
            groupName: segment.groupName,
            segmentIndex,
            itemCount: segment.items.length,
            message: error instanceof Error ? error.message : String(error),
            error,
          });
        }
      });

      $list.find('.th-qs-group-header[data-th-qs-group-key]').each((_, headerEl) => {
        const $header = $(headerEl as HTMLElement);
        const key = String($header.attr('data-th-qs-group-key') || '');
        if (!key || !desiredGroupKeys.has(key)) {
          $header.remove();
        }
      });
      $list.find(`${PROMPT_GROUP_WRAPPER_SELECTOR}[data-th-qs-group-key]`).each((_, wrapperEl) => {
        const $wrapper = $(wrapperEl as HTMLElement);
        const key = String($wrapper.attr('data-th-qs-group-key') || '');
        if (!key || !desiredGroupKeys.has(key)) {
          $wrapper.contents().unwrap();
        }
      });
      pruneCollapsedState(desiredGroupKeys);

      snapshots.forEach(item => {
        if (assignedRowKeys.has(item.rowKey)) return;
        item.$row
          .removeClass('th-qs-group-item th-qs-group-item-collapsed')
          .removeAttr('data-th-qs-group')
          .removeAttr('aria-hidden');
        if ((item.$row.parent().get(0) as HTMLElement | undefined)?.classList?.contains('th-qs-group-wrapper')) {
          const $p = item.$row.parent();
          $p.after(item.$row);
        }
      });

      ensurePromptManagerHeadTools();
      applyPromptManagerListVisibility();
      refreshGroupedHeaderCounts();
      persistCollapsedState();
      setPromptGroupingPendingState($list, false);
      cachedLayout = {
        signature: nextSignature,
        groups: resolvableSegments.map((segment, segmentIndex) => ({
          groupKey: normalizeGroupKey(segment.groupName || '', segmentIndex),
          groupName: segment.groupName || '',
          collapsedByDefault: !!segment.collapsedByDefault,
          rowKeys: segment.items.map(item => item.rowKey),
        })),
      };
      logCollapsedStateSnapshot('apply-grouping-finished');
      restorePromptListViewAnchor();

      const headerCount = $list.find('.th-qs-group-header').length;
      lastAppliedSignature = nextSignature;
      lastAppliedDomSignature = buildHealthSignature($list);
      diagLog('after insert', {
        insertedHeaders: headerCount,
        sampleInsertedHeaders: insertedHeaderHtmlSamples.slice(0, 2),
        hasRootClass: $list.hasClass('pt-entry-grouping-root'),
      });
      logListDomSnapshot('after insert');

      requestAnimationFrame(() => {
        const persistedHeaderCount = $list.find(PROMPT_GROUP_HEADER_SELECTOR).length;
        diagLog('next frame check', {
          persistedHeaderCount,
          listChildCount: $list.children().length,
        });
        logListDomSnapshot('next frame');
        if (groupedSegmentsCount > 0 && persistedHeaderCount === 0 && !disposed && !selfApplying) {
          scheduleApplyGrouping('next-frame:headers-lost');
        }
        if (groupedSegmentsCount > 0 && persistedHeaderCount > 0) {
          ensureHeadersVisibleFallback();
        }
      });

      // delayed diagnostic snapshots disabled to avoid noisy refresh loops

      logQuickSwitchGroupingDebug('apply done', {
        promptRows: snapshots.length,
        groupedSegmentsCount,
        groupedSegmentsRawCount,
        insertedHeaders: headerCount,
        movedRowCount,
        hasRootClass: $list.hasClass('pt-entry-grouping-root'),
      });
    } catch (error) {
      console.error('[预设助手][快捷开关分组] applyGrouping failed', {
        message: error instanceof Error ? error.message : String(error),
        error,
      });
    } finally {
      const listEl = $(PROMPT_MANAGER_LIST_SELECTOR).get(0) as HTMLElement | undefined;
      if (!disposed && listEl && listObserver) {
        try {
          listObserver.observe(listEl, {
            childList: true,
            subtree: false,
          });
        } catch {
          // ignore observer rebind errors
        }
      }
      selfApplying = false;
    }
  };

  const scheduleApplyGrouping = (reason = 'unknown') => {
    if (disposed) return;
    const now = Date.now();
    if (reason === 'list-observer:attach' || reason === 'rebind-timer:list-node-changed') {
      const $list = $(PROMPT_MANAGER_LIST_SELECTOR).first();
      if ($list.length && groupingEnabled) {
        setPromptGroupingPendingState($list, true);
      }
    }
    const shouldSettleAttach =
      reason === 'list-observer:attach' ||
      reason === 'rebind-timer:list-node-changed' ||
      (reason === 'list-observer:mutations' &&
        lastListAttachAt > 0 &&
        now - lastListAttachAt < LIST_ATTACH_SETTLE_WINDOW_MS);
    if (shouldSettleAttach) {
      if (reason !== 'list-observer:mutations') {
        lastListAttachAt = now;
      }
      if (attachSettleTimer != null) {
        clearTimeout(attachSettleTimer);
      }
      attachSettleTimer = window.setTimeout(() => {
        attachSettleTimer = null;
        scheduleApplyGrouping('list-observer:attach:settled');
      }, LIST_ATTACH_SETTLE_WINDOW_MS);
      diagLog('schedule apply coalesced in attach settle window', {
        reason,
        settleMs: LIST_ATTACH_SETTLE_WINDOW_MS,
      });
      return;
    }
    if (renderScheduled) return;
    if (
      isEnvironmentToggleWritebackWindowActiveForGrouping() &&
      (reason === 'list-observer:attach' ||
        reason === 'list-observer:mutations' ||
        reason === 'rebind-timer:list-node-changed' ||
        reason === 'list-observer:attach:settled')
    ) {
      diagLog('schedule apply deferred in environment writeback window', { reason });
      if (renderDelayTimer != null) {
        clearTimeout(renderDelayTimer);
      }
      renderScheduled = true;
      renderDelayTimer = window.setTimeout(() => {
        renderDelayTimer = null;
        renderScheduled = false;
        scheduleApplyGrouping(`${reason}:after-env-writeback`);
      }, 260);
      return;
    }
    const withinToggleWindow =
      rowToggleInteractionAt > 0 && now - rowToggleInteractionAt < ROW_TOGGLE_HOST_SETTLE_WINDOW_MS;
    if (withinToggleWindow && isToggleDrivenReason(reason) && reason !== 'list-observer:attach') {
      diagLog('schedule apply deferred until row-toggle host refresh settles', {
        reason,
        rowToggleInteractionAt,
      });
      if (renderDelayTimer != null) {
        clearTimeout(renderDelayTimer);
      }
      renderScheduled = true;
      const remaining = Math.max(140, ROW_TOGGLE_HOST_SETTLE_WINDOW_MS + 40 - (now - rowToggleInteractionAt));
      renderDelayTimer = window.setTimeout(() => {
        renderDelayTimer = null;
        renderScheduled = false;
        scheduleApplyGrouping('row-toggle:settle');
      }, remaining);
      return;
    }
    if (withinToggleWindow && isToggleDrivenReason(reason)) {
      if (rowToggleRegroupConsumedAt > 0 && now - rowToggleRegroupConsumedAt < ROW_TOGGLE_HOST_SETTLE_WINDOW_MS) {
        diagLog('schedule apply skipped in toggle coalesce window', {
          reason,
          rowToggleInteractionAt,
          rowToggleRegroupConsumedAt,
        });
        return;
      }
      rowToggleRegroupConsumedAt = now;
      reason = 'row-toggle:regroup';
    }
    logQuickSwitchGroupingDebug('schedule apply queued', { reason, selfApplying });
    renderScheduled = true;
    if (renderDelayTimer != null) {
      clearTimeout(renderDelayTimer);
    }
    const immediateReasons = new Set([
      'next-frame:headers-lost',
      'transient-empty-list-retry',
      'transient-zero-group-retry',
      'pm-hook:makeDraggable',
      'row-toggle:regroup',
    ]);
    const stabilizeReasons = new Set(['toggle:grouping-enabled', 'list-observer:attach:settled']);
    const delay = immediateReasons.has(reason) ? 0 : stabilizeReasons.has(reason) ? 160 : lastAppliedSignature ? 80 : 0;
    renderDelayTimer = window.setTimeout(() => {
      renderDelayTimer = null;
      requestAnimationFrame(() => {
        renderScheduled = false;
        lastApplyReason = reason;
        logQuickSwitchGroupingDebug('schedule apply run', { reason });
        applyGrouping();
      });
    }, delay);
  };

  const isPromptListDragging = () => {
    if (sortingActive) return true;
    const list = $(PROMPT_MANAGER_LIST_SELECTOR).get(0) as HTMLElement | undefined;
    if (!list) return false;
    if (list.classList.contains('ui-sortable-helper') || list.classList.contains('ui-sortable-placeholder'))
      return true;
    if (list.querySelector('.ui-sortable-helper, .ui-sortable-placeholder')) return true;
    if (document.querySelector('body > .ui-sortable-helper, body > .ui-sortable-placeholder')) return true;
    return false;
  };

  const flushPendingApplyAfterDrag = () => {
    if (disposed) return;
    if (isPromptListDragging()) return;
    if (!pendingApplyAfterDrag) return;
    pendingApplyAfterDrag = false;
    scheduleApplyGrouping('drag:flush-pending');
  };

  const buildHealthSignature = ($list: JQuery<HTMLElement>) => {
    const rows = $list.find(PROMPT_MANAGER_ITEM_SELECTOR).toArray() as HTMLElement[];
    const first = rows[0];
    const last = rows[rows.length - 1];
    const firstId = first?.getAttribute('data-pm-identifier') || first?.getAttribute('data-prompt-id') || '';
    const lastId = last?.getAttribute('data-pm-identifier') || last?.getAttribute('data-prompt-id') || '';
    const firstName = first?.getAttribute('data-pm-name') || '';
    const lastName = last?.getAttribute('data-pm-name') || '';
    return `${rows.length}|${firstId}|${firstName}|${lastId}|${lastName}`;
  };

  const tryRestoreCachedGroupingLayout = (
    $list: JQuery<HTMLElement>,
    snapshots: Array<{
      $row: JQuery<HTMLElement>;
      rowKey: string;
      promptId: string;
      promptName: string;
      enabled: boolean;
    }>,
    nextSignature: string,
  ) => {
    if (!cachedLayout || cachedLayout.signature !== nextSignature) return false;
    if (
      !lastApplyReason.includes('attach') &&
      lastApplyReason !== 'row-toggle:settle' &&
      lastApplyReason !== 'rebind-timer:list-node-changed'
    ) {
      return false;
    }

    const keyToRows = new Map<string, JQuery<HTMLElement>>();
    snapshots.forEach(item => {
      keyToRows.set(item.rowKey, item.$row);
    });

    const assignedRowKeys = new Set<string>();
    const desiredGroupKeys = new Set<string>();
    const insertedHeaderHtmlSamples: string[] = [];
    let movedRowCount = 0;

    cachedLayout.groups.forEach(group => {
      const firstRow = keyToRows.get(group.rowKeys[0] || '');
      if (!firstRow?.length) return;
      const groupKey = group.groupKey;
      desiredGroupKeys.add(groupKey);
      const isCollapsed = collapsedMap.has(groupKey)
        ? !!collapsedMap.get(groupKey)
        : groupKey in persistedCollapsedState
          ? !!persistedCollapsedState[groupKey]
          : !!group.collapsedByDefault;
      collapsedMap.set(groupKey, isCollapsed);

      const $wrapper = $(`<details class="th-qs-group-wrapper" data-th-qs-group-key="${groupKey}"></details>`);
      const enabledCount = group.rowKeys
        .map(key => keyToRows.get(key))
        .filter((row): row is JQuery<HTMLElement> => !!row?.length)
        .filter($row => getPromptEnabledFromManagerRow($row)).length;
      const totalCount = group.rowKeys.filter(key => keyToRows.has(key)).length;
      const $header = $(`
        <summary class="th-qs-group-header ${isCollapsed ? 'is-collapsed' : ''}" data-th-qs-group-key="${groupKey}" aria-expanded="${isCollapsed ? 'false' : 'true'}">
          <span class="pt-entry-group-toggle th-qs-group-caret" aria-hidden="true"><i class="fas fa-chevron-right"></i></span>
          <span class="pt-entry-group-name th-qs-group-title"></span>
          <span class="pt-entry-group-count th-qs-group-count"></span>
        </summary>
      `);
      $header.find('.th-qs-group-title').text(group.groupName);
      $header
        .find('.th-qs-group-count')
        .attr('title', `激活 ${enabledCount} / 总计 ${totalCount}`)
        .text(`${enabledCount}/${totalCount}`);
      insertedHeaderHtmlSamples.push(($header.get(0) as HTMLElement)?.outerHTML || '');
      $wrapper.append($header);
      firstRow.before($wrapper);
      setPromptGroupWrapperCollapsed($wrapper, isCollapsed);
      $wrapper.off('toggle.qsPromptGroupsLocal').on('toggle.qsPromptGroupsLocal', e => {
        if (selfApplying) return;
        const $currentWrapper = $(e.currentTarget as HTMLElement);
        const nextCollapsed = !$currentWrapper.prop('open');
        const currentCollapsed = !!collapsedMap.get(groupKey);
        if (nextCollapsed === currentCollapsed) return;
        collapsedMap.set(groupKey, nextCollapsed);
        persistCollapsedState();
        $header.toggleClass('is-collapsed', nextCollapsed).attr('aria-expanded', nextCollapsed ? 'false' : 'true');
        applyPromptManagerListVisibility();
        $currentWrapper.removeAttr('aria-hidden');
      });

      group.rowKeys.forEach(rowKey => {
        const $row = keyToRows.get(rowKey);
        if (!$row?.length) return;
        assignedRowKeys.add(rowKey);
        $row
          .attr('data-th-qs-group', groupKey)
          .addClass('th-qs-group-item')
          .toggleClass('th-qs-group-item-collapsed', isCollapsed)
          .attr('aria-hidden', isCollapsed ? 'true' : 'false');
        if ($row.parent().get(0) !== $wrapper.get(0)) {
          $wrapper.append($row);
          movedRowCount += 1;
        }
      });
    });

    snapshots.forEach(item => {
      if (assignedRowKeys.has(item.rowKey)) return;
      item.$row
        .removeClass('th-qs-group-item th-qs-group-item-collapsed')
        .removeAttr('data-th-qs-group')
        .removeAttr('aria-hidden');
    });

    pruneCollapsedState(desiredGroupKeys);
    applyPromptManagerListVisibility();
    refreshGroupedHeaderCounts();
    persistCollapsedState();
    lastAppliedSignature = nextSignature;
    lastAppliedDomSignature = buildHealthSignature($list);
    diagLog('after fast restore', {
      insertedHeaders: desiredGroupKeys.size,
      sampleInsertedHeaders: insertedHeaderHtmlSamples.slice(0, 2),
      movedRowCount,
      hasRootClass: $list.hasClass('pt-entry-grouping-root'),
      reason: lastApplyReason,
    });
    return desiredGroupKeys.size > 0;
  };

  const ensureListObserver = () => {
    let changed = false;
    const list = $(PROMPT_MANAGER_LIST_SELECTOR).get(0) as HTMLElement | undefined;
    if (!list) {
      if (listObserver) {
        listObserver.disconnect();
        listObserver = null;
        changed = true;
      }
      if (observedList) {
        observedList = null;
        changed = true;
      }
      if (changed) {
        logQuickSwitchGroupingDebug('list observer detached: list missing');
      }
      return changed;
    }

    if (observedList === list && listObserver) return changed;

    if (listObserver) {
      listObserver.disconnect();
      listObserver = null;
      changed = true;
    }

    observedList = list;
    changed = true;
    logQuickSwitchGroupingDebug('list observer attached', {
      id: list.id,
      className: list.className,
      childCount: list.children.length,
    });
    listObserver = new MutationObserver(mutations => {
      const isGroupingArtifactNode = (node: Node | null | undefined): boolean => {
        if (!node || node.nodeType !== 1) return false;
        const el = node as HTMLElement;
        if (
          el.classList?.contains('th-qs-group-header') ||
          el.classList?.contains('th-qs-group-wrapper') ||
          el.classList?.contains('th-qs-head-tools-row') ||
          el.classList?.contains('th-qs-list-tools') ||
          el.classList?.contains('th-qs-name-tools-host')
        ) {
          return true;
        }
        if (el.matches?.(`${PROMPT_MANAGER_ITEM_SELECTOR}[data-th-qs-group]`)) return true;
        if (typeof el.querySelector === 'function') {
          if (
            el.querySelector(
              '.th-qs-group-header,.th-qs-group-wrapper,.th-qs-head-tools-row,.th-qs-list-tools,.th-qs-name-tools-host',
            )
          ) {
            return true;
          }
          if (el.querySelector(`${PROMPT_MANAGER_ITEM_SELECTOR}[data-th-qs-group]`)) return true;
        }
        return false;
      };

      const meaningfulMutations = mutations.filter(mutation => {
        const target = mutation.target as HTMLElement | null;
        if (!target) return false;
        if (target.closest('.th-qs-group-header, .th-qs-head-tools-row, .th-qs-list-tools')) return false;
        if (target.classList?.contains('th-qs-group-item')) return false;
        if (mutation.type === 'childList') {
          const added = Array.from(mutation.addedNodes || []);
          const removed = Array.from(mutation.removedNodes || []);
          const changedNodes = [...added, ...removed];
          if (changedNodes.length > 0 && changedNodes.every(isGroupingArtifactNode)) {
            return false;
          }
        }
        if (mutation.type === 'attributes') {
          const attr = mutation.attributeName || '';
          if (attr.startsWith('data-th-qs-')) return false;
          if (attr === 'aria-hidden') return false;
        }
        return true;
      });
      if (!meaningfulMutations.length) return;

      const childListMutations = mutations.filter(mutation => mutation.type === 'childList').length;
      const classAttrMutations = mutations.filter(
        mutation => mutation.type === 'attributes' && mutation.attributeName === 'class',
      ).length;
      logQuickSwitchGroupingDebug('list mutation observed', {
        mutationCount: mutations.length,
        childListMutations,
        classAttrMutations,
        selfApplying,
        headerCount: $(PROMPT_MANAGER_LIST_SELECTOR).first().find('.th-qs-group-header').length,
      });

      if (selfApplying) {
        return;
      }
      if (isPromptListDragging()) {
        pendingApplyAfterDrag = true;
        return;
      }
      scheduleApplyGrouping('list-observer:mutations');
    });
    listObserver.observe(list, {
      childList: true,
      subtree: false,
    });

    scheduleApplyGrouping('list-observer:attach');
    return changed;
  };

  $(document).off('click.qsPromptGroups');
  $(document).off('keydown.qsPromptGroups');
  $(document).off('click.qsPromptHeadTools');
  $(document).off('mousedown.qsPromptHeadTools');
  $(document).off('th_qs_prompt_manager_rendered.qsPromptGroupsPmHook');

  $(document).on('mousedown.qsPromptHeadTools', `${PROMPT_MANAGER_LIST_SELECTOR} .th-qs-tool-btn`, e => {
    e.preventDefault();
    e.stopPropagation();
  });

  $(document).on('click.qsPromptHeadTools', `${PROMPT_MANAGER_LIST_SELECTOR} .th-qs-tool-btn`, e => {
    e.preventDefault();
    e.stopPropagation();
    const action = String($(e.currentTarget).attr('data-action') || '');
    if (!action) return;
    if (action === 'th_qs_manage_grouping') return;

    if (action === 'th_qs_expand_all') {
      applyAllGroupsCollapsed(false);
      return;
    }
    if (action === 'th_qs_collapse_all') {
      applyAllGroupsCollapsed(true);
    }
  });

  ensureListObserver();
  applyPromptListSortableDisabled(groupingEnabled);
  installPromptManagerGroupingHook();
  $(document).on('th_qs_prompt_manager_rendered.qsPromptGroupsPmHook', () => {
    scheduleApplyGrouping('pm-hook:makeDraggable');
  });
  listRebindTimer = window.setInterval(() => {
    if (disposed || document.hidden || selfApplying || isPromptListDragging()) return;
    const changed = ensureListObserver();
    if (changed) scheduleApplyGrouping('rebind-timer:list-node-changed');
  }, 3000);

  let countRefreshQueued = false;
  const scheduleRefreshGroupedHeaderCounts = () => {
    if (!groupingEnabled || countRefreshQueued) return;
    countRefreshQueued = true;
    requestAnimationFrame(() => {
      countRefreshQueued = false;
      refreshGroupedHeaderCounts();
    });
  };
  $(document).off('change.qsPromptGroupCounts');
  $(document).on(
    'change.qsPromptGroupCounts',
    `${PROMPT_MANAGER_LIST_SELECTOR} ${PROMPT_MANAGER_ITEM_SELECTOR} input[type="checkbox"]`,
    () => {
      scheduleRefreshGroupedHeaderCounts();
    },
  );
  $(document).off('mousedown.qsPromptToggleAnchor');
  $(document).on(
    'mousedown.qsPromptToggleAnchor',
    `${PROMPT_MANAGER_LIST_SELECTOR} .prompt-manager-toggle-action`,
    e => {
      rowToggleInteractionAt = Date.now();
      rowToggleRegroupConsumedAt = 0;
      pendingViewAnchor = capturePromptListViewAnchor(e.currentTarget as HTMLElement);
      diagLog('row toggle interaction started', {
        rowToggleInteractionAt,
        className: (e.currentTarget as HTMLElement)?.className || '',
      });
    },
  );
  $(document).off('click.qsPromptToggleAnchor');
  $(document).on('click.qsPromptToggleAnchor', `${PROMPT_MANAGER_LIST_SELECTOR} .prompt-manager-toggle-action`, e => {
    if (!pendingViewAnchor) {
      pendingViewAnchor = capturePromptListViewAnchor(e.currentTarget as HTMLElement);
    }
    diagLog('row toggle interaction click', {
      rowToggleInteractionAt,
      hasPendingViewAnchor: !!pendingViewAnchor,
    });
  });

  $(document).off('sortstart.qsPromptGroupsDragGuard');
  $(document).off('sortstop.qsPromptGroupsDragGuard');
  $(document).on('sortstart.qsPromptGroupsDragGuard', PROMPT_MANAGER_LIST_SELECTOR, () => {
    sortingActive = true;
    pendingApplyAfterDrag = true;
  });
  $(document).on('sortstop.qsPromptGroupsDragGuard', PROMPT_MANAGER_LIST_SELECTOR, () => {
    sortingActive = false;
    window.setTimeout(() => {
      flushPendingApplyAfterDrag();
      if (!groupingEnabled) {
        recordFlatOrderFromManager();
      }
    }, 40);
  });

  $(document).off('mouseup.qsPromptGroupsDragGuard');
  $(document).off('touchend.qsPromptGroupsDragGuard');
  $(document).on('mouseup.qsPromptGroupsDragGuard', () => {
    window.setTimeout(() => {
      flushPendingApplyAfterDrag();
    }, 40);
  });
  $(document).on('touchend.qsPromptGroupsDragGuard', () => {
    window.setTimeout(() => {
      flushPendingApplyAfterDrag();
    }, 40);
  });

  return () => {
    disposed = true;
    if (listObserver) {
      listObserver.disconnect();
      listObserver = null;
    }
    if (renderDelayTimer != null) {
      clearTimeout(renderDelayTimer);
      renderDelayTimer = null;
    }
    if (attachSettleTimer != null) {
      clearTimeout(attachSettleTimer);
      attachSettleTimer = null;
    }
    stopLoadingObserver();
    if (listRebindTimer != null) {
      clearInterval(listRebindTimer);
      listRebindTimer = null;
    }
    $(document).off('click.qsPromptGroups');
    $(document).off('keydown.qsPromptGroups');
    $(document).off('sortstart.qsPromptGroupsDragGuard');
    $(document).off('sortstop.qsPromptGroupsDragGuard');
    $(document).off('mouseup.qsPromptGroupsDragGuard');
    $(document).off('touchend.qsPromptGroupsDragGuard');
    $(document).off('click.qsPromptHeadTools');
    $(document).off('mousedown.qsPromptHeadTools');
    $(document).off('th_qs_prompt_manager_rendered.qsPromptGroupsPmHook');
    $(document).off('change.qsPromptGroupCounts');
    $(document).off('mousedown.qsPromptToggleAnchor');
    $(document).off('click.qsPromptToggleAnchor');
    const $list = $(PROMPT_MANAGER_LIST_SELECTOR).first();
    applyPromptListSortableDisabled(false);
    stripGroupingArtifacts();
    $list.find('.th-qs-list-tools').remove();
    $list.find('li.th-qs-head-tools-row').remove();
    lastAppliedSignature = '';
    lastAppliedDomSignature = '';
    logQuickSwitchGroupingDebug('setup disposed');
  };
}

function collectBuiltinMatchedEntries(
  prompts: any[],
  rules: any[],
  displayRules: any[] | null,
  resolveRuleTargetForPrompt: (prompt: any, rules: any[]) => boolean | null,
) {
  const candidateRules = displayRules && displayRules.length ? displayRules : rules;
  const candidateMatched = prompts
    .map((prompt: any) => {
      const candidateMatchedTarget = resolveRuleTargetForPrompt(prompt, candidateRules);
      if (candidateMatchedTarget === null) return null;
      const targetEnabledFromRules = resolveRuleTargetForPrompt(prompt, rules);
      const targetEnabledFromDisplay = displayRules?.length ? resolveRuleTargetForPrompt(prompt, displayRules) : null;
      return {
        promptId: String(prompt.id),
        promptName: String(prompt.name || String(prompt.id)),
        targetEnabled: targetEnabledFromRules ?? targetEnabledFromDisplay ?? true,
        currentEnabled: !!prompt.enabled,
      };
    })
    .filter(Boolean) as Array<{
    promptId: string;
    promptName: string;
    targetEnabled: boolean;
    currentEnabled: boolean;
  }>;

  return candidateMatched;
}

function collectBuiltinHiddenForcedRules(
  prompts: any[],
  rules: any[],
  visibleEntries: Array<{ promptId: string; promptName: string; targetEnabled: boolean }>,
  resolveRuleTargetForPrompt: (prompt: any, rules: any[]) => boolean | null,
) {
  const visibleSet = new Set(visibleEntries.map(item => item.promptId));
  const forcedRules: Array<{ promptId: string; enabled: boolean }> = [];

  prompts.forEach((prompt: any) => {
    const promptId = String(prompt.id);
    if (visibleSet.has(promptId)) return;
    const targetEnabled = resolveRuleTargetForPrompt(prompt, rules);
    if (targetEnabled === null) return;
    forcedRules.push({ promptId, enabled: targetEnabled });
  });

  return forcedRules;
}

interface CustomizePromptEntry {
  promptId: string;
  displayName: string;
  currentEnabled: boolean;
}

interface CustomizePromptSection {
  majorName: string | null;
  majorDescription?: string;
  name: string;
  description?: string;
  items: CustomizePromptEntry[];
}

function collectCustomizePromptSections(prompts: any[], config: any): CustomizePromptSection[] {
  const majorPattern = /^✧\s*[─-]\s*(.+?)\s*[─-]\s*✧$/u;
  const defaultSectionPattern = /^[✶＊*★☆]\s*·\s*(.+?)\s*·\s*[✶＊*★☆]$/u;
  let sectionPattern = defaultSectionPattern;
  if (config?.sectionPattern) {
    try {
      sectionPattern = new RegExp(String(config.sectionPattern), 'u');
    } catch (error) {
      console.warn('预设助手: customize.sectionPattern 无效，已使用默认分区格式', error);
    }
  }

  const allowedSections = new Set(
    (config?.sectionNames || []).map((name: unknown) => String(name).trim()).filter(Boolean),
  );
  const itemPrefixes = (config?.itemPrefixes || []).map((prefix: unknown) => String(prefix)).filter(Boolean);
  const itemSuffixes = (config?.itemSuffixes || []).map((suffix: unknown) => String(suffix)).filter(Boolean);
  const includeBeforeFirstSection = !!config?.includeBeforeFirstSection;
  const sections = new Map<string, CustomizePromptSection>();
  let currentMajor: string | null = null;
  let currentSection = includeBeforeFirstSection ? '其他' : '';

  prompts.forEach(prompt => {
    const promptName = String(prompt?.name || prompt?.id || '').trim();
    majorPattern.lastIndex = 0;
    const majorMatch = majorPattern.exec(promptName);
    if (majorMatch) {
      currentMajor = String(majorMatch[1] || '').trim() || null;
      currentSection = '';
      return;
    }
    sectionPattern.lastIndex = 0;
    const sectionMatch = sectionPattern.exec(promptName);
    if (sectionMatch) {
      currentSection = String(sectionMatch[1] || '').trim();
      return;
    }
    if (!currentMajor && !currentSection) return;
    if (allowedSections.size > 0 && !allowedSections.has(currentMajor || '') && !allowedSections.has(currentSection)) {
      return;
    }

    let displayName = promptName;
    if (itemPrefixes.length > 0) {
      const matchedPrefix = itemPrefixes.find((prefix: string) => displayName.startsWith(prefix));
      if (!matchedPrefix) return;
      displayName = displayName.slice(matchedPrefix.length).trim();
    }
    if (itemSuffixes.length > 0) {
      const matchedSuffix = itemSuffixes.find((suffix: string) => displayName.endsWith(suffix));
      if (matchedSuffix) displayName = displayName.slice(0, -matchedSuffix.length).trim();
    }
    const promptId = String(prompt?.id || '').trim();
    if (!promptId || !displayName) return;
    const sectionKey = `${currentMajor || ''}\u001f${currentSection}`;
    if (!sections.has(sectionKey)) {
      sections.set(sectionKey, {
        majorName: currentMajor,
        majorDescription: currentMajor ? config?.sectionDescriptions?.[currentMajor] : undefined,
        name: currentSection,
        description: currentSection ? config?.sectionDescriptions?.[currentSection] : undefined,
        items: [],
      });
    }
    sections.get(sectionKey)!.items.push({
      promptId,
      displayName,
      currentEnabled: !!prompt?.enabled,
    });
  });

  return Array.from(sections.values()).filter(section => section.items.length > 0);
}

async function openGroupedCustomizeDialog(params: {
  panel: JQuery<HTMLElement>;
  switchName: string;
  sections: CustomizePromptSection[];
}) {
  return await new Promise<string[] | null>(resolve => {
    const dialogId = 'qr-grouped-customize-dialog';
    $(`#${dialogId}`).remove();

    const majorGroups = new Map<
      string,
      { name: string | null; description?: string; sections: CustomizePromptSection[] }
    >();
    params.sections.forEach(section => {
      const key = section.majorName || '__ungrouped__';
      if (!majorGroups.has(key)) {
        majorGroups.set(key, { name: section.majorName, description: section.majorDescription, sections: [] });
      }
      majorGroups.get(key)!.sections.push(section);
    });
    const sectionsHtml = Array.from(majorGroups.values())
      .map(
        major => `
          <section class="qs-customize-major ${major.name ? '' : 'is-ungrouped'}">
            ${major.name ? `<div class="qs-customize-major-title">${escapeQuickSwitchHtml(major.name)}</div>` : ''}
            ${major.description ? `<div class="qs-customize-major-description">${escapeQuickSwitchHtml(major.description)}</div>` : ''}
            ${major.sections
              .map(
                section => `
          <div class="qs-customize-section ${section.name ? '' : 'is-direct'}">
            ${section.name ? `<div class="qs-customize-section-title">${escapeQuickSwitchHtml(section.name)}</div>` : ''}
            ${section.description ? `<div class="qs-customize-section-description">${escapeQuickSwitchHtml(section.description)}</div>` : ''}
            <div class="qs-customize-choice-grid">
              ${section.items
                .map(
                  item => `
                    <button type="button" class="qs-customize-choice ${item.currentEnabled ? 'is-on' : ''}" data-prompt-id="${escapeQuickSwitchHtml(item.promptId)}" aria-pressed="${item.currentEnabled ? 'true' : 'false'}">
                      ${escapeQuickSwitchHtml(item.displayName)}
                    </button>
                  `,
                )
                .join('')}
            </div>
          </div>
        `,
              )
              .join('')}
          </section>
        `,
      )
      .join('');

    const $dialog = $(`
      <div id="${dialogId}" class="qs-builder-overlay">
        <div class="control-panel qs-builder-panel qs-sub-panel qs-customize-panel">
          <header class="panel-header">
            <div></div>
            <div class="header-title">${escapeQuickSwitchHtml(params.switchName)} 定制</div>
            <button class="close-button" data-action="close_qs_customize"><i class="fas fa-times"></i></button>
          </header>
          <div class="panel-content">
            <div class="qs-builder-hint">点击子条目切换状态，确认后立即同步到当前预设。</div>
            <div class="qs-builder-actions">
              <button type="button" class="qs-mini-btn" data-action="qs_customize_select_all">全选</button>
              <button type="button" class="qs-mini-btn" data-action="qs_customize_clear_all">清空</button>
            </div>
            <div class="qs-customize-section-list">${sectionsHtml}</div>
            <div class="qs-builder-footer">
              <button type="button" class="qs-cancel-btn" data-action="close_qs_customize">取消</button>
              <button type="button" class="qs-save-btn" data-action="save_qs_customize">确认</button>
            </div>
          </div>
        </div>
      </div>
    `);

    const closeDialog = (result: string[] | null) => {
      $(document).off('mousedown.qsGroupedCustomize');
      $dialog.remove();
      resolve(result);
    };
    const setChoice = ($choice: JQuery<HTMLElement>, enabled: boolean) => {
      $choice.toggleClass('is-on', enabled).attr('aria-pressed', enabled ? 'true' : 'false');
    };

    $dialog.on('click', '.qs-customize-choice', e => {
      const $choice = $(e.currentTarget);
      setChoice($choice, !$choice.hasClass('is-on'));
    });
    $dialog.on('click', '[data-action="qs_customize_select_all"]', () => {
      $dialog.find('.qs-customize-choice').each((_, element) => setChoice($(element), true));
    });
    $dialog.on('click', '[data-action="qs_customize_clear_all"]', () => {
      $dialog.find('.qs-customize-choice').each((_, element) => setChoice($(element), false));
    });
    $dialog.on('click', '[data-action="close_qs_customize"]', () => closeDialog(null));
    $dialog.on('click', '[data-action="save_qs_customize"]', () => {
      const selectedIds = $dialog
        .find('.qs-customize-choice.is-on')
        .map((_, element) => String($(element).attr('data-prompt-id') || ''))
        .get()
        .filter(Boolean);
      closeDialog(selectedIds);
    });
    $(document).on('mousedown.qsGroupedCustomize', e => {
      if ($dialog.length && !$(e.target).closest('.qs-customize-panel').length) closeDialog(null);
    });

    mountDialogWithThemeAndDrag(params.panel, $dialog, '.qs-customize-panel', true);
  });
}

async function openBuiltinSubselectDialog(params: {
  panel: JQuery<HTMLElement>;
  switchName: string;
  matchedEntries: Array<{
    promptId: string;
    promptName: string;
    targetEnabled: boolean;
    currentEnabled: boolean;
  }>;
  runtimeState: any;
  defaultSelection: 'all' | 'none' | 'remember';
  useDisplayRulesDefaults?: boolean;
  allowPrefillChoice?: boolean;
}) {
  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const { panel, switchName, matchedEntries, runtimeState, allowPrefillChoice = false } = params;

  const defaultActiveIds = matchedEntries.filter(item => item.targetEnabled).map(item => item.promptId);
  const currentActiveIds = matchedEntries.filter(item => item.currentEnabled).map(item => item.promptId);
  const rememberedActiveIds = Array.isArray(runtimeState?.selectedPromptIds)
    ? runtimeState.selectedPromptIds.filter((id: string) => matchedEntries.some(item => item.promptId === id))
    : [];
  const hasRememberedSelection = rememberedActiveIds.length > 0;

  return new Promise<string[] | null>(resolve => {
    const dialogId = 'qr-builtin-subselect-dialog';
    $(`#${dialogId}`).remove();

    // 定制页首次打开必须忠实反映当前预设；系统默认和记忆值仅通过按钮主动套用。
    const selectedSet = new Set<string>(currentActiveIds);

    const safeSwitchName = escapeHtml(String(switchName || ''));
    const sourceSelectButtons = allowPrefillChoice
      ? `
        <button type="button" class="qs-mini-btn" data-action="qs_sub_use_remember" ${hasRememberedSelection ? '' : 'disabled title="暂无记忆选择"'}>使用记忆</button>
        <button type="button" class="qs-mini-btn" data-action="qs_sub_use_default">使用系统默认</button>
      `
      : '';

    const rowsHtml = matchedEntries
      .map(item => {
        const checked = selectedSet.has(item.promptId) ? 'checked' : '';
        const activeText = selectedSet.has(item.promptId) ? '当前激活' : '不激活';
        const activeClass = selectedSet.has(item.promptId) ? 'is-on' : '';
        const safePromptId = escapeHtml(String(item.promptId || ''));
        const safePromptName = escapeHtml(String(item.promptName || item.promptId || ''));
        return `
          <div class="qs-sub-row" data-prompt-id="${safePromptId}">
            <label class="qs-sub-check-wrap" aria-label="选择 ${safePromptName}">
              <input type="checkbox" class="qs-sub-check" ${checked}>
              <span class="qs-sub-dot"></span>
            </label>
            <div class="qs-sub-labels">
              <div class="qs-sub-name">${safePromptName}</div>
              <div class="qs-sub-id">${safePromptId}</div>
            </div>
            <button type="button" class="qs-sub-target ${activeClass}">${activeText}</button>
          </div>
        `;
      })
      .join('');

    const $dialog = $(`
      <div id="${dialogId}" class="qs-builder-overlay">
        <div class="control-panel qs-builder-panel qs-sub-panel">
          <header class="panel-header">
            <div></div>
            <div class="header-title">${safeSwitchName} 定制</div>
            <button class="close-button" data-action="close_qs_sub"><i class="fas fa-times"></i></button>
          </header>
          <div class="panel-content">
            <div class="qs-builder-hint">勾选本次要应用的子项（可多选）。未勾选即视为不激活（关闭）。</div>
            <div class="qs-builder-actions">
              ${sourceSelectButtons}
              <button type="button" class="qs-mini-btn" data-action="qs_sub_select_all">全选</button>
              <button type="button" class="qs-mini-btn" data-action="qs_sub_clear_all">清空</button>
            </div>
            <div class="qs-sub-list">${rowsHtml}</div>
            <div class="qs-builder-footer">
              <button type="button" class="qs-cancel-btn" data-action="close_qs_sub">取消</button>
              <button type="button" class="qs-save-btn" data-action="save_qs_sub">确认</button>
            </div>
          </div>
        </div>
      </div>
    `);

    const closeDialog = (resultData: string[] | null) => {
      $(document).off('mousedown.qsSubSelect');
      $dialog.remove();
      resolve(resultData);
    };

    const applySelection = (ids: string[]) => {
      const applySet = new Set(ids);
      $dialog.find('.qs-sub-row').each((_, rowEl) => {
        const $row = $(rowEl);
        const promptId = String($row.attr('data-prompt-id') || '');
        const checked = applySet.has(promptId);
        $row.find('.qs-sub-check').prop('checked', checked);
        $row
          .find('.qs-sub-target')
          .toggleClass('is-on', checked)
          .text(checked ? '当前激活' : '不激活');
      });
    };

    $dialog.on('click', 'button[data-action="qs_sub_use_remember"]', () => {
      if (!hasRememberedSelection) return;
      applySelection(rememberedActiveIds);
    });

    $dialog.on('click', 'button[data-action="qs_sub_use_default"]', () => {
      applySelection(defaultActiveIds);
    });

    $dialog.on('click', 'button[data-action="qs_sub_select_all"]', () => {
      $dialog.find('.qs-sub-check').prop('checked', true);
      $dialog.find('.qs-sub-target').addClass('is-on').text('当前激活');
    });

    $dialog.on('click', 'button[data-action="qs_sub_clear_all"]', () => {
      $dialog.find('.qs-sub-check').prop('checked', false);
      $dialog.find('.qs-sub-target').removeClass('is-on').text('不激活');
    });

    $dialog.on('change', '.qs-sub-check', e => {
      const $check = $(e.currentTarget);
      const checked = !!$check.prop('checked');
      const $target = $check.closest('.qs-sub-row').find('.qs-sub-target');
      $target.toggleClass('is-on', checked).text(checked ? '当前激活' : '不激活');
    });

    $dialog.on('click', '.qs-sub-target', e => {
      const $check = $(e.currentTarget).closest('.qs-sub-row').find('.qs-sub-check');
      $check.prop('checked', !$check.prop('checked')).trigger('change');
    });

    $dialog.on('click', 'button[data-action="close_qs_sub"]', () => closeDialog(null));

    $dialog.on('click', 'button[data-action="save_qs_sub"]', () => {
      const ids: string[] = [];
      $dialog.find('.qs-sub-row').each((_, rowEl) => {
        const $row = $(rowEl);
        const checked = $row.find('.qs-sub-check').prop('checked');
        if (!checked) return;
        const promptId = String($row.attr('data-prompt-id') || '').trim();
        if (promptId) ids.push(promptId);
      });

      closeDialog(ids);
    });

    $(document).on('mousedown.qsSubSelect', e => {
      if ($dialog.length && !$(e.target).closest('.qs-sub-panel').length) {
        closeDialog(null);
      }
    });

    mountDialogWithThemeAndDrag(panel, $dialog, '.qs-sub-panel', true);
  });
}

async function openCustomQuickSwitchEditor(params: {
  panel: JQuery<HTMLElement>;
  profile: {
    name: string;
    rules: any[];
    scope?: 'global' | 'character';
    characterIds?: string[];
    characterId?: string;
  };
  prompts: PresetPrompt[];
  resolveRuleTargetForPrompt: (prompt: PresetPrompt, rules: any[]) => boolean | null;
}) {
  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  return await new Promise<{
    name: string;
    rules: Array<{ promptId: string; enabled: boolean }>;
    scope: 'global' | 'character';
    characterIds: string[];
  } | null>(resolve => {
    const dialogId = 'qr-custom-switch-editor';
    $(`#${dialogId}`).remove();
    const existingCharacterIds = Array.from(
      new Set(
        [...(Array.isArray(params.profile.characterIds) ? params.profile.characterIds : []), params.profile.characterId]
          .filter(characterId => characterId !== null && characterId !== undefined && characterId !== '')
          .map(String),
      ),
    );

    const rowsHtml = params.prompts
      .map(prompt => {
        const promptId = String(prompt.id);
        const promptName = String(prompt.name || promptId);
        const targetEnabled = params.resolveRuleTargetForPrompt(prompt, params.profile.rules || []);
        if (targetEnabled === null) return '';
        const enabled = !!prompt.enabled;
        return `
          <div class="qs-builder-row" data-prompt-id="${escapeHtml(promptId)}" data-search="${escapeHtml(`${promptName} ${promptId}`.toLowerCase())}">
            <label class="qs-builder-check-wrap">
              <input type="checkbox" class="qs-builder-check" checked>
              <span class="qs-builder-check-dot"></span>
            </label>
            <div class="qs-builder-labels">
              <div class="qs-builder-name">${escapeHtml(promptName)}</div>
              <div class="qs-builder-id">${escapeHtml(promptId)}</div>
            </div>
            <button type="button" class="qs-builder-state ${enabled ? 'is-on' : ''}" data-enabled="${enabled ? 'true' : 'false'}">${enabled ? '开启' : '关闭'}</button>
          </div>
        `;
      })
      .join('');

    const $dialog = $(`
      <div id="${dialogId}" class="qs-builder-overlay">
        <div class="control-panel qs-builder-panel qs-custom-editor-panel">
          <header class="panel-header">
            <div></div>
            <div class="header-title">定制快捷开关</div>
            <button class="close-button" data-action="close_custom_qs_editor"><i class="fas fa-times"></i></button>
          </header>
          <div class="panel-content">
            <div class="qs-builder-top">
              <label for="custom-qs-name">开关名称</label>
              <input id="custom-qs-name" class="input-full-width qs-builder-name-input" value="${escapeHtml(String(params.profile.name || ''))}">
              <label for="custom-qs-scope">使用范围</label>
              <select id="custom-qs-scope" class="input-full-width qs-builder-name-input">
                <option value="global" ${params.profile.scope !== 'character' ? 'selected' : ''}>全局使用</option>
                <option value="character" ${params.profile.scope === 'character' ? 'selected' : ''}>绑定角色卡</option>
              </select>
              <div class="qs-character-bind-field" ${params.profile.scope === 'character' ? '' : 'style="display:none;"'}>
                ${buildCharacterBindingPanel(existingCharacterIds)}
              </div>
              <label for="custom-qs-search">搜索条目</label>
              <div class="qs-builder-search-wrap">
                <i class="fas fa-search"></i>
                <input id="custom-qs-search" class="input-full-width qs-builder-search-input" placeholder="输入名称或 ID 筛选条目">
                <button type="button" class="qs-builder-search-clear" aria-label="清空搜索"><i class="fas fa-times"></i></button>
              </div>
              <div class="qs-builder-hint">这里只显示该快捷开关已经保存的条目；取消勾选可从快捷开关中移除。</div>
            </div>
            <div class="qs-builder-actions">
              <button type="button" class="qs-mini-btn" data-action="custom_qs_select_all">全选可见</button>
              <button type="button" class="qs-mini-btn" data-action="custom_qs_clear_all">清空可见</button>
            </div>
            <div class="qs-builder-list">${rowsHtml}</div>
            <div class="qs-builder-footer">
              <button type="button" class="qs-cancel-btn" data-action="close_custom_qs_editor">取消</button>
              <button type="button" class="qs-save-btn" data-action="save_custom_qs_editor">保存修改</button>
            </div>
          </div>
        </div>
      </div>
    `);
    let customFilterTimer: number | null = null;

    const closeEditor = (
      result: {
        name: string;
        rules: Array<{ promptId: string; enabled: boolean }>;
        scope: 'global' | 'character';
        characterIds: string[];
      } | null,
    ) => {
      $(document).off('mousedown.qsCustomEditor');
      if (customFilterTimer !== null) {
        window.clearTimeout(customFilterTimer);
        customFilterTimer = null;
      }
      $dialog.remove();
      resolve(result);
    };

    const applyFilter = () => {
      const dialogElement = $dialog.get(0);
      if (!dialogElement) return;
      const input = dialogElement.querySelector<HTMLInputElement>('#custom-qs-search');
      const keyword = String(input?.value || '')
        .trim()
        .toLowerCase();
      dialogElement.querySelectorAll<HTMLElement>('.qs-builder-row').forEach(rowElement => {
        rowElement.classList.toggle(
          'is-filter-hidden',
          !!keyword && !String(rowElement.dataset.search || '').includes(keyword),
        );
      });
      $dialog.find('.qs-builder-search-wrap').toggleClass('has-value', !!keyword);
    };
    const scheduleFilter = () => {
      if (customFilterTimer !== null) window.clearTimeout(customFilterTimer);
      customFilterTimer = window.setTimeout(() => {
        customFilterTimer = null;
        applyFilter();
      }, 55);
    };

    $dialog.on('input', '#custom-qs-search', scheduleFilter);
    $dialog.on('change', '#custom-qs-scope', () => {
      $dialog.find('.qs-character-bind-field').toggle($dialog.find('#custom-qs-scope').val() === 'character');
    });
    bindCharacterBindingPanelEvents($dialog);
    $dialog.on('click', '.qs-builder-search-clear', () => {
      $dialog.find('#custom-qs-search').val('').trigger('focus');
      if (customFilterTimer !== null) {
        window.clearTimeout(customFilterTimer);
        customFilterTimer = null;
      }
      applyFilter();
    });
    $dialog.on('click', '.qs-builder-state', e => {
      const $button = $(e.currentTarget);
      const enabled = $button.attr('data-enabled') !== 'true';
      $button.attr('data-enabled', enabled ? 'true' : 'false').toggleClass('is-on', enabled);
      $button.text(enabled ? '开启' : '关闭');
    });
    $dialog.on('click', 'button[data-action="custom_qs_select_all"]', () => {
      $dialog.find('.qs-builder-row:visible .qs-builder-check').prop('checked', true);
    });
    $dialog.on('click', 'button[data-action="custom_qs_clear_all"]', () => {
      $dialog.find('.qs-builder-row:visible .qs-builder-check').prop('checked', false);
    });
    $dialog.on('click', 'button[data-action="close_custom_qs_editor"]', () => closeEditor(null));
    $dialog.on('click', 'button[data-action="save_custom_qs_editor"]', () => {
      const name = String($dialog.find('#custom-qs-name').val() || '').trim();
      if (!name) {
        toastr.warning('请填写快捷开关名称');
        return;
      }
      const rules: Array<{ promptId: string; enabled: boolean }> = [];
      $dialog.find('.qs-builder-row').each((_, rowEl) => {
        const $row = $(rowEl);
        if (!$row.find('.qs-builder-check').prop('checked')) return;
        const promptId = String($row.attr('data-prompt-id') || '').trim();
        if (!promptId) return;
        rules.push({
          promptId,
          enabled: $row.find('.qs-builder-state').attr('data-enabled') === 'true',
        });
      });
      if (!rules.length) {
        toastr.warning('请至少选择一个条目');
        return;
      }
      const scope = String($dialog.find('#custom-qs-scope').val() || 'global') as 'global' | 'character';
      const characterIds = $dialog
        .find('.qs-character-bind-check:checked')
        .map((_, checkbox) => String($(checkbox).closest('.qs-character-bind-row').attr('data-character-id') || ''))
        .get()
        .filter(Boolean);
      if (scope === 'character' && !characterIds.length) {
        toastr.warning('请至少选择一张要绑定的角色卡');
        return;
      }
      closeEditor({
        name,
        rules,
        scope,
        characterIds: scope === 'character' ? characterIds : [],
      });
    });
    $(document).on('mousedown.qsCustomEditor', e => {
      if ($dialog.length && !$(e.target).closest('.qs-custom-editor-panel').length) closeEditor(null);
    });

    mountDialogWithThemeAndDrag(params.panel, $dialog, '.qs-custom-editor-panel', true);
  });
}

interface HandleAiModeChangeDeps {
  editingPresetId: string | null;
  storage: any;
  getCharacterId: () => string;
  getPreset: (name: string) => Preset;
  calculateNewPrompts: (
    currentPrompts: any[],
    mode: 'special' | 'conventional',
    style?: 'conventional' | 'minimalist',
  ) => any[];
  getPanel: () => JQuery<HTMLElement> | null;
  getStyleTag: () => JQuery<HTMLElement> | null;
  applyDialogTheme: ($dialog: JQuery<HTMLElement>) => void;
  setTempThinkingStyle: (value: 'conventional' | 'minimalist') => void;
  getTempThinkingStyle: () => 'conventional' | 'minimalist' | null;
  setStagedPrompts: (prompts: any[]) => void;
}

export async function handleAiModeChange(mode: string, deps: HandleAiModeChangeDeps) {
  if (!deps.editingPresetId) return;
  const charId = deps.getCharacterId();
  const currentBound = deps.storage.bindings[charId];
  const isEditingActive =
    (currentBound && currentBound === deps.editingPresetId) ||
    (!currentBound && deps.storage.globalPresetId === deps.editingPresetId);

  if (isEditingActive) {
    try {
      const currentPreset = deps.getPreset('in_use');
      if (!currentPreset || !currentPreset.prompts) return;

      let newPrompts;
      if (['dialogue', 'outline', 'summary'].includes(mode)) {
        newPrompts = deps.calculateNewPrompts(currentPreset.prompts, 'special');
        toastr.info('已切换至特殊模式，点击保存后生效');
      } else {
        deps.setTempThinkingStyle('conventional');
        newPrompts = deps.calculateNewPrompts(currentPreset.prompts, 'conventional', deps.getTempThinkingStyle()!);
        toastr.info('已切换至常规模式，点击保存后生效');
      }

      deps.setStagedPrompts(newPrompts);
    } catch (e) {
      console.error('预设助手：切换预设模式失败', e);
    }
  } else if (!['dialogue', 'outline', 'summary'].includes(mode)) {
    deps.setTempThinkingStyle('conventional');
  }
}

type CustomQuickRequestView = {
  id: string;
  name: string;
  command: string;
  createTime: number;
  updateTime: number;
};

function escapeQuickRequestHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function hydrateQuickRequestButtons(
  panel: JQuery<HTMLElement>,
  quickRequestActions: { [key: string]: string },
  customRequests: CustomQuickRequestView[] = [],
) {
  panel.find('.quick-request-builtin-grid button').each(function () {
    const buttonText = $(this).clone().children().remove().end().text().trim();
    if (!$(this).data('action')) {
      const actionKey = `qr_${buttonText}`;
      if (quickRequestActions[actionKey]) {
        $(this).attr('data-action', actionKey);
      } else if (buttonText === '自定义') {
        $(this).attr('data-action', 'custom_request');
      }
    }
  });

  const customList = panel.find('#custom-quick-requests-list');
  customList.empty();
  if (customRequests.length === 0) {
    customList.append('<div class="custom-quick-request-empty">还没有自定义指令，点击下方按钮新增。</div>');
    return;
  }
  customList.append(
    customRequests
      .map(
        item => `
          <div class="custom-quick-request-row" data-id="${escapeQuickRequestHtml(item.id)}">
            <button class="custom-quick-request-run" data-action="run_custom_quick_request" data-id="${escapeQuickRequestHtml(item.id)}" title="${escapeQuickRequestHtml(item.command)}">
              <i class="fas fa-bolt"></i><span>${escapeQuickRequestHtml(item.name)}</span>
            </button>
            <button class="custom-quick-request-icon" data-action="edit_custom_quick_request" data-id="${escapeQuickRequestHtml(item.id)}" title="编辑"><i class="fas fa-pen"></i></button>
            <button class="custom-quick-request-icon is-delete" data-action="delete_custom_quick_request" data-id="${escapeQuickRequestHtml(item.id)}" title="删除"><i class="fas fa-trash-alt"></i></button>
          </div>
        `,
      )
      .join(''),
  );
}

function showCustomQuickRequestEditor(panel: JQuery<HTMLElement>, existing?: CustomQuickRequestView) {
  return new Promise<{ name: string; command: string } | null>(resolve => {
    const dialogId = 'custom-quick-request-editor';
    $(`#${dialogId}`).remove();
    const $dialog = $(`
      <div id="${dialogId}" class="custom-quick-request-overlay">
        <div class="custom-quick-request-dialog">
          <div class="custom-quick-request-dialog-title">${existing ? '编辑自定义指令' : '新增自定义指令'}</div>
          <label for="custom-quick-request-name">名称</label>
          <input id="custom-quick-request-name" maxlength="60" placeholder="例如：加强环境描写" value="${escapeQuickRequestHtml(existing?.name || '')}">
          <label for="custom-quick-request-command">命令内容</label>
          <textarea id="custom-quick-request-command" rows="8" placeholder="输入要追加到发送框的完整指令；可用 {userOrder} 插入每次执行时填写的补充要求。">${escapeQuickRequestHtml(existing?.command || '<!-- Request: {userOrder} -->')}</textarea>
          <div class="custom-quick-request-dialog-hint">执行时仍会询问一次可选补充内容；需要插入的位置请写 {userOrder}。</div>
          <div class="custom-quick-request-dialog-actions">
            <button type="button" class="custom-quick-request-cancel">取消</button>
            <button type="button" class="custom-quick-request-save">保存</button>
          </div>
        </div>
      </div>
    `);

    const $dialogPanel = $dialog.find('.custom-quick-request-dialog').first();
    const { ownerWindow } = getViewportContext($dialogPanel);
    let layoutFrame: number | undefined;
    const syncDialogLayout = () => {
      if (!$dialogPanel[0]?.isConnected) return;
      const { width, height } = getViewportSize($dialogPanel);
      const availableWidth = Math.max(1, width - 32);
      const availableHeight = Math.max(1, height - 32);
      $dialogPanel.css({
        width: `${Math.min(520, availableWidth)}px`,
        maxWidth: `${availableWidth}px`,
        maxHeight: `${availableHeight}px`,
      });
      centerFloatingDialog($dialogPanel);
    };
    const scheduleDialogLayout = () => {
      if (layoutFrame !== undefined) ownerWindow.cancelAnimationFrame(layoutFrame);
      layoutFrame = ownerWindow.requestAnimationFrame(() => {
        layoutFrame = undefined;
        syncDialogLayout();
      });
    };

    ownerWindow.addEventListener('resize', scheduleDialogLayout);
    ownerWindow.visualViewport?.addEventListener('resize', scheduleDialogLayout);
    ownerWindow.visualViewport?.addEventListener('scroll', scheduleDialogLayout);

    const close = (value: { name: string; command: string } | null) => {
      if (layoutFrame !== undefined) ownerWindow.cancelAnimationFrame(layoutFrame);
      ownerWindow.removeEventListener('resize', scheduleDialogLayout);
      ownerWindow.visualViewport?.removeEventListener('resize', scheduleDialogLayout);
      ownerWindow.visualViewport?.removeEventListener('scroll', scheduleDialogLayout);
      $dialog.remove();
      resolve(value);
    };
    $dialog.on('click', '.custom-quick-request-cancel', () => close(null));
    $dialog.on('click', '.custom-quick-request-save', () => {
      const name = String($dialog.find('#custom-quick-request-name').val() || '').trim();
      const command = String($dialog.find('#custom-quick-request-command').val() || '').trim();
      if (!name || !command) {
        toastr.warning('名称和命令内容都不能为空。');
        return;
      }
      close({ name, command });
    });
    $dialog.on('mousedown', e => {
      if (e.target === $dialog[0]) close(null);
    });

    mountDialogWithThemeAndDrag(panel, $dialog, '.custom-quick-request-dialog');
    syncDialogLayout();

    // 手机端自动聚焦会弹出软键盘并平移可视视口，造成弹窗刚打开就偏离中心。
    if (ownerWindow.matchMedia('(pointer: fine)').matches && getViewportSize($dialogPanel).width > 768) {
      $dialog.find('#custom-quick-request-name').trigger('focus');
    }
  });
}

interface BindNavDeps {
  panel: JQuery<HTMLElement>;
  quickRequestActions: { [key: string]: string };
  getCustomQuickRequests: () => CustomQuickRequestView[];
  renderStatusDisplay: () => Promise<void>;
  renderPresetsList: () => Promise<void>;
  setEditingPresetId: (id: string | null) => void;
}

export function bindPanelNavigation(deps: BindNavDeps) {
  const { panel } = deps;
  panel.find('button[data-panel]').on('click', (e: JQuery.ClickEvent) => {
    const panelId = $(e.currentTarget).data('panel');
    if (panelId === 'requests') {
      hydrateQuickRequestButtons(panel, deps.quickRequestActions, deps.getCustomQuickRequests());
    }
    panel.find('.control-panel').addClass('show-child').removeClass('show-editor');
    panel.find(`.panel-child[data-panel-id="${panelId}"]`).addClass('active');
  });

  panel.find('.back-button').on('click', () => {
    panel.find('.control-panel').removeClass('show-child show-editor');
    panel.find('.panel-child').removeClass('active');
    deps.renderStatusDisplay();
  });

  panel.find('.back-to-presets').on('click', () => {
    panel.find('.control-panel').removeClass('show-editor');
    deps.setEditingPresetId(null);
    deps.renderPresetsList();
  });
}

interface BindWordCountPresetDeps {
  panel: JQuery<HTMLElement>;
  getEditingPresetId: () => string | null;
  storage: any;
}

export function bindWordCountPresetHandler(deps: BindWordCountPresetDeps) {
  const { panel } = deps;
  panel.on('click', 'button[data-wc-preset]', async (e: JQuery.ClickEvent) => {
    const presetType = $(e.currentTarget).data('wc-preset');
    const editingPresetId = deps.getEditingPresetId();
    if (!editingPresetId) return;
    const defs = deps.storage.presets[editingPresetId].lengthDefinitions;

    let targetWc;
    let targetPc;
    if (presetType === 'short') {
      targetWc = defs.short.wc;
      targetPc = defs.short.pc;
    } else if (presetType === 'long') {
      targetWc = defs.long.wc;
      targetPc = defs.long.pc;
    } else {
      targetWc = defs.medium.wc;
      targetPc = defs.medium.pc;
    }

    panel.find('#wc-min').val(targetWc.min);
    panel.find('#wc-max').val(targetWc.max);
    panel.find('#pc-min').val(targetPc.min);
    panel.find('#pc-max').val(targetPc.max);
    panel.find('#wc-min').trigger('input');
    panel.find('#wc-max').trigger('input');
    panel.find('#pc-min').trigger('input');
    panel.find('#pc-max').trigger('input');
  });
}

interface BindEditorSettingDeps {
  panel: JQuery<HTMLElement>;
  getEditingPresetId: () => string | null;
  storage: any;
  getCharacterId: () => string;
  getPreset: (name: string) => Preset;
  calculateNewPrompts: (
    currentPrompts: any[],
    mode: 'special' | 'conventional',
    style?: 'conventional' | 'minimalist',
  ) => any[];
  getStyleTag: () => JQuery<HTMLElement> | null;
  applyDialogTheme: ($dialog: JQuery<HTMLElement>) => void;
  setTempThinkingStyle: (value: 'conventional' | 'minimalist') => void;
  getTempThinkingStyle: () => 'conventional' | 'minimalist' | null;
  setStagedPrompts: (prompts: any[]) => void;
}

export function bindEditorSettingHandler(deps: BindEditorSettingDeps) {
  const { panel } = deps;
  panel.on('click', '#preset-editor-container button[data-setting]', async (e: JQuery.ClickEvent) => {
    const btn = $(e.currentTarget);
    const setting = btn.data('setting');
    const value = btn.data('value');

    if (btn.hasClass('active')) return;
    btn.siblings().removeClass('active');
    btn.addClass('active');

    if (setting === 'aiMode') {
      await handleAiModeChange(value, {
        editingPresetId: deps.getEditingPresetId(),
        storage: deps.storage,
        getCharacterId: deps.getCharacterId,
        getPreset: deps.getPreset,
        calculateNewPrompts: deps.calculateNewPrompts,
        getPanel: () => deps.panel,
        getStyleTag: deps.getStyleTag,
        applyDialogTheme: deps.applyDialogTheme,
        setTempThinkingStyle: deps.setTempThinkingStyle,
        getTempThinkingStyle: deps.getTempThinkingStyle,
        setStagedPrompts: deps.setStagedPrompts,
      });
    }
  });

  panel.on('click', '#preset-editor-container button[data-nsfw-mode]', (e: JQuery.ClickEvent) => {
    const btn = $(e.currentTarget);
    btn.siblings('[data-nsfw-mode]').removeClass('active');
    btn.addClass('active');
  });

  panel.on('click', '#preset-editor-container button[data-nsfw-hold]', (e: JQuery.ClickEvent) => {
    const btn = $(e.currentTarget);
    btn.siblings('[data-nsfw-hold]').removeClass('active');
    btn.addClass('active');
  });

  panel.on('click', '#preset-editor-container button[data-nsfw-worldbook]', (e: JQuery.ClickEvent) => {
    const btn = $(e.currentTarget);
    btn.siblings('[data-nsfw-worldbook]').removeClass('active');
    btn.addClass('active');
  });
}

interface BindStatusItemDeps {
  panel: JQuery<HTMLElement>;
  storage: any;
  setEditingPresetId: (id: string | null) => void;
  renderPresetEditor: (presetId: string) => Promise<void>;
  scrollToAndHighlightTarget: (target: string) => void;
}

export function bindStatusItemClickHandler(deps: BindStatusItemDeps) {
  const { panel } = deps;
  panel.on('click', '#status-display .status-item[data-action]', async (e: JQuery.ClickEvent) => {
    const item = $(e.currentTarget);
    const presetId = item.data('preset-id');
    const target = item.data('target');

    if (!presetId || !deps.storage.presets[presetId]) {
      toastr.error('无法找到对应的预设');
      return;
    }

    deps.setEditingPresetId(presetId);
    await deps.renderPresetEditor(presetId);
    panel.find('.control-panel').addClass('show-editor');

    if (target && target !== 'preset') {
      setTimeout(() => {
        deps.scrollToAndHighlightTarget(target);
      }, 100);
    }
  });
}

interface BindGeneralActionsDeps {
  panel: JQuery<HTMLElement>;
  summaryActions: { [key: string]: () => Promise<void> };
  quickRequestActions: { [key: string]: string };
  hidePanel: () => void;
  handleQuickRequest: (action: string, customTemplate?: string) => Promise<void>;
  getCustomQuickRequests: () => CustomQuickRequestView[];
  upsertCustomQuickRequest: (input: { id?: string; name: string; command: string }) => CustomQuickRequestView;
  removeCustomQuickRequest: (id: string) => boolean;
  triggerRenderPresetsList: () => Promise<void>;
  triggerRenderStatusDisplay: () => Promise<void>;
  triggerRenderPresetEditor: (presetId: string) => Promise<void>;
  triggerRenderQuickSwitchPanel: () => Promise<void>;
  getEditingPresetId: () => string | null;
  setEditingPresetId: (id: string | null) => void;
  getTempThinkingStyle: () => 'conventional' | 'minimalist' | null;
  getStagedPrompts: () => any[] | null;
  setStagedPrompts: (prompts: any[] | null) => void;
  storage: any;
  activeSettings: any;
  defaultPreset: any;
  generateId: () => string;
  saveStorage: () => void;
  refreshActiveSettings: () => void;
  injectSettingsToAI: (settings: any) => Promise<void>;
  getCharacterId: () => string;
  applyThinkingMode: (
    mode: 'special' | 'conventional',
    style: 'conventional' | 'minimalist' | undefined,
    deps: {
      updatePresetWith: (name: string, updater: (preset: Preset) => Preset) => Promise<Preset>;
      getLoadedPresetName: () => string | null;
    },
  ) => Promise<void>;
  applyEnvironmentPromptToggles: (deps: {
    updatePresetWith: (name: string, updater: (preset: Preset) => Preset) => Promise<Preset>;
    getLoadedPresetName: () => string | null;
  }) => Promise<void>;
  applyNsfwSettings: (settings: any) => Promise<void>;
  updatePresetWith: (name: string, updater: (preset: Preset) => Preset) => Promise<Preset>;
  getLoadedPresetName: () => string | null;
  getPreset: (name: string) => Preset;
  setPreset: (name: string, preset: Preset) => Promise<Preset>;
  getActivePresetId: () => string;
  captureRulesFromEnabledPrompts: (prompts: PresetPrompt[]) => any[];
  capturePromptStatesByRules: (prompts: PresetPrompt[], rules: any[]) => { [promptId: string]: boolean };
  resolveRuleTargetForPrompt: (prompt: PresetPrompt, rules: any[]) => boolean | null;
  quickSwitchPromptGroups: QuickSwitchPromptGroupConfig[];
  // Legacy compatibility fields for historical builds.
  captureCurrentPromptStates?: (prompts: PresetPrompt[]) => any[];
  resolvePromptStatesForRules?: (prompts: PresetPrompt[], rules: any[]) => any[];
  builtinQuickSwitchSchemes: Array<any>;
  applyQuickSwitchRules: (
    rules: any[],
    deps: {
      updatePresetWith: (name: string, updater: (preset: Preset) => Preset) => Promise<Preset>;
      getLoadedPresetName: () => string | null;
    },
  ) => Promise<void>;
  restoreQuickSwitchRules: (
    beforeStates: { [promptId: string]: boolean },
    deps: {
      updatePresetWith: (name: string, updater: (preset: Preset) => Preset) => Promise<Preset>;
      getLoadedPresetName: () => string | null;
    },
  ) => Promise<void>;
  applyQuickSwitchProfile?: (
    profile: any,
    mode: 'apply' | 'restore',
    deps: {
      updatePresetWith: (name: string, updater: (preset: Preset) => Preset) => Promise<Preset>;
      getLoadedPresetName: () => string | null;
    },
  ) => Promise<void>;
  scrollToAndHighlightTarget: (target: string) => void;
  openTutorial: () => Promise<void>;
  openChangelog: (required?: boolean) => Promise<void>;
}

export function bindGeneralActionHandler(deps: BindGeneralActionsDeps) {
  const { panel } = deps;

  panel.on('click', 'button[data-action]', async (e: JQuery.ClickEvent) => {
    const btn = $(e.currentTarget);
    const action = btn.data('action');
    const id = btn.data('id');

    const actionRequiredMode: Record<string, 'summary' | 'outline'> = {
      summarize_full: 'summary',
      summarize_chapter: 'summary',
      build_outline: 'outline',
      modify_outline: 'outline',
    };
    const requiredMode = actionRequiredMode[action];

    if (requiredMode && deps.activeSettings.aiMode !== requiredMode) {
      const modeLabel: Record<string, string> = {
        none: '常规模式',
        dialogue: '对话模式',
        outline: '大纲模式',
        summary: '总结模式',
      };
      const activePresetId = deps.getActivePresetId();
      if (activePresetId && deps.storage.presets[activePresetId]) {
        deps.setEditingPresetId(activePresetId);
        await deps.triggerRenderPresetEditor(activePresetId);
        panel.find('.control-panel').addClass('show-editor').removeClass('show-child');
        deps.scrollToAndHighlightTarget('aiMode');
      }
      toastr.warning(
        `当前模式为${modeLabel[deps.activeSettings.aiMode] || '未知模式'}，请在“AI模式”中切换至${requiredMode === 'summary' ? '总结模式' : '大纲模式'}后再操作。`,
      );
      return;
    }

    if (action in deps.summaryActions) {
      deps.hidePanel();
      await deps.summaryActions[action]();
      return;
    } else if (action in deps.quickRequestActions) {
      deps.hidePanel();
      await deps.handleQuickRequest(action);
      return;
    }

    switch (action) {
      case 'create_custom_quick_request': {
        const result = await showCustomQuickRequestEditor(panel);
        if (!result) break;
        deps.upsertCustomQuickRequest(result);
        hydrateQuickRequestButtons(panel, deps.quickRequestActions, deps.getCustomQuickRequests());
        toastr.success('自定义指令已保存');
        break;
      }
      case 'edit_custom_quick_request': {
        const existing = deps.getCustomQuickRequests().find(item => item.id === String(id));
        if (!existing) {
          toastr.error('找不到这条自定义指令。');
          break;
        }
        const result = await showCustomQuickRequestEditor(panel, existing);
        if (!result) break;
        deps.upsertCustomQuickRequest({ id: existing.id, ...result });
        hydrateQuickRequestButtons(panel, deps.quickRequestActions, deps.getCustomQuickRequests());
        toastr.success('自定义指令已更新');
        break;
      }
      case 'delete_custom_quick_request': {
        const existing = deps.getCustomQuickRequests().find(item => item.id === String(id));
        if (!existing) break;
        if (confirm(`确定要删除自定义指令“${existing.name}”吗？`)) {
          deps.removeCustomQuickRequest(existing.id);
          hydrateQuickRequestButtons(panel, deps.quickRequestActions, deps.getCustomQuickRequests());
          toastr.success('自定义指令已删除');
        }
        break;
      }
      case 'run_custom_quick_request': {
        const existing = deps.getCustomQuickRequests().find(item => item.id === String(id));
        if (!existing) {
          toastr.error('找不到这条自定义指令。');
          break;
        }
        deps.hidePanel();
        await deps.handleQuickRequest('', existing.command);
        break;
      }
      case 'create_preset': {
        const name = await triggerSlash('/input 请输入新预设名称');
        if (name) {
          const newId = deps.generateId();
          deps.storage.presets[newId] = JSON.parse(JSON.stringify(deps.activeSettings));
          deps.storage.presets[newId].id = newId;
          deps.storage.presets[newId].name = name;
          deps.storage.presets[newId].createTime = Date.now();
          deps.saveStorage();
          deps.triggerRenderPresetsList();
        }
        break;
      }
      case 'edit_preset': {
        deps.setEditingPresetId(id);
        await deps.triggerRenderPresetEditor(id);
        panel.find('.control-panel').addClass('show-editor');
        break;
      }
      case 'delete_preset': {
        if (confirm('确定要删除该预设吗？')) {
          delete deps.storage.presets[id];
          for (const char in deps.storage.bindings) {
            if (deps.storage.bindings[char] === id) delete deps.storage.bindings[char];
          }
          deps.saveStorage();
          deps.triggerRenderPresetsList();
        }
        break;
      }
      case 'set_global': {
        deps.storage.globalPresetId = id;
        deps.saveStorage();
        deps.refreshActiveSettings();
        await deps.injectSettingsToAI(deps.activeSettings);
        const isSpecial = ['dialogue', 'outline', 'summary'].includes(deps.activeSettings.aiMode);
        await deps.applyThinkingMode(isSpecial ? 'special' : 'conventional', deps.activeSettings.thinkingStyle, {
          updatePresetWith: deps.updatePresetWith,
          getLoadedPresetName: deps.getLoadedPresetName,
        });
        await deps.applyEnvironmentPromptToggles({
          updatePresetWith: deps.updatePresetWith,
          getLoadedPresetName: deps.getLoadedPresetName,
        });
        await deps.applyNsfwSettings(deps.activeSettings);
        deps.triggerRenderPresetsList();
        deps.triggerRenderStatusDisplay();
        toastr.success('已设置为全局预设');
        break;
      }
      case 'bind_preset': {
        const charId = deps.getCharacterId();
        if (!charId) {
          toastr.error('无法获取当前角色信息，请在角色界面操作');
          return;
        }
        deps.storage.bindings[charId] = id;
        deps.saveStorage();
        deps.refreshActiveSettings();
        await deps.injectSettingsToAI(deps.activeSettings);
        const isSpecial = ['dialogue', 'outline', 'summary'].includes(deps.activeSettings.aiMode);
        await deps.applyThinkingMode(isSpecial ? 'special' : 'conventional', deps.activeSettings.thinkingStyle, {
          updatePresetWith: deps.updatePresetWith,
          getLoadedPresetName: deps.getLoadedPresetName,
        });
        await deps.applyEnvironmentPromptToggles({
          updatePresetWith: deps.updatePresetWith,
          getLoadedPresetName: deps.getLoadedPresetName,
        });
        await deps.applyNsfwSettings(deps.activeSettings);
        deps.triggerRenderPresetsList();
        deps.triggerRenderStatusDisplay();
        toastr.success('已绑定到当前角色');
        break;
      }
      case 'unbind_preset': {
        const charId = deps.getCharacterId();
        if (charId && deps.storage.bindings[charId] === id) {
          delete deps.storage.bindings[charId];
          deps.saveStorage();
          deps.refreshActiveSettings();
          await deps.injectSettingsToAI(deps.activeSettings);
          const isSpecial = ['dialogue', 'outline', 'summary'].includes(deps.activeSettings.aiMode);
          await deps.applyThinkingMode(isSpecial ? 'special' : 'conventional', deps.activeSettings.thinkingStyle, {
            updatePresetWith: deps.updatePresetWith,
            getLoadedPresetName: deps.getLoadedPresetName,
          });
          await deps.applyEnvironmentPromptToggles({
            updatePresetWith: deps.updatePresetWith,
            getLoadedPresetName: deps.getLoadedPresetName,
          });
          await deps.applyNsfwSettings(deps.activeSettings);
          deps.triggerRenderPresetsList();
          deps.triggerRenderStatusDisplay();
          toastr.success('已取消绑定当前角色的预设');
        }
        break;
      }
      case 'export_preset': {
        const preset = deps.storage.presets[id];
        const filename = `预设助手自定义_${new Date().toISOString().slice(0, 10)}_${preset.name}.json`;
        const json = JSON.stringify(preset, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        break;
      }
      case 'import_preset': {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = (ev: any) => {
          const file = ev.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = re => {
            try {
              const imported = JSON.parse(re.target?.result as string);
              if (!imported.wordCount || !imported.commands) throw new Error('无效的预设');
              const newId = deps.generateId();
              imported.id = newId;
              imported.name = imported.name + ' (导入)';
              if (!imported.paragraphStyle) imported.paragraphStyle = deps.defaultPreset.paragraphStyle;
              imported.nsfw = normalizeNsfwSettings(imported.nsfw);
              if (!imported.lengthDefinitions) imported.lengthDefinitions = deps.defaultPreset.lengthDefinitions;
              if (!imported.quickSwitchProfiles) imported.quickSwitchProfiles = {};
              if (!imported.quickSwitchRuntimeStates) imported.quickSwitchRuntimeStates = {};
              deps.storage.presets[newId] = imported;
              deps.saveStorage();
              deps.triggerRenderPresetsList();
              toastr.success('预设导入成功');
            } catch {
              toastr.error('预设导入失败');
            }
          };
          reader.readAsText(file);
        };
        input.click();
        break;
      }
      case 'create_quick_switch_profile': {
        try {
          const presetInUse = deps.getPreset('in_use');
          const prompts = presetInUse.prompts || [];
          if (prompts.length === 0) {
            toastr.warning('当前预设没有可选择的 prompt 项。');
            break;
          }
          const currentCharacterId = deps.getCharacterId();

          const result = await new Promise<{
            name: string;
            rules: Array<{ promptId: string; enabled: boolean }>;
            scope: 'global' | 'character';
            characterIds: string[];
          } | null>(resolve => {
            const escapeHtml = (value: string) =>
              value
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');

            const getPromptSnapshots = (): PromptMetaSnapshot[] => {
              const latestInUse = deps.getPreset('in_use');
              const latestPrompts = latestInUse?.prompts || [];
              const base = latestPrompts.map((prompt: any, idx: number) => ({
                rowKey: String(prompt.id || `prompt:${String(prompt.name || '').trim()}#${idx}`),
                promptId: String(prompt.id || ''),
                promptName: String(prompt.name || `未命名条目 ${idx + 1}`),
                enabled: !!prompt.enabled,
              }));
              return mergePromptOrderByManager(base);
            };

            const selectedMap = new Map<string, boolean>();
            const targetEnabledMap = new Map<string, boolean>();
            const groupCollapsedMap = new Map<string, boolean>();

            const dialogId = 'qr-quick-switch-builder';
            $(`#${dialogId}`).remove();

            const defaultName = `快捷开关- ${new Date().toLocaleDateString().replace(/\//g, '-')}`;

            const buildRowsHtml = (promptItems: PromptMetaSnapshot[]) => {
              const grouped = buildGroupedPromptSegmentsWithRuntime(promptItems, deps.quickSwitchPromptGroups || []);
              const htmlChunks: string[] = [];

              grouped.forEach((segment, segmentIndex) => {
                if (!segment.items.length) return;

                const rowsHtml = segment.items
                  .map(item => {
                    const promptId = item.promptId;
                    const promptName = item.promptName;
                    const checked = selectedMap.has(promptId) ? !!selectedMap.get(promptId) : false;
                    const onWhenEnabled = targetEnabledMap.has(promptId)
                      ? !!targetEnabledMap.get(promptId)
                      : !!item.enabled;
                    const onClass = onWhenEnabled ? 'is-on' : '';
                    const searchText = `${promptName} ${promptId}`.toLowerCase();
                    return `
                        <div class="qs-builder-row" data-prompt-id="${escapeHtml(promptId)}" data-search="${escapeHtml(searchText)}">
                          <label class="qs-builder-check-wrap">
                            <input type="checkbox" class="qs-builder-check" ${checked ? 'checked' : ''}>
                            <span class="qs-builder-check-dot"></span>
                          </label>
                          <div class="qs-builder-labels">
                            <div class="qs-builder-name">${escapeHtml(promptName)}</div>
                            <div class="qs-builder-id">${escapeHtml(promptId)}</div>
                          </div>
                          <button type="button" class="qs-builder-state ${onClass}" data-enabled="${onWhenEnabled ? 'true' : 'false'}">${onWhenEnabled ? '开启' : '关闭'}</button>
                        </div>
                      `;
                  })
                  .join('');

                if (!segment.groupName) {
                  htmlChunks.push(
                    `<div class="qs-builder-group is-ungrouped"><div class="qs-builder-group-body">${rowsHtml}</div></div>`,
                  );
                  return;
                }

                const groupKey = `${segment.groupName}::${segmentIndex}`;
                const collapsed = groupCollapsedMap.has(groupKey)
                  ? !!groupCollapsedMap.get(groupKey)
                  : !!segment.collapsedByDefault;
                groupCollapsedMap.set(groupKey, collapsed);
                htmlChunks.push(`
                    <section class="qs-builder-group ${collapsed ? 'is-collapsed' : ''}" data-group-key="${escapeHtml(groupKey)}">
                      <button type="button" class="qs-builder-group-toggle" aria-expanded="${collapsed ? 'false' : 'true'}">
                        <span class="qs-builder-group-caret"><i class="fas fa-chevron-right"></i></span>
                        <span class="qs-builder-group-title">${escapeHtml(segment.groupName)}</span>
                        <span class="qs-builder-group-count">${segment.items.length}</span>
                      </button>
                      <div class="qs-builder-group-body" aria-hidden="${collapsed ? 'true' : 'false'}">${rowsHtml}</div>
                    </section>
                  `);
              });

              return htmlChunks.join('');
            };

            const $dialog = $(`
                <div id="${dialogId}" class="qs-builder-overlay">
                  <div class="control-panel qs-builder-panel">
                    <header class="panel-header">
                      <div></div>
                      <div class="header-title">新建快捷开关</div>
                      <button class="close-button" data-action="close_qs_builder"><i class="fas fa-times"></i></button>
                    </header>
                    <div class="panel-content">
                      <div class="qs-builder-top">
                        <label for="qs-builder-name">开关名称</label>
                        <input id="qs-builder-name" class="input-full-width qs-builder-name-input" value="${defaultName}">
                        <label for="qs-builder-scope">使用范围</label>
                        <select id="qs-builder-scope" class="input-full-width qs-builder-name-input">
                          <option value="global">全局使用</option>
                          <option value="character">绑定角色卡</option>
                        </select>
                        <div class="qs-character-bind-field" style="display:none;">
                          ${buildCharacterBindingPanel(currentCharacterId ? [currentCharacterId] : [])}
                        </div>
                        <label for="qs-builder-search">搜索条目</label>
                        <div class="qs-builder-search-wrap">
                          <i class="fas fa-search"></i>
                          <input id="qs-builder-search" class="input-full-width qs-builder-search-input" placeholder="输入名称或ID筛选条目">
                          <button type="button" class="qs-builder-search-clear" aria-label="清空搜索" title="清空搜索"><i class="fas fa-times"></i></button>
                        </div>
                        <div class="qs-builder-hint">勾选要纳入的条目，并设置该条目在“开关开启时”的目标状态。</div>
                      </div>
                      <div class="qs-builder-actions">
                        <button type="button" class="qs-mini-btn" data-action="qs_select_enabled">选中当前已开启</button>
                        <button type="button" class="qs-mini-btn" data-action="qs_select_all">全选</button>
                        <button type="button" class="qs-mini-btn" data-action="qs_clear_all">清空</button>
                      </div>
                      <div class="qs-builder-list"></div>
                      <div class="qs-builder-footer">
                        <button type="button" class="qs-cancel-btn" data-action="close_qs_builder">取消</button>
                        <button type="button" class="qs-save-btn" data-action="save_qs_builder">保存</button>
                      </div>
                    </div>
                  </div>
                </div>
              `);

            let managerObserver: MutationObserver | null = null;
            let managerPollTimer: number | null = null;
            let observedManagerList: HTMLElement | null = null;
            let lastSignature = '';
            let syncQueued = false;
            let syncPendingWhenIdle = false;
            let filterQueued = false;
            let lastFilterKeyword = '';
            let filterInputTimer: number | null = null;

            const captureMapsFromDom = () => {
              $dialog.find('.qs-builder-row').each((_, rowEl) => {
                const $row = $(rowEl);
                const promptId = String($row.attr('data-prompt-id') || '').trim();
                if (!promptId) return;
                selectedMap.set(promptId, !!$row.find('.qs-builder-check').prop('checked'));
                targetEnabledMap.set(promptId, $row.find('.qs-builder-state').attr('data-enabled') === 'true');
              });
            };

            const refreshGroupActiveCounts = () => {
              $dialog.find('.qs-builder-group').each((_, groupEl) => {
                const $group = $(groupEl);
                if ($group.hasClass('is-ungrouped')) return;
                const $rows = $group.find('.qs-builder-row');
                const totalRows = $rows.length;
                const activeRows = $rows.filter((__, rowEl) => {
                  return $(rowEl).find('.qs-builder-state').attr('data-enabled') === 'true';
                }).length;
                $group.find('.qs-builder-group-count').text(`${activeRows}/${totalRows}`);
              });
            };

            const applyListFilter = () => {
              const keyword = String($dialog.find('#qs-builder-search').val() || '')
                .trim()
                .toLowerCase();
              if (keyword === lastFilterKeyword && !syncPendingWhenIdle) {
                return;
              }
              lastFilterKeyword = keyword;
              $dialog.find('.qs-builder-search-wrap').toggleClass('has-value', keyword.length > 0);

              $dialog.find('.qs-builder-row').each((_, rowEl) => {
                const $row = $(rowEl);
                const searchText = String($row.attr('data-search') || '');
                const matched = !keyword || searchText.includes(keyword);
                $row.attr('data-search-visible', matched ? '1' : '0');
                $row.toggle(matched);
              });

              $dialog.find('.qs-builder-group').each((_, groupEl) => {
                const $group = $(groupEl);
                const $rows = $group.find('.qs-builder-row');
                const matchedRows = $rows.filter('[data-search-visible="1"]').length;
                if (!$group.hasClass('is-ungrouped')) {
                  const isCollapsed = $group.hasClass('is-collapsed');
                  const shouldForceExpand = keyword.length > 0;
                  $group.toggleClass('is-filter-expanded', shouldForceExpand);
                  $group
                    .find('.qs-builder-group-body')
                    .attr('aria-hidden', isCollapsed && !shouldForceExpand ? 'true' : 'false');
                  $group.toggle(matchedRows > 0);
                  return;
                }

                $group.toggle(matchedRows > 0);
              });

              refreshGroupActiveCounts();
            };

            const scheduleApplyListFilter = () => {
              if (filterQueued) return;
              filterQueued = true;
              requestAnimationFrame(() => {
                filterQueued = false;
                applyListFilter();
              });
            };

            const syncRows = (force = false) => {
              const currentKeyword = String($dialog.find('#qs-builder-search').val() || '').trim();
              if (!force && currentKeyword.length > 0) {
                syncPendingWhenIdle = true;
                return;
              }
              syncPendingWhenIdle = false;
              captureMapsFromDom();
              const promptItems = getPromptSnapshots();
              const signature = promptItems
                .map(item => `${item.promptId}|${item.promptName}|${item.enabled ? '1' : '0'}`)
                .join('||');
              if (!force && signature === lastSignature) {
                lastFilterKeyword = '';
                scheduleApplyListFilter();
                refreshGroupActiveCounts();
                return;
              }
              lastSignature = signature;
              $dialog.find('.qs-builder-list').html(buildRowsHtml(promptItems));
              refreshGroupActiveCounts();
              lastFilterKeyword = '';
              scheduleApplyListFilter();
            };

            const scheduleSyncRows = () => {
              if (syncQueued) return;
              syncQueued = true;
              requestAnimationFrame(() => {
                syncQueued = false;
                syncRows();
              });
            };

            const ensureManagerObserver = () => {
              let changed = false;
              const managerList = $(PROMPT_MANAGER_LIST_SELECTOR).get(0) as HTMLElement | undefined;
              if (!managerList) {
                if (managerObserver) {
                  managerObserver.disconnect();
                  managerObserver = null;
                  changed = true;
                }
                if (observedManagerList) {
                  observedManagerList = null;
                  changed = true;
                }
                return changed;
              }
              if (observedManagerList === managerList && managerObserver) return changed;
              if (managerObserver) {
                managerObserver.disconnect();
                changed = true;
              }
              observedManagerList = managerList;
              changed = true;
              managerObserver = new MutationObserver(() => {
                scheduleSyncRows();
              });
              managerObserver.observe(managerList, {
                childList: true,
                subtree: true,
                characterData: true,
                attributes: true,
                attributeFilter: ['class', 'checked', 'data-id', 'data-prompt-id'],
              });
              scheduleSyncRows();
              return changed;
            };

            const closeBuilder = (
              resultData: {
                name: string;
                rules: Array<{ promptId: string; enabled: boolean }>;
                scope: 'global' | 'character';
                characterIds: string[];
              } | null,
            ) => {
              $(document).off('mousedown.qsBuilder');
              if (filterInputTimer != null) {
                clearTimeout(filterInputTimer);
                filterInputTimer = null;
              }
              if (managerObserver) {
                managerObserver.disconnect();
                managerObserver = null;
              }
              if (managerPollTimer != null) {
                clearInterval(managerPollTimer);
                managerPollTimer = null;
              }
              $dialog.remove();
              resolve(resultData);
            };

            $dialog.on('click', '.qs-builder-state', e => {
              const $btn = $(e.currentTarget);
              const isOn = $btn.attr('data-enabled') === 'true';
              const next = !isOn;
              $btn.attr('data-enabled', next ? 'true' : 'false');
              $btn.toggleClass('is-on', next);
              $btn.text(next ? '开启' : '关闭');
              refreshGroupActiveCounts();
            });

            $dialog.on('change', '#qs-builder-scope', () => {
              $dialog.find('.qs-character-bind-field').toggle($dialog.find('#qs-builder-scope').val() === 'character');
            });
            bindCharacterBindingPanelEvents($dialog);

            $dialog.on('click', 'button[data-action="qs_select_enabled"]', () => {
              $dialog.find('.qs-builder-row').each((_, rowEl) => {
                const $row = $(rowEl);
                const isOn = $row.find('.qs-builder-state').attr('data-enabled') === 'true';
                $row.find('.qs-builder-check').prop('checked', isOn);
              });
            });

            $dialog.on('click', 'button[data-action="qs_select_all"]', () => {
              $dialog.find('.qs-builder-row:visible .qs-builder-check').prop('checked', true);
            });

            $dialog.on('click', 'button[data-action="qs_clear_all"]', () => {
              $dialog.find('.qs-builder-row:visible .qs-builder-check').prop('checked', false);
            });

            $dialog.on('input', '#qs-builder-search', e => {
              $(e.currentTarget).val($(e.currentTarget).val() as string);
              if (filterInputTimer != null) {
                clearTimeout(filterInputTimer);
                filterInputTimer = null;
              }
              filterInputTimer = window.setTimeout(() => {
                filterInputTimer = null;
                scheduleApplyListFilter();
                const keyword = String($dialog.find('#qs-builder-search').val() || '').trim();
                if (!keyword && syncPendingWhenIdle) {
                  syncRows();
                }
              }, 70);
            });

            $dialog.on('click', '.qs-builder-search-clear', () => {
              const $search = $dialog.find('#qs-builder-search');
              if (filterInputTimer != null) {
                clearTimeout(filterInputTimer);
                filterInputTimer = null;
              }
              $search.val('');
              lastFilterKeyword = '';
              scheduleApplyListFilter();
              if (syncPendingWhenIdle) {
                syncRows();
              }
              $search.trigger('focus');
            });

            $dialog.on('click', '.qs-builder-group-toggle', e => {
              const $btn = $(e.currentTarget);
              const $group = $btn.closest('.qs-builder-group');
              if ($group.hasClass('is-ungrouped')) return;
              const groupKey = String($group.attr('data-group-key') || '');
              if (!groupKey) return;
              const nextCollapsed = !$group.hasClass('is-collapsed');
              groupCollapsedMap.set(groupKey, nextCollapsed);
              $group.toggleClass('is-collapsed', nextCollapsed);
              $btn.attr('aria-expanded', nextCollapsed ? 'false' : 'true');
              const isSearchMode = String($dialog.find('#qs-builder-search').val() || '').trim().length > 0;
              $group
                .find('.qs-builder-group-body')
                .attr('aria-hidden', nextCollapsed && !isSearchMode ? 'true' : 'false');
              lastFilterKeyword = '';
              scheduleApplyListFilter();
            });

            $dialog.on('click', 'button[data-action="close_qs_builder"]', () => closeBuilder(null));

            $dialog.on('click', 'button[data-action="save_qs_builder"]', () => {
              const name = String($dialog.find('#qs-builder-name').val() || '').trim();
              if (!name) {
                toastr.warning('请填写快捷开关名称');
                return;
              }

              const rules: Array<{ promptId: string; enabled: boolean }> = [];
              $dialog.find('.qs-builder-row').each((_, rowEl) => {
                const $row = $(rowEl);
                const checked = $row.find('.qs-builder-check').prop('checked');
                if (!checked) return;
                const promptId = String($row.attr('data-prompt-id') || '').trim();
                if (!promptId) return;
                const enabled = $row.find('.qs-builder-state').attr('data-enabled') === 'true';
                rules.push({ promptId, enabled });
              });

              if (!rules.length) {
                toastr.warning('请至少选择一个条目');
                return;
              }

              const scope = String($dialog.find('#qs-builder-scope').val() || 'global') as 'global' | 'character';
              const characterIds = $dialog
                .find('.qs-character-bind-check:checked')
                .map((_, checkbox) =>
                  String($(checkbox).closest('.qs-character-bind-row').attr('data-character-id') || ''),
                )
                .get()
                .filter(Boolean);
              if (scope === 'character' && !characterIds.length) {
                toastr.warning('请至少选择一张要绑定的角色卡');
                return;
              }

              closeBuilder({
                name,
                rules,
                scope,
                characterIds: scope === 'character' ? characterIds : [],
              });
            });

            $(document).on('mousedown.qsBuilder', e => {
              if ($dialog.length && !$(e.target).closest('.qs-builder-panel').length) {
                closeBuilder(null);
              }
            });

            mountDialogWithThemeAndDrag(panel, $dialog, '.qs-builder-panel');

            ensureManagerObserver();
            syncRows(true);
            managerPollTimer = window.setInterval(() => {
              if (document.hidden) return;
              const changed = ensureManagerObserver();
              if (changed) scheduleSyncRows();
            }, 2000);
          });

          if (!result) break;
          const profileName = result.name;
          const rules = result.rules;

          const nameExists =
            deps.builtinQuickSwitchSchemes.some(item => item.name === profileName) ||
            [
              ...Object.values(deps.storage.quickSwitchProfiles || {}),
              ...Object.values(deps.storage.presets).flatMap((preset: any) =>
                Object.values(preset.quickSwitchProfiles || {}),
              ),
            ].some((profile: any) => profile.name === profileName);
          if (nameExists) {
            toastr.warning('快捷开关名称已存在，请换一个名称');
            break;
          }

          const activePresetId = deps.getActivePresetId();
          const targetPreset = deps.storage.presets[activePresetId];
          if (!deps.storage.quickSwitchProfiles) deps.storage.quickSwitchProfiles = {};
          if (!targetPreset.quickSwitchRuntimeStates) targetPreset.quickSwitchRuntimeStates = {};

          const profileId = deps.generateId();
          deps.storage.quickSwitchProfiles[profileId] = {
            id: profileId,
            name: profileName,
            createTime: Date.now(),
            updateTime: Date.now(),
            rules,
            scope: result.scope,
            characterIds: result.characterIds,
          };
          targetPreset.quickSwitchRuntimeStates[profileId] = {
            enabled: false,
            updateTime: Date.now(),
            beforeStates: {},
          };

          targetPreset.updateTime = Date.now();
          deps.saveStorage();
          await deps.triggerRenderQuickSwitchPanel();
          toastr.success(`已创建快捷开关：${profileName}`);
        } catch (err) {
          console.error('预设助手: 创建快捷开关失败', err);
          toastr.error('创建快捷开关失败，请查看控制台日志');
        }
        break;
      }
      case 'toggle_quick_switch_profile': {
        const activePresetId = deps.getActivePresetId();
        const targetPreset = deps.storage.presets[activePresetId];
        if (!targetPreset) break;
        if (!targetPreset.quickSwitchProfiles) targetPreset.quickSwitchProfiles = {};
        if (!targetPreset.quickSwitchRuntimeStates) targetPreset.quickSwitchRuntimeStates = {};

        const switchId = String(id || '');
        let switchName = '';
        let rules: any[] = [];
        let offRules: any[] | null = null;
        let selectionEnabled = true;
        let defaultSelection: 'all' | 'none' | 'remember' = 'all';
        let displayRules: any[] | null = null;
        let selectionGroups: any[] = [];
        let defaultEnabled = false;

        if (switchId.startsWith('builtin:')) {
          const idx = Number.parseInt(switchId.split(':')[1] || '', 10);
          const builtin = deps.builtinQuickSwitchSchemes[idx];
          if (!builtin) {
            toastr.error('未找到内置快捷开关方案');
            break;
          }
          const normalized = normalizeBuiltinScheme(builtin);
          if (normalized.type === 'mode') {
            toastr.info('该条目为模式型，请点击右侧模式按钮切换。');
            break;
          }
          switchName = normalized.name;
          rules = normalized.onRules || [];
          offRules = normalized.offRules || null;
          selectionEnabled = normalized.selectionEnabled;
          defaultSelection = normalized.defaultSelection;
          displayRules = normalized.displayRules;
          selectionGroups = normalized.selectionGroups;
          defaultEnabled = normalized.defaultEnabled;
        } else {
          const locatedProfile = findCustomQuickSwitchProfile(deps.storage, switchId);
          if (!locatedProfile) {
            toastr.error('未找到快捷开关配置');
            break;
          }
          const profile = locatedProfile.profile;
          const boundCharacterIds = Array.isArray(profile.characterIds)
            ? profile.characterIds.map(String)
            : profile.characterId
              ? [String(profile.characterId)]
              : [];
          if (profile.scope === 'character' && !boundCharacterIds.includes(deps.getCharacterId())) {
            toastr.warning('该快捷开关未绑定当前角色');
            break;
          }
          switchName = profile.name;
          rules = Array.isArray(profile.rules) ? profile.rules : [];
        }

        const runtimeState = targetPreset.quickSwitchRuntimeStates[switchId] || {
          enabled: defaultEnabled,
          updateTime: 0,
          beforeStates: {},
        };
        runtimeState.enabled = resolveBuiltinEnabled(runtimeState, defaultEnabled);

        const switched = false;
        try {
          if (!runtimeState.enabled) {
            const currentInUse = deps.getPreset('in_use');
            const currentPrompts = currentInUse.prompts || [];

            if (switchId.startsWith('builtin:') && selectionGroups.length) {
              const resolved = resolveBuiltinGroupLinkedRules(currentInUse, rules, displayRules, selectionGroups);
              if (resolved.groupRuleCount === 0) {
                toastr.warning('未从 BaiBai Tools 分组中读取到子条目，请检查分组名称和排除规则。');
                break;
              }
              rules = resolved.rules;
              displayRules = resolved.displayRules;
            }

            if (!rules.length) {
              toastr.warning('该快捷开关没有匹配到规则或分组子条目。');
              break;
            }

            if (switchId.startsWith('builtin:') && selectionEnabled) {
              const matchedEntries = collectBuiltinMatchedEntries(
                currentPrompts,
                rules,
                displayRules,
                deps.resolveRuleTargetForPrompt,
              );

              if (!matchedEntries.length) {
                toastr.warning('该内置开关没有匹配到可用子项。');
                break;
              }

              const forcedHiddenRules = collectBuiltinHiddenForcedRules(
                currentPrompts,
                rules,
                matchedEntries,
                deps.resolveRuleTargetForPrompt,
              );

              const selectedPromptIds = await openBuiltinSubselectDialog({
                panel,
                switchName,
                matchedEntries,
                runtimeState,
                defaultSelection,
                allowPrefillChoice: true,
              });

              if (!selectedPromptIds) {
                break;
              }

              const selectedSet = new Set(selectedPromptIds);
              const selectableRules = matchedEntries.map(item => ({
                promptId: item.promptId,
                enabled: selectedSet.has(item.promptId),
              }));
              rules = [...selectableRules, ...forcedHiddenRules];
              runtimeState.selectedPromptIds = selectedPromptIds;
            }

            if (!rules.length) {
              toastr.warning('本次未选择可应用的子选项。');
              break;
            }

            runtimeState.beforeStates = deps.capturePromptStatesByRules(currentPrompts, rules);
            await deps.applyQuickSwitchRules(rules, {
              updatePresetWith: deps.updatePresetWith,
              getLoadedPresetName: deps.getLoadedPresetName,
            });
            runtimeState.enabled = true;
            runtimeState.manualOverride = true;
            toastr.success(`已开启快捷开关：${switchName}`);
          } else {
            if (switchId.startsWith('builtin:') && offRules && offRules.length) {
              await deps.applyQuickSwitchRules(offRules, {
                updatePresetWith: deps.updatePresetWith,
                getLoadedPresetName: deps.getLoadedPresetName,
              });
            } else {
              await deps.restoreQuickSwitchRules(runtimeState.beforeStates || {}, {
                updatePresetWith: deps.updatePresetWith,
                getLoadedPresetName: deps.getLoadedPresetName,
              });
            }
            runtimeState.enabled = false;
            runtimeState.beforeStates = {};
            runtimeState.manualOverride = true;
            toastr.success(`已关闭快捷开关：${switchName}`);
          }
        } catch (err) {
          console.error('预设助手: 快捷开关切换失败', err);
          toastr.error('快捷开关切换失败，请查看控制台日志');
          break;
        }
        try {
          runtimeState.updateTime = Date.now();
          targetPreset.quickSwitchRuntimeStates[switchId] = runtimeState;
          targetPreset.updateTime = Date.now();
          deps.saveStorage();
          await deps.triggerRenderQuickSwitchPanel();
        } catch (err) {
          console.error('预设助手: 快捷开关已切换但面板刷新失败', err);
          if (switched) {
            toastr.warning('快捷开关已切换成功，但面板刷新失败，稍后可重打开面板确认状态。');
          } else {
            toastr.error('状态保存或刷新失败，请查看控制台日志');
          }
        }
        break;
      }
      case 'open_quick_switch_suboptions': {
        const activePresetId = deps.getActivePresetId();
        const targetPreset = deps.storage.presets[activePresetId];
        if (!targetPreset) break;
        if (!targetPreset.quickSwitchRuntimeStates) targetPreset.quickSwitchRuntimeStates = {};

        const switchId = String(id || '');
        if (!switchId.startsWith('builtin:')) {
          toastr.info('该条目暂无子选项。');
          break;
        }

        const idx = Number.parseInt(switchId.split(':')[1] || '', 10);
        const builtin = deps.builtinQuickSwitchSchemes[idx];
        if (!builtin) {
          toastr.error('未找到内置开关方案');
          break;
        }

        const normalized = normalizeBuiltinScheme(builtin);
        if (normalized.type === 'customize') {
          const currentInUse = deps.getPreset('in_use');
          let sourcePrompts = currentInUse.prompts || [];
          if (normalized.customize.groups.length > 0) {
            const groupRules = resolveBaiBaiGroupRules(currentInUse, normalized.customize.groups, []);
            if (!groupRules.length) {
              toastr.warning('未从 BaiBai Tools 分组中读取到定制子条目，请检查分组名称和排除规则。');
              break;
            }
            sourcePrompts = sourcePrompts.filter(
              prompt => deps.resolveRuleTargetForPrompt(prompt, groupRules) !== null,
            );
          }
          const sections = collectCustomizePromptSections(sourcePrompts, normalized.customize);
          if (!sections.length) {
            toastr.warning('没有匹配到可定制子条目，请检查分区格式、sectionNames、itemPrefixes 和 itemSuffixes。');
            break;
          }

          const selectedPromptIds = await openGroupedCustomizeDialog({
            panel,
            switchName: normalized.name,
            sections,
          });
          if (!selectedPromptIds) break;

          const selectedSet = new Set(selectedPromptIds);
          const nextRules = sections.flatMap(section =>
            section.items.map(item => ({ promptId: item.promptId, enabled: selectedSet.has(item.promptId) })),
          );
          const runtimeState = targetPreset.quickSwitchRuntimeStates[switchId] || {
            enabled: true,
            updateTime: 0,
            beforeStates: {},
          };

          try {
            await deps.applyQuickSwitchRules(nextRules, {
              updatePresetWith: deps.updatePresetWith,
              getLoadedPresetName: deps.getLoadedPresetName,
            });
            runtimeState.enabled = true;
            runtimeState.selectedPromptIds = selectedPromptIds;
            runtimeState.manualOverride = true;
            runtimeState.updateTime = Date.now();
            targetPreset.quickSwitchRuntimeStates[switchId] = runtimeState;
            targetPreset.updateTime = Date.now();
            deps.saveStorage();
            await deps.triggerRenderQuickSwitchPanel();
            toastr.success(`已应用定制：${normalized.name}`);
          } catch (err) {
            console.error('预设助手: 应用分区定制失败', err);
            toastr.error('应用分区定制失败，请查看控制台日志');
          }
          break;
        }
        if (normalized.type !== 'toggle' || !normalized.selectionEnabled) {
          toastr.info('该条目未启用子选项配置。');
          break;
        }

        const runtimeState = targetPreset.quickSwitchRuntimeStates[switchId] || {
          enabled: normalized.defaultEnabled,
          updateTime: 0,
          beforeStates: {},
        };
        runtimeState.enabled = resolveBuiltinEnabled(runtimeState, normalized.defaultEnabled);

        const switchName = normalized.name;
        let rules = normalized.onRules || [];
        let displayRules = normalized.displayRules;
        const selectionGroups = normalized.selectionGroups;
        const currentInUse = deps.getPreset('in_use');
        if (selectionGroups.length) {
          const resolved = resolveBuiltinGroupLinkedRules(currentInUse, rules, displayRules, selectionGroups);
          if (resolved.groupRuleCount === 0) {
            toastr.warning('未从 BaiBai Tools 分组中读取到子条目，请检查分组名称和排除规则。');
            break;
          }
          rules = resolved.rules;
          displayRules = resolved.displayRules;
        }
        if (!rules.length) {
          toastr.warning('该条目未配置可用子选项。');
          break;
        }

        const currentPrompts = currentInUse.prompts || [];
        const matchedEntries = collectBuiltinMatchedEntries(
          currentPrompts,
          rules,
          displayRules,
          deps.resolveRuleTargetForPrompt,
        );
        const forcedHiddenRules = collectBuiltinHiddenForcedRules(
          currentPrompts,
          rules,
          matchedEntries,
          deps.resolveRuleTargetForPrompt,
        );

        if (!matchedEntries.length) {
          toastr.warning('没有可显示的子选项，请检查 displayRules 或规则匹配。');
          break;
        }

        const selectedPromptIds = await openBuiltinSubselectDialog({
          panel,
          switchName,
          matchedEntries,
          runtimeState,
          defaultSelection: 'remember',
        });
        if (!selectedPromptIds) break;

        runtimeState.selectedPromptIds = selectedPromptIds;
        runtimeState.manualOverride = true;

        try {
          if (runtimeState.enabled) {
            const selectedSet = new Set(selectedPromptIds);
            const selectedRules = matchedEntries.map(item => ({
              promptId: item.promptId,
              enabled: selectedSet.has(item.promptId),
            }));
            const nextRules = [...selectedRules, ...forcedHiddenRules];

            await deps.applyQuickSwitchRules(nextRules, {
              updatePresetWith: deps.updatePresetWith,
              getLoadedPresetName: deps.getLoadedPresetName,
            });
            toastr.success(`已更新子选项：${switchName}`);
          } else {
            toastr.info('已保存子选项，下次开启时生效。');
          }

          runtimeState.updateTime = Date.now();
          targetPreset.quickSwitchRuntimeStates[switchId] = runtimeState;
          targetPreset.updateTime = Date.now();
          deps.saveStorage();
          await deps.triggerRenderQuickSwitchPanel();
        } catch (err) {
          console.error('预设助手: 更新子选项失败', err);
          toastr.error('更新子选项失败，请查看控制台日志');
        }

        break;
      }
      case 'select_quick_switch_mode': {
        const activePresetId = deps.getActivePresetId();
        const targetPreset = deps.storage.presets[activePresetId];
        if (!targetPreset) break;
        if (!targetPreset.quickSwitchRuntimeStates) targetPreset.quickSwitchRuntimeStates = {};

        const switchId = String(id || '');
        if (!switchId.startsWith('builtin:')) break;
        const idx = Number.parseInt(switchId.split(':')[1] || '', 10);
        const builtin = deps.builtinQuickSwitchSchemes[idx];
        if (!builtin) {
          toastr.error('未找到内置模式方案');
          break;
        }

        const normalized = normalizeBuiltinScheme(builtin);
        if (normalized.type !== 'mode' || !normalized.modes.length) {
          toastr.warning('该条目不是模式型方案');
          break;
        }

        const runtimeState = targetPreset.quickSwitchRuntimeStates[switchId] || {
          enabled: true,
          updateTime: 0,
          beforeStates: {},
          modeId: normalized.defaultModeId,
        };

        const selectedModeId = await new Promise<string | null>(resolve => {
          const dialogId = 'qr-mode-switch-dialog';
          $(`#${dialogId}`).remove();

          const currentModeId = runtimeState.modeId || normalized.defaultModeId;
          const modeRows = normalized.modes
            .map(mode => {
              const checked = mode.id === currentModeId ? 'checked' : '';
              return `
                <label class="qs-sub-row">
                  <input type="radio" class="qs-sub-check" name="qr-mode-switch-radio" value="${mode.id}" ${checked}>
                  <span class="qs-sub-dot"></span>
                  <span class="qs-sub-name">${mode.label}</span>
                </label>
              `;
            })
            .join('');

          const $dialog = $(`
            <div id="${dialogId}" class="qs-builder-overlay">
              <div class="control-panel qs-builder-panel qs-sub-panel">
                <header class="panel-header">
                  <div></div>
                  <div class="header-title">${normalized.name}</div>
                  <button class="close-button" data-action="close_qs_mode"><i class="fas fa-times"></i></button>
                </header>
                <div class="panel-content">
                  <div class="qs-builder-hint">请选择要切换到的模式。</div>
                  <div class="qs-sub-list">${modeRows}</div>
                  <div class="qs-builder-footer">
                    <button type="button" class="qs-cancel-btn" data-action="close_qs_mode">取消</button>
                    <button type="button" class="qs-save-btn" data-action="save_qs_mode">确认</button>
                  </div>
                </div>
              </div>
            </div>
          `);

          const closeDialog = (resultData: string | null) => {
            $(document).off('mousedown.qsModeSelect');
            $dialog.remove();
            resolve(resultData);
          };

          $dialog.on('click', 'button[data-action="close_qs_mode"]', () => closeDialog(null));
          $dialog.on('click', 'button[data-action="save_qs_mode"]', () => {
            const modeId = String($dialog.find('input[name="qr-mode-switch-radio"]:checked').val() || '').trim();
            if (!modeId) {
              toastr.warning('请选择一个模式');
              return;
            }
            closeDialog(modeId);
          });

          $(document).on('mousedown.qsModeSelect', e => {
            if ($dialog.length && !$(e.target).closest('.qs-sub-panel').length) {
              closeDialog(null);
            }
          });

          mountDialogWithThemeAndDrag(panel, $dialog, '.qs-sub-panel');
        });

        if (!selectedModeId) break;
        const mode = normalized.modes.find(item => item.id === selectedModeId);
        if (!mode) {
          toastr.error('未找到对应模式配置');
          break;
        }

        try {
          await deps.applyQuickSwitchRules(mode.rules, {
            updatePresetWith: deps.updatePresetWith,
            getLoadedPresetName: deps.getLoadedPresetName,
          });
          applyStartReplyWith(mode.startReplyWith);
          runtimeState.modeId = mode.id;
          runtimeState.enabled = true;
          runtimeState.updateTime = Date.now();
          targetPreset.quickSwitchRuntimeStates[switchId] = runtimeState;
          targetPreset.updateTime = Date.now();
          deps.saveStorage();
          await deps.triggerRenderQuickSwitchPanel();
          toastr.success(`已切换模式：${normalized.name} -> ${mode.label}`);
        } catch (err) {
          console.error('预设助手: 模式切换失败', err);
          toastr.error('模式切换失败，请查看控制台日志');
        }

        break;
      }
      case 'edit_quick_switch_profile': {
        const activePresetId = deps.getActivePresetId();
        const targetPreset = deps.storage.presets[activePresetId];
        const profileId = String(id || '');
        const locatedProfile = findCustomQuickSwitchProfile(deps.storage, profileId);
        const profile = locatedProfile?.profile;
        if (!targetPreset || !locatedProfile || !profile || profileId.startsWith('builtin:')) {
          toastr.warning('未找到可编辑的自定义快捷开关');
          break;
        }

        const currentInUse = deps.getPreset('in_use');
        const result = await openCustomQuickSwitchEditor({
          panel,
          profile,
          prompts: currentInUse.prompts || [],
          resolveRuleTargetForPrompt: deps.resolveRuleTargetForPrompt,
        });
        if (!result) break;

        const duplicateProfile = [
          ...Object.values(deps.storage.quickSwitchProfiles || {}),
          ...Object.values(deps.storage.presets).flatMap((preset: any) =>
            Object.values(preset.quickSwitchProfiles || {}),
          ),
        ].find((item: any) => item.id !== profileId && item.name === result.name);
        if (duplicateProfile || deps.builtinQuickSwitchSchemes.some(item => item.name === result.name)) {
          toastr.warning('快捷开关名称已存在，请换一个名称');
          break;
        }

        try {
          const runtimeState = targetPreset.quickSwitchRuntimeStates?.[profileId];
          if (runtimeState?.enabled) {
            await deps.restoreQuickSwitchRules(runtimeState.beforeStates || {}, {
              updatePresetWith: deps.updatePresetWith,
              getLoadedPresetName: deps.getLoadedPresetName,
            });
            const restoredPrompts = deps.getPreset('in_use').prompts || [];
            runtimeState.beforeStates = deps.capturePromptStatesByRules(restoredPrompts, result.rules);
            await deps.applyQuickSwitchRules(result.rules, {
              updatePresetWith: deps.updatePresetWith,
              getLoadedPresetName: deps.getLoadedPresetName,
            });
            runtimeState.updateTime = Date.now();
          }

          profile.name = result.name;
          profile.rules = result.rules;
          profile.scope = result.scope;
          profile.characterIds = result.characterIds;
          delete profile.characterId;
          profile.updateTime = Date.now();
          if (locatedProfile.ownerPreset) locatedProfile.ownerPreset.updateTime = Date.now();
          targetPreset.updateTime = Date.now();
          deps.saveStorage();
          await deps.triggerRenderQuickSwitchPanel();
          toastr.success(`已更新快捷开关：${result.name}`);
        } catch (error) {
          console.error('预设助手: 更新自定义快捷开关失败', error);
          toastr.error('更新快捷开关失败，请查看控制台日志');
        }
        break;
      }
      case 'delete_quick_switch_profile': {
        const profileId = String(id || '');
        if (profileId.startsWith('builtin:')) {
          toastr.warning('内置快捷开关不可删除');
          break;
        }
        const locatedProfile = findCustomQuickSwitchProfile(deps.storage, profileId);
        if (!locatedProfile) break;
        if (!confirm('确定删除该快捷开关配置吗？')) break;
        if (locatedProfile.ownerPreset) {
          delete locatedProfile.ownerPreset.quickSwitchProfiles[profileId];
        } else if (deps.storage.quickSwitchProfiles) {
          delete deps.storage.quickSwitchProfiles[profileId];
        }
        Object.values(deps.storage.presets).forEach((preset: any) => {
          if (preset.quickSwitchRuntimeStates) delete preset.quickSwitchRuntimeStates[profileId];
        });
        if (locatedProfile.ownerPreset) locatedProfile.ownerPreset.updateTime = Date.now();
        deps.saveStorage();
        await deps.triggerRenderQuickSwitchPanel();
        toastr.success('已删除快捷开关配置');
        break;
      }
      case 'toggle_preset_commands': {
        panel.find('#preset-commands-wrapper').slideToggle();
        break;
      }
      case 'reset_nsfw_keywords': {
        panel.find('#nsfw-open-keywords').val(DEFAULT_NSFW_SETTINGS.openKeywords.join('、'));
        panel.find('#nsfw-close-keywords').val(DEFAULT_NSFW_SETTINGS.closeKeywords.join('、'));
        panel.find('#nsfw-worldbook-markers').val(DEFAULT_NSFW_SETTINGS.worldbookMarkers.join('、'));
        toastr.success('NSFW 判断词表已恢复默认值，保存预设后生效。');
        break;
      }
      case 'save_preset_changes': {
        const editingPresetId = deps.getEditingPresetId();
        if (!editingPresetId) return;
        const editingPreset = deps.storage.presets[editingPresetId];
        editingPreset.name = panel.find('#preset-name').val() as string;
        editingPreset.wordCount = {
          min: parseInt(panel.find('#wc-min').val() as string) || 0,
          max: parseInt(panel.find('#wc-max').val() as string) || 0,
        };
        editingPreset.paragraphCount = {
          min: parseInt(panel.find('#pc-min').val() as string) || 0,
          max: parseInt(panel.find('#pc-max').val() as string) || 0,
        };
        const nsfwMode = String(panel.find('[data-nsfw-mode].active').data('nsfw-mode') || 'off');
        const nsfwHoldTurns = Number(panel.find('[data-nsfw-hold].active').data('nsfw-hold')) || 0;
        const nsfwWorldbookMode = String(panel.find('[data-nsfw-worldbook].active').data('nsfw-worldbook') || 'none');
        editingPreset.nsfw = normalizeNsfwSettings({
          mode: nsfwMode === 'on' || nsfwMode === 'auto' ? nsfwMode : 'off',
          configured: true,
          openKeywords: splitNsfwKeywords(panel.find('#nsfw-open-keywords').val()),
          closeKeywords: splitNsfwKeywords(panel.find('#nsfw-close-keywords').val()),
          holdTurns: nsfwHoldTurns,
          worldbookMode: nsfwWorldbookMode === 'blue' || nsfwWorldbookMode === 'green' ? nsfwWorldbookMode : 'none',
          worldbookMarkers: splitNsfwKeywords(panel.find('#nsfw-worldbook-markers').val()),
        });
        panel.find('.len-def').each(function () {
          const type = $(this).data('type') as 'short' | 'medium' | 'long';
          const field = $(this).data('field') as string;
          const val = parseInt($(this).val() as string) || 0;
          if (field === 'wc-min') editingPreset.lengthDefinitions[type].wc.min = val;
          if (field === 'wc-max') editingPreset.lengthDefinitions[type].wc.max = val;
          if (field === 'pc-min') editingPreset.lengthDefinitions[type].pc.min = val;
          if (field === 'pc-max') editingPreset.lengthDefinitions[type].pc.max = val;
        });
        panel.find('#preset-editor-container .setting-group').each(function () {
          const activeBtn = $(this).find('button[data-setting].active');
          if (activeBtn.length > 0) {
            const setting = activeBtn.data('setting');
            const value = activeBtn.data('value');
            if (setting && value) (editingPreset as any)[setting] = value;
          }
        });
        panel.find('.preset-command-input').each(function () {
          const key = $(this).data('command-key');
          const val = $(this).val() as string;
          if (key) editingPreset.commands[key] = val;
        });
        if (deps.getTempThinkingStyle()) {
          editingPreset.thinkingStyle = deps.getTempThinkingStyle();
        }
        editingPreset.updateTime = Date.now();
        deps.saveStorage();

        const charId = deps.getCharacterId();
        const currentBound = deps.storage.bindings[charId];
        const isEditingActive =
          (currentBound && currentBound === editingPresetId) ||
          (!currentBound && deps.storage.globalPresetId === editingPresetId);

        if (isEditingActive) {
          deps.refreshActiveSettings();
          await deps.injectSettingsToAI(deps.activeSettings);
          const stagedPrompts = deps.getStagedPrompts();
          if (stagedPrompts) {
            try {
              const presetToSave = deps.getPreset('in_use');
              presetToSave.prompts = stagedPrompts;
              deps.setStagedPrompts(null);
              const presetName = deps.getLoadedPresetName();
              if (presetName) await deps.setPreset(presetName, presetToSave);
              await deps.setPreset('in_use', presetToSave);
              await deps.applyEnvironmentPromptToggles({
                updatePresetWith: deps.updatePresetWith,
                getLoadedPresetName: deps.getLoadedPresetName,
              });
            } catch (err) {
              console.error('预设助手: Failed to apply staged prompts', err);
            }
          } else {
            const isSpecial = ['dialogue', 'outline', 'summary'].includes(deps.activeSettings.aiMode);
            await deps.applyThinkingMode(isSpecial ? 'special' : 'conventional', deps.activeSettings.thinkingStyle, {
              updatePresetWith: deps.updatePresetWith,
              getLoadedPresetName: deps.getLoadedPresetName,
            });
            await deps.applyEnvironmentPromptToggles({
              updatePresetWith: deps.updatePresetWith,
              getLoadedPresetName: deps.getLoadedPresetName,
            });
          }
          await deps.applyNsfwSettings(deps.activeSettings);
          deps.triggerRenderStatusDisplay();
          deps.triggerRenderQuickSwitchPanel();
        }
        toastr.success('预设已保存并应用。');
        panel.find('.control-panel').removeClass('show-editor');
        deps.triggerRenderPresetsList();
        break;
      }
      case 'cancel_preset_changes': {
        panel.find('.control-panel').removeClass('show-editor');
        deps.setEditingPresetId(null);
        break;
      }
      case 'open_tutorial': {
        deps.hidePanel();
        await new Promise(resolve => setTimeout(resolve, 340));
        await deps.openTutorial();
        break;
      }
      case 'open_changelog': {
        deps.hidePanel();
        await new Promise(resolve => setTimeout(resolve, 340));
        await deps.openChangelog(false);
        break;
      }
    }
  });
}
