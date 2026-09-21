import { getLatestChangelog, renderChangelogEntries, type ChangelogEntry } from './changelog';
import { defaultCommands } from './constants';
import { DEFAULT_NSFW_SETTINGS, getNsfwRuntimeStatus, normalizeNsfwSettings } from './nsfw';
import { combineDisplayRules, resolveBaiBaiGroupRules } from './presetGroups';
import { resolveRuleTargetForPrompt } from './quickSwitch';
import type { NsfwSettings } from './types';

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function containPanelTouchScroll($root: JQuery<HTMLElement>) {
  const root = $root[0];
  if (!root || root.dataset.touchScrollContained === 'true') return;
  root.dataset.touchScrollContained = 'true';

  let scrollArea: HTMLElement | null = null;
  let previousY = 0;
  root.addEventListener(
    'touchstart',
    event => {
      // 面板挂载在宿主页面，不能用当前 iframe 的 Element 做 instanceof 判断。
      const target = event.target as (EventTarget & { closest?: (selector: string) => Element | null }) | null;
      scrollArea = (target?.closest?.('.panel-content') as HTMLElement | null) || null;
      previousY = event.touches[0]?.clientY ?? 0;
    },
    { passive: true },
  );
  root.addEventListener(
    'touchmove',
    event => {
      const currentY = event.touches[0]?.clientY ?? previousY;
      const deltaY = previousY - currentY;
      previousY = currentY;

      if (!scrollArea) {
        event.preventDefault();
        return;
      }

      const maxScrollTop = Math.max(0, scrollArea.scrollHeight - scrollArea.clientHeight);
      const reachedTop = scrollArea.scrollTop <= 0 && deltaY < 0;
      const reachedBottom = scrollArea.scrollTop >= maxScrollTop - 1 && deltaY > 0;
      if (maxScrollTop <= 1 || reachedTop || reachedBottom) event.preventDefault();
      event.stopPropagation();
    },
    { passive: false },
  );
}

function inferQuickSwitchEnabledFromPrompts(
  prompts: PresetPrompt[] | undefined,
  rules: Array<{ nameIncludes?: string; promptId?: string; promptIdIncludes?: string; enabled: boolean }> | undefined,
): boolean | null {
  if (!Array.isArray(prompts) || prompts.length === 0) return null;
  if (!Array.isArray(rules) || rules.length === 0) return null;

  let matchedCount = 0;
  for (const prompt of prompts) {
    const targetEnabled = resolveRuleTargetForPrompt(prompt, rules);
    if (targetEnabled === null) continue;
    matchedCount += 1;
    if (!!prompt.enabled !== targetEnabled) {
      return false;
    }
  }

  return matchedCount > 0 ? true : null;
}

export function scrollToAndHighlightTarget(panel: JQuery<HTMLElement>, target: string) {
  const container = panel.find('#preset-editor-container');
  if (!container.length) return;

  let targetElement: JQuery<HTMLElement> | null = null;

  switch (target) {
    case 'wordCount':
      targetElement = container.find('#wc-min').closest('.setting-group');
      break;
    case 'aiMode':
      targetElement = container.find('button[data-setting="aiMode"]').closest('.setting-group');
      break;
    case 'perspective':
      targetElement = container.find('button[data-setting="perspective"]').closest('.setting-group');
      break;
    case 'userPronoun':
      targetElement = container.find('button[data-setting="userPronoun"]').closest('.setting-group');
      break;
    case 'takeover':
      targetElement = container.find('button[data-setting="takeover"]').closest('.setting-group');
      break;
    case 'narrate':
      targetElement = container.find('button[data-setting="narrate"]').closest('.setting-group');
      break;
    case 'nsfw':
      targetElement = container.find('[data-nsfw-mode]').closest('.setting-group');
      break;
  }

  if (targetElement && targetElement.length) {
    const targetOffset = targetElement.offset();
    const containerOffset = container.offset();
    const containerScrollTop = container.scrollTop();

    if (targetOffset && containerOffset && containerScrollTop !== undefined) {
      container.scrollTop(targetOffset.top - containerOffset.top + containerScrollTop - 20);
    }

    const highlightId = 'highlight-' + Date.now();
    targetElement.attr('data-highlight-id', highlightId);

    if (!$('#highlight-anim-style').length) {
      $(
        '<style id="highlight-anim-style">' +
          '@keyframes highlightFadeIn { from { opacity: 0; } to { opacity: 1; } }' +
          '@keyframes highlightFadeOut { from { opacity: 1; } to { opacity: 0; } }' +
          '</style>',
      ).appendTo('head');
    }

    const highlightStyle = `
      [data-highlight-id="${highlightId}"]::after {
        content: '';
        position: absolute;
        top: -10px;
        left: -10px;
        right: -10px;
        bottom: -10px;
        background-color: var(--highlight-bg);
        outline: 2px solid var(--panel-text-accent);
        border-radius: 8px;
        pointer-events: none;
        z-index: 1;
        animation: highlightFadeIn 0.3s ease forwards;
      }
    `;

    const originalPosition = targetElement.css('position');
    if (originalPosition === 'static') {
      targetElement.css('position', 'relative');
    }

    const $style = $(`<style class="temp-highlight" data-for="${highlightId}">${highlightStyle}</style>`);
    $('head').append($style);

    setTimeout(() => {
      const $pseudoStyle = $(`style[data-for="${highlightId}"]`);
      if ($pseudoStyle.length) {
        const fadeOutStyle = `[data-highlight-id="${highlightId}"]::after { animation: highlightFadeOut 0.3s ease forwards !important; }`;
        $pseudoStyle.append(fadeOutStyle);

        setTimeout(() => {
          $pseudoStyle.remove();
          targetElement.removeAttr('data-highlight-id');
          if (originalPosition === 'static') {
            targetElement.css('position', '');
          }
        }, 300);
      }
    }, 2000);
  }
}

interface ShowWelcomePopupDeps {
  welcomeHtml: string;
  panelCss: string;
  uiSkin: 'yuedu' | 'xiangyata';
  setStyleTag: (tag: JQuery<HTMLElement> | null) => void;
  showPanel: (showPresetsFirst?: boolean) => Promise<void>;
  enablePanelDragging: ($targetPanel: JQuery<HTMLElement>) => void;
  onDismiss?: () => void;
}

interface ShowChangelogPopupDeps {
  panelCss: string;
  uiSkin: 'yuedu' | 'xiangyata';
  required: boolean;
  entries?: ChangelogEntry[];
  setStyleTag: (tag: JQuery<HTMLElement> | null) => void;
  enablePanelDragging: ($targetPanel: JQuery<HTMLElement>) => void;
  onAcknowledge?: (version: string) => void;
}

export async function showChangelogPopup(deps: ShowChangelogPopupDeps): Promise<void> {
  if ($('#qr-welcome-popup').length > 0) return;

  const entries = deps.entries?.length ? deps.entries : [getLatestChangelog()];
  const latest = getLatestChangelog();
  const popup = $(`
    <div id="qr-welcome-popup">
      <div class="control-panel welcome-panel changelog-panel">
        <header class="panel-header">
          <div class="header-title">更新日志合辑</div>
          ${deps.required ? '' : '<button class="close-button changelog-close" aria-label="关闭更新日志"><i class="fas fa-times"></i></button>'}
        </header>
        <div class="panel-content changelog-content">
          <div class="changelog-version-banner">
            <span>当前版本</span><b>v${latest.version}</b>
          </div>
          ${renderChangelogEntries(entries)}
        </div>
        <footer class="changelog-footer">
          <span class="changelog-footer-tip">${deps.required ? '“我已阅读”下次仍会提醒；“不再显示”会记住本版本。' : `共 ${entries.length} 条更新日志`}</span>
          <div class="changelog-footer-actions">
            ${
              deps.required
                ? '<button class="changelog-confirm is-read" disabled>我已阅读（10s）</button><button class="changelog-confirm is-dismiss" disabled>不再显示（10s）</button>'
                : '<button class="changelog-confirm is-close">关闭</button>'
            }
          </div>
        </footer>
      </div>
    </div>
  `);
  $('body').append(popup);
  containPanelTouchScroll(popup);

  const $existingStyle = $('#control-panel-style');
  if ($existingStyle.length) {
    $existingStyle.html(deps.panelCss);
    deps.setStyleTag($existingStyle);
  } else {
    const styleTag = $('<style>').attr('id', 'control-panel-style').html(deps.panelCss).appendTo('head');
    deps.setStyleTag(styleTag);
  }

  const $changelogPanel = popup.find('.changelog-panel');
  $changelogPanel.attr('data-ui-skin', deps.uiSkin);
  const hour = new Date().getHours();
  $changelogPanel.toggleClass('dark-mode', hour < 6 || hour >= 18);

  const vv = window.visualViewport;
  const safeTop = Math.max(0, Math.round(vv?.offsetTop || 0));
  const safeLeft = Math.max(0, Math.round(vv?.offsetLeft || 0));
  popup[0]?.style.setProperty('--th-runtime-safe-top', `${safeTop}px`);
  popup[0]?.style.setProperty('--th-runtime-safe-left', `${safeLeft}px`);
  $changelogPanel[0]?.style.setProperty('--th-runtime-safe-top', `${safeTop}px`);
  $changelogPanel[0]?.style.setProperty('--th-runtime-safe-left', `${safeLeft}px`);

  const viewW = window.parent.innerWidth;
  const viewH = window.parent.innerHeight;
  const panelW = $changelogPanel.outerWidth() ?? 0;
  const panelH = $changelogPanel.outerHeight() ?? 0;
  $changelogPanel.css({
    top: `${Math.max(safeTop + 20, (viewH - panelH) / 2)}px`,
    left: `${Math.max(safeLeft + 20, (viewW - panelW) / 2)}px`,
  });
  deps.enablePanelDragging($changelogPanel);

  // SillyTavern 的外层页面可能截获滚轮；在日志正文上直接消费滚动，确保长日志始终可下滑。
  const $scrollArea = popup.find('.changelog-content');
  $scrollArea.on('wheel.changelog', event => {
    const originalEvent = event.originalEvent as WheelEvent | undefined;
    const scrollElement = $scrollArea[0];
    if (!scrollElement || !originalEvent?.deltaY) return;
    scrollElement.scrollTop += originalEvent.deltaY;
    event.preventDefault();
    event.stopPropagation();
  });

  await new Promise<void>(resolve => {
    let closed = false;
    let countdownTimer: number | null = null;
    const $readButton = popup.find('.changelog-confirm.is-read');
    const $dismissButton = popup.find('.changelog-confirm.is-dismiss');
    const $closeButton = popup.find('.changelog-confirm.is-close');

    const close = (acknowledge: boolean) => {
      if (closed) return;
      closed = true;
      if (countdownTimer !== null) window.clearInterval(countdownTimer);
      if (acknowledge) deps.onAcknowledge?.(latest.version);
      popup.removeClass('visible');
      window.setTimeout(() => {
        popup.remove();
        resolve();
      }, 300);
    };

    if (deps.required) {
      let remaining = 10;
      countdownTimer = window.setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          if (countdownTimer !== null) window.clearInterval(countdownTimer);
          countdownTimer = null;
          $readButton.prop('disabled', false).text('我已阅读');
          $dismissButton.prop('disabled', false).text('不再显示');
          return;
        }
        $readButton.text(`我已阅读（${remaining}s）`);
        $dismissButton.text(`不再显示（${remaining}s）`);
      }, 1000);
      $readButton.on('click', () => close(false));
      $dismissButton.on('click', () => close(true));
    } else {
      $closeButton.on('click', () => close(false));
      popup.find('.changelog-close').on('click', () => close(false));
    }

    window.setTimeout(() => popup.addClass('visible'), 50);
  });
}

export async function showWelcomePopup(deps: ShowWelcomePopupDeps) {
  if ($('#qr-welcome-popup').length > 0) return;

  const popup = $(deps.welcomeHtml);
  $('body').append(popup);
  containPanelTouchScroll(popup);

  const $existingStyle = $('#control-panel-style');
  if ($existingStyle.length) {
    $existingStyle.html(deps.panelCss);
    deps.setStyleTag($existingStyle);
  } else {
    const styleTag = $('<style>').attr('id', 'control-panel-style').html(deps.panelCss).appendTo('head');
    deps.setStyleTag(styleTag);
  }

  const $welcomePanel = popup.find('.control-panel');
  $welcomePanel.attr('data-ui-skin', deps.uiSkin);
  const hour = new Date().getHours();
  const isDark = hour < 6 || hour >= 18;
  $welcomePanel.toggleClass('dark-mode', isDark);

  const vv = window.visualViewport;
  const safeTop = Math.max(0, Math.round(vv?.offsetTop || 0));
  const safeRight = Math.max(
    0,
    Math.round(
      (window.innerWidth || window.parent.innerWidth || 0) -
        (vv?.width || window.innerWidth || 0) -
        (vv?.offsetLeft || 0),
    ),
  );
  const safeBottom = Math.max(
    0,
    Math.round(
      (window.innerHeight || window.parent.innerHeight || 0) -
        (vv?.height || window.innerHeight || 0) -
        (vv?.offsetTop || 0),
    ),
  );
  const safeLeft = Math.max(0, Math.round(vv?.offsetLeft || 0));
  popup[0]?.style.setProperty('--th-runtime-safe-top', `${safeTop}px`);
  popup[0]?.style.setProperty('--th-runtime-safe-right', `${safeRight}px`);
  popup[0]?.style.setProperty('--th-runtime-safe-bottom', `${safeBottom}px`);
  popup[0]?.style.setProperty('--th-runtime-safe-left', `${safeLeft}px`);
  $welcomePanel[0]?.style.setProperty('--th-runtime-safe-top', `${safeTop}px`);
  $welcomePanel[0]?.style.setProperty('--th-runtime-safe-right', `${safeRight}px`);
  $welcomePanel[0]?.style.setProperty('--th-runtime-safe-bottom', `${safeBottom}px`);
  $welcomePanel[0]?.style.setProperty('--th-runtime-safe-left', `${safeLeft}px`);

  const viewW = window.parent.innerWidth;
  const viewH = window.parent.innerHeight;
  const panelW = $welcomePanel.outerWidth() ?? 0;
  const panelH = $welcomePanel.outerHeight() ?? 0;
  const initialX = Math.max(20, (viewW - panelW) / 2);
  const initialY = Math.max(20, (viewH - panelH) / 2);
  $welcomePanel.css({ top: `${initialY}px`, left: `${initialX}px` });

  deps.enablePanelDragging($welcomePanel);

  const tutorialProfile =
    deps.uiSkin === 'xiangyata'
      ? {
          title: '象牙塔新手教学',
          firstTitle: '欢迎来到象牙塔控制台',
          firstSubtitle: '这套引导聚焦“结构写作 + 稳定控场”，约 1 分钟完成。',
          firstPoints: ['认识控制台入口与模块', '快速建立第一套预设', '掌握总结/大纲/快捷要求三类能力'],
          firstTip: '可在「帮助说明 -> 新手教学」随时重新打开。',
          secondTip: '建议先用中篇起步，再按剧情密度微调字数与段落。',
          thirdTip: '推荐：主角色绑定专属预设，临时对话使用全局预设。',
          fourthTip: '先做一轮短测，确认节奏、视角与模式切换符合预期。',
          iconClass: 'fas fa-landmark',
        }
      : {
          title: '日月西新手教学',
          firstTitle: '欢迎来到日月西控制台',
          firstSubtitle: '这个引导会在 1 分钟内带你完成从零到可用的核心设置。',
          firstPoints: ['了解面板入口与结构', '快速建立第一套预设', '掌握总结/大纲/快捷要求的使用方式'],
          firstTip: '随时可在「帮助说明 -> 新手教学」重新打开本流程。',
          secondTip: '对话模式适合喊出皮下交流，总结模式用于阶段归档。',
          thirdTip: '推荐：常用角色做绑定，临时角色走全局预设。',
          fourthTip: '建议先开一局测试聊天，确认模式切换与字数效果。',
          iconClass: 'fas fa-moon',
        };

  popup.find('.panel-header .header-title').text(tutorialProfile.title);
  popup.find('.tutorial-icon i').attr('class', tutorialProfile.iconClass);

  const tutorialSteps = [
    {
      title: tutorialProfile.firstTitle,
      subtitle: tutorialProfile.firstSubtitle,
      points: tutorialProfile.firstPoints,
      tip: tutorialProfile.firstTip,
    },
    {
      title: '第 1 步：配置核心写作参数',
      subtitle: '在预设编辑中调整字数、AI 模式、视角和抢话/转述开关。',
      points: ['先用短/中/长篇快速应用字数', '根据任务切换 AI 特殊模式', '保存后才会正式应用到当前会话'],
      tip: tutorialProfile.secondTip,
    },
    {
      title: '第 2 步：让预设自动生效',
      subtitle: '你可以绑定到当前角色卡，或设为全局默认，提高切换效率。',
      points: ['角色专属：点击链条图标绑定', '全局通用：点击地球图标设为全局', '切换角色后会自动读取对应预设'],
      tip: tutorialProfile.thirdTip,
    },
    {
      title: '第 3 步：熟悉三类实战功能',
      subtitle: '完成配置后，你可以用这些按钮快速控场。',
      points: ['总结&大纲：阶段回顾与剧情规划', '快速要求：一键修正叙事行为', '快捷开关：快照 prompt 状态并一键切换'],
      tip: tutorialProfile.fourthTip,
    },
  ] as const;

  const $title = popup.find('#tutorial-step-title');
  const $subtitle = popup.find('#tutorial-step-subtitle');
  const $points = popup.find('#tutorial-step-points');
  const $tip = popup.find('#tutorial-step-tip');
  const $progressBar = popup.find('#tutorial-progress-bar');
  const $progressText = popup.find('#tutorial-progress-text');
  const $prevBtn = popup.find('#qr-tutorial-prev');
  const $nextBtn = popup.find('#qr-start-setup');
  const $skipBtn = popup.find('#qr-tutorial-skip');

  let currentStep = 0;
  const renderStep = () => {
    const step = tutorialSteps[currentStep];
    const total = tutorialSteps.length;
    const percent = ((currentStep + 1) / total) * 100;

    $title.text(step.title);
    $subtitle.text(step.subtitle);
    $tip.text(step.tip);
    $progressBar.css('width', `${percent}%`);
    $progressText.text(`第 ${currentStep + 1} / ${total} 步`);
    $points.html(step.points.map(point => `<li>${point}</li>`).join(''));

    $prevBtn.prop('disabled', currentStep === 0);
    if (currentStep === total - 1) {
      $nextBtn.html('<i class="fas fa-compass"></i> 开始配置');
    } else {
      $nextBtn.html('<i class="fas fa-arrow-right"></i> 下一步');
    }
  };

  renderStep();

  let tutorialDismissed = false;
  const notifyTutorialDismissed = () => {
    if (tutorialDismissed) return;
    tutorialDismissed = true;
    deps.onDismiss?.();
  };

  setTimeout(() => popup.addClass('visible'), 50);

  popup.find('#close-welcome').on('click', () => {
    notifyTutorialDismissed();
    popup.removeClass('visible');
    setTimeout(() => popup.remove(), 300);
  });

  $prevBtn.on('click', () => {
    currentStep = Math.max(0, currentStep - 1);
    renderStep();
  });

  $nextBtn.on('click', () => {
    if (currentStep < tutorialSteps.length - 1) {
      currentStep += 1;
      renderStep();
      return;
    }
    notifyTutorialDismissed();
    popup.removeClass('visible');
    setTimeout(() => popup.remove(), 300);
    deps.showPanel(true);
    toastr.info(
      '请在预设管理中配置您的第一个预设，点击铅笔图标即可编辑；后续也可以直接从首页点进对应模块快捷修改',
      '新手教学完成',
    );
  });

  $skipBtn.on('click', () => {
    notifyTutorialDismissed();
    popup.removeClass('visible');
    setTimeout(() => popup.remove(), 300);
    deps.showPanel(true);
    toastr.info('已跳过教学，可在帮助说明里再次打开。');
  });
}

interface RenderStatusDisplayDeps {
  panel: JQuery<HTMLElement>;
  activeSettings: any;
  storage: any;
  getCharacterId: () => string;
}

export async function renderStatusDisplay(deps: RenderStatusDisplayDeps) {
  const { panel, activeSettings, storage, getCharacterId } = deps;
  const paragraphStyleMap: { [key: string]: string } = {
    long: '长段落',
    medium: '中段落',
    short: '短段落',
    free: '自由段落',
  };
  const wcString = `[${activeSettings.wordCount.min}-${activeSettings.wordCount.max}]字, [${activeSettings.paragraphCount.min}-${activeSettings.paragraphCount.max}]段 (${paragraphStyleMap[activeSettings.paragraphStyle] || '中段落'})`;
  const nsfwSettings = normalizeNsfwSettings(activeSettings.nsfw);
  const nsfwStatus = getNsfwRuntimeStatus();
  const nsfwModeMap = { off: '关闭', on: '常开', auto: '自动' } as const;
  const nsfwValue = nsfwStatus.available
    ? `${nsfwSettings.configured ? nsfwModeMap[nsfwSettings.mode] : '跟随预设'} · ${nsfwStatus.active ? '已激活' : '未激活'}`
    : `${nsfwSettings.configured ? nsfwModeMap[nsfwSettings.mode] : '跟随预设'} · 未找到总控`;
  const nsfwHomeMode = nsfwSettings.configured ? nsfwSettings.mode : nsfwStatus.active ? 'on' : 'off';
  const nsfwHomeModes = [
    ['off', '关闭'],
    ['on', '常开'],
    ['auto', '自动'],
  ] as const;
  const nsfwWorldbookModeMap = { none: '不联动', blue: '关蓝灯', green: '关蓝绿灯' } as const;
  const nsfwWorldbookModes = [
    ['none', '不联动'],
    ['blue', '关蓝灯'],
    ['green', '关蓝绿灯'],
  ] as const;
  const modeMap: { [key: string]: string } = { none: '常规', dialogue: '对话', outline: '大纲', summary: '总结' };
  const perspectiveMap: { [key: string]: string } = {
    third_person_omniscient: '全知',
    third_person_limited: '第三人称有限',
    first_person_limited: '第一人称有限',
    floating_person: '飘浮人称',
  };
  const userPronounMap: { [key: string]: string } = {
    third_person: '第三人称',
    second_person: '第二人称',
    first_person: '第一人称',
    floating_person: '飘浮人称',
  };
  const takeoverMap: { [key: string]: string } = {
    open: '全接管',
    half_open: '动作接管',
    assist: '辅助补全',
    closed: '严格禁止',
  };
  const narrateMap: { [key: string]: string } = {
    open: '完全转述',
    balanced: '平衡转述',
    light: '轻度转述',
    closed: '禁止转述',
  };

  const charId = getCharacterId();
  let presetName = '未命名';
  let isGlobal = true;
  if (charId && storage.bindings[charId] && storage.presets[storage.bindings[charId]]) {
    presetName = storage.presets[storage.bindings[charId]].name;
    isGlobal = false;
  } else if (storage.presets[storage.globalPresetId]) {
    presetName = storage.presets[storage.globalPresetId].name;
  }

  let activePresetId = storage.globalPresetId;
  if (charId && storage.bindings[charId] && storage.presets[storage.bindings[charId]]) {
    activePresetId = storage.bindings[charId];
  }

  const presetInfoHtml = `<div class="status-item full-width" data-action="edit_status_preset" data-preset-id="${activePresetId}" data-target="preset"><p class="status-label">当前生效预设 ${isGlobal ? '(全局)' : '(绑定)'}</p><p class="status-value">${presetName}</p></div>`;

  const presetStatus = `
       <div class="status-item" data-action="edit_status_setting" data-preset-id="${activePresetId}" data-target="perspective"><p class="status-label">视角</p><p class="status-value">${perspectiveMap[activeSettings.perspective]}</p></div>
       <div class="status-item" data-action="edit_status_setting" data-preset-id="${activePresetId}" data-target="userPronoun"><p class="status-label">User</p><p class="status-value">${userPronounMap[activeSettings.userPronoun]}</p></div>
       <div class="status-item" data-action="edit_status_setting" data-preset-id="${activePresetId}" data-target="takeover"><p class="status-label">抢话</p><p class="status-value">${takeoverMap[activeSettings.takeover]}</p></div>
       <div class="status-item" data-action="edit_status_setting" data-preset-id="${activePresetId}" data-target="narrate"><p class="status-label">转述</p><p class="status-value">${narrateMap[activeSettings.narrate]}</p></div>`;

  const statusHtml = `
       ${presetInfoHtml}
       <div class="status-item" data-action="edit_status_setting" data-preset-id="${activePresetId}" data-target="wordCount"><p class="status-label">字数</p><p class="status-value">${wcString}</p></div>
       <div class="status-item nsfw-status-item ${nsfwStatus.active ? 'is-active' : ''}" data-action="edit_status_setting" data-preset-id="${activePresetId}" data-target="nsfw" title="${escapeHtml(`${nsfwStatus.note}；${nsfwStatus.worldbook.note}`)}"><p class="status-label">NSFW</p><p class="status-value"><i class="nsfw-state-dot"></i>${nsfwValue}</p><div class="nsfw-home-modes" role="group" aria-label="NSFW 模式">${nsfwHomeModes.map(([mode, label]) => `<button type="button" class="${nsfwHomeMode === mode ? 'active' : ''}" data-nsfw-home-mode="${mode}">${label}</button>`).join('')}</div><p class="nsfw-worldbook-status">世界书：${nsfwWorldbookModeMap[nsfwSettings.worldbookMode]} · ${escapeHtml(nsfwStatus.worldbook.note)}</p><div class="nsfw-home-modes nsfw-worldbook-modes" role="group" aria-label="NSFW 世界书联动">${nsfwWorldbookModes.map(([mode, label]) => `<button type="button" class="${nsfwSettings.worldbookMode === mode ? 'active' : ''}" data-nsfw-home-worldbook="${mode}">${label}</button>`).join('')}</div></div>
       <div class="status-item" data-action="edit_status_setting" data-preset-id="${activePresetId}" data-target="aiMode"><p class="status-label">AI模式</p><p class="status-value">${modeMap[activeSettings.aiMode] || '未知'}</p></div>
       <div class="status-grid">${presetStatus}</div>
   `;
  panel.find('#status-display').html(statusHtml);
}

interface RenderPresetsListDeps {
  panel: JQuery<HTMLElement>;
  storage: any;
  getCharacterId: () => string;
}

export async function renderPresetsList(deps: RenderPresetsListDeps) {
  const { panel, storage, getCharacterId } = deps;
  const container = panel.find('#presets-list-container');
  container.empty();

  const currentCharId = getCharacterId();
  const currentBinding = storage.bindings[currentCharId];

  const actionBar = $(`<div class="button-group" style="margin-bottom: 15px;">
        <button data-action="create_preset"><i class="fas fa-plus"></i> 新建预设</button>
        <button data-action="import_preset"><i class="fas fa-file-import"></i> 导入预设</button>
    </div>`);
  container.append(actionBar);

  Object.values(storage.presets).forEach((preset: any) => {
    const isGlobal = storage.globalPresetId === preset.id;
    const isBound = currentBinding === preset.id;
    const isActive = isBound || (!currentBinding && isGlobal);

    const item = $(`
            <div class="preset-list-item ${isActive ? 'active-item' : ''}" style="${isActive ? 'border-color: var(--panel-text-accent); background: var(--highlight-bg);' : ''}">
                <div class="preset-info">
                    <div class="preset-name">${preset.name}</div>
                    <div class="preset-tags">
                        ${isGlobal ? '<span class="tag global">全局默认</span>' : ''}
                        ${isBound ? '<span class="tag active">当前绑定</span>' : ''}
                        <span class="tag">版本: ${preset.id.substring(0, 6)}</span>
                    </div>
                </div>
                <div class="preset-actions">
                    <button title="编辑" data-action="edit_preset" data-id="${preset.id}"><i class="fas fa-edit"></i></button>
                    ${!isBound ? `<button title="绑定当前角色" data-action="bind_preset" data-id="${preset.id}"><i class="fas fa-link"></i></button>` : `<button title="解绑" data-action="unbind_preset" data-id="${preset.id}"><i class="fas fa-unlink"></i></button>`}
                    ${!isGlobal ? `<button title="设为全局默认" data-action="set_global" data-id="${preset.id}"><i class="fas fa-globe"></i></button>` : ''}
                    <button title="导出" data-action="export_preset" data-id="${preset.id}"><i class="fas fa-file-export"></i></button>
                    ${preset.id !== 'default' && preset.id !== storage.globalPresetId && !isBound ? `<button title="删除" data-action="delete_preset" data-id="${preset.id}"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        `);
    container.append(item);
  });
}

interface UpdateButtonStatesDeps {
  panel: JQuery<HTMLElement>;
  sourceSettings: any;
}

export async function updateButtonStates(deps: UpdateButtonStatesDeps) {
  const { panel, sourceSettings } = deps;
  panel.find('#preset-editor-container button[data-setting]').each((_, el) => {
    const btn = $(el);
    const setting = btn.data('setting');
    const value = btn.data('value');
    btn.toggleClass('active', sourceSettings[setting] === value);
  });
}

interface RenderPresetEditorDeps {
  panel: JQuery<HTMLElement>;
  presetId: string;
  storage: any;
  setStagedPrompts: (prompts: any[] | null) => void;
  setTempThinkingStyle: (style: 'conventional' | 'minimalist' | null) => void;
}

export async function renderPresetEditor(deps: RenderPresetEditorDeps) {
  const { panel, presetId, storage, setStagedPrompts, setTempThinkingStyle } = deps;
  const preset = storage.presets[presetId];
  if (!preset) return;

  setStagedPrompts(null);
  setTempThinkingStyle(preset.thinkingStyle || null);

  const container = panel.find('#preset-editor-container');
  container.empty();

  container.append(`
        <div class="setting-group">
            <div class="setting-group-title">预设名称</div>
            <input type="text" id="preset-name" value="${preset.name}" class="input-full-width">
        </div>
    `);

  const lenDefs = preset.lengthDefinitions;
  const lengthDefHtml = `
        <div class="setting-group">
            <div class="setting-group-title">篇幅定义 (字数/段落)</div>
            <div class="custom-input-group length-definition-row">
                <span>短篇</span>
                <input type="number" class="len-def" data-type="short" data-field="wc-min" value="${lenDefs.short.wc.min}" placeholder="最小字">
                <input type="number" class="len-def" data-type="short" data-field="wc-max" value="${lenDefs.short.wc.max}" placeholder="最大字">
            </div>
             <div class="custom-input-group length-definition-row is-paragraph-row">
                <span></span>
                <input type="number" class="len-def" data-type="short" data-field="pc-min" value="${lenDefs.short.pc.min}" placeholder="最小段">
                <input type="number" class="len-def" data-type="short" data-field="pc-max" value="${lenDefs.short.pc.max}" placeholder="最大段">
            </div>
            <div class="custom-input-group length-definition-row is-series-start">
                <span>中篇</span>
                <input type="number" class="len-def" data-type="medium" data-field="wc-min" value="${lenDefs.medium.wc.min}">
                <input type="number" class="len-def" data-type="medium" data-field="wc-max" value="${lenDefs.medium.wc.max}">
            </div>
             <div class="custom-input-group length-definition-row is-paragraph-row">
                <span></span>
                <input type="number" class="len-def" data-type="medium" data-field="pc-min" value="${lenDefs.medium.pc.min}">
                <input type="number" class="len-def" data-type="medium" data-field="pc-max" value="${lenDefs.medium.pc.max}">
            </div>
            <div class="custom-input-group length-definition-row is-series-start">
                <span>长篇</span>
                <input type="number" class="len-def" data-type="long" data-field="wc-min" value="${lenDefs.long.wc.min}">
                <input type="number" class="len-def" data-type="long" data-field="wc-max" value="${lenDefs.long.wc.max}">
            </div>
             <div class="custom-input-group length-definition-row is-paragraph-row">
                <span></span>
                <input type="number" class="len-def" data-type="long" data-field="pc-min" value="${lenDefs.long.pc.min}">
                <input type="number" class="len-def" data-type="long" data-field="pc-max" value="${lenDefs.long.pc.max}">
            </div>
        </div>
    `;
  container.append(lengthDefHtml);

  const wc = preset.wordCount;
  const pc = preset.paragraphCount;
  const wordCountHtml = `
        <div class="setting-group">
            <div class="setting-group-title">当前生效字数</div>
            <div class="quick-settings-group">
               <span>快速应用:</span>
               <div class="button-group">
                   <button data-wc-preset="short">短篇</button>
                   <button data-wc-preset="medium">中篇</button>
                   <button data-wc-preset="long">长篇</button>
               </div>
            </div>
            <div class="quick-settings-group" style="margin-top:8px;">
               <span>段落设置:</span>
               <div class="button-group">
                   <button data-setting="paragraphStyle" data-value="long">长段落</button>
                   <button data-setting="paragraphStyle" data-value="medium">中段落</button>
                   <button data-setting="paragraphStyle" data-value="short">短段落</button>
                   <button data-setting="paragraphStyle" data-value="free">自由段落</button>
                </div>
             </div>
            <div class="custom-input-container">
               <div class="custom-input-group current-length-row">
                   <input type="number" id="wc-min" value="${wc.min}"><span>-</span><input type="number" id="wc-max" value="${wc.max}"><span>字</span>
               </div>
               <div class="custom-input-group current-length-row">
                   <input type="number" id="pc-min" value="${pc.min}"><span>-</span><input type="number" id="pc-max" value="${pc.max}"><span>段</span>
               </div>
            </div>
        </div>`;
  container.append(wordCountHtml);

  const nsfw = normalizeNsfwSettings(preset.nsfw);
  const editorNsfwStatus = getNsfwRuntimeStatus();
  const displayedNsfwMode =
    nsfw.configured || !editorNsfwStatus.available ? nsfw.mode : editorNsfwStatus.active ? 'on' : 'off';
  const nsfwModeLabels: Array<[NsfwSettings['mode'], string]> = [
    ['off', '关闭'],
    ['on', '常开'],
    ['auto', '自动判断'],
  ];
  const nsfwWorldbookModeLabels: Array<[NsfwSettings['worldbookMode'], string]> = [
    ['none', '不联动'],
    ['blue', '关蓝灯'],
    ['green', '关蓝绿灯'],
  ];
  const nsfwHtml = `
    <div class="setting-group nsfw-setting-group">
      <div class="setting-group-title">NSFW 自动判断</div>
      <div class="nsfw-editor-live ${editorNsfwStatus.active ? 'is-active' : ''}"><i></i><span>当前预设总控：${editorNsfwStatus.available ? (editorNsfwStatus.active ? '已激活' : '未激活') : '未找到'}</span></div>
      <p class="setting-help">自动模式会在发送前判断：关闭词优先，其次启动词；未命中时读取上一条回复 &lt;meow_FM&gt; 中的“NSFW：当前回合/20”，摘要缺失才回退到正文自检标记。</p>
      <div class="button-group nsfw-mode-buttons">
        ${nsfwModeLabels.map(([mode, label]) => `<button class="${displayedNsfwMode === mode ? 'active' : ''}" data-nsfw-mode="${mode}">${label}</button>`).join('')}
      </div>
      <div class="nsfw-config-grid">
        <label class="nsfw-keyword-field"><span>启动词</span><small>只扫描本次用户输入，命中后当回合开启。</small><textarea id="nsfw-open-keywords" rows="4">${escapeHtml(nsfw.openKeywords.join('、'))}</textarea></label>
        <label class="nsfw-keyword-field"><span>关闭词（优先）</span><small>命中后立刻关闭，优先级高于启动词。</small><textarea id="nsfw-close-keywords" rows="3">${escapeHtml(nsfw.closeKeywords.join('、'))}</textarea></label>
      </div>
      <div class="quick-settings-group nsfw-hold-row">
        <span>事后缓冲:</span>
        <div class="button-group">
          ${[0, 1, 2].map(turns => `<button class="${nsfw.holdTurns === turns ? 'active' : ''}" data-nsfw-hold="${turns}">${turns} 回合</button>`).join('')}
        </div>
      </div>
      <div class="nsfw-worldbook-config">
        <div class="setting-group-title">NSFW 世界书联动</div>
        <p class="setting-help">仅在“❖涩涩一键开关❖”关闭时过滤名称带标记的条目；蓝灯指常驻条目，绿灯包含非常驻/关键词或向量条目。当前效果：${escapeHtml(editorNsfwStatus.worldbook.note)}</p>
        <div class="button-group nsfw-mode-buttons">
          ${nsfwWorldbookModeLabels.map(([mode, label]) => `<button class="${nsfw.worldbookMode === mode ? 'active' : ''}" data-nsfw-worldbook="${mode}">${label}</button>`).join('')}
        </div>
        <label class="nsfw-keyword-field nsfw-worldbook-marker-field"><span>条目名称标记</span><small>按条目“名称/备注”匹配，不区分大小写；多个标记可用顿号、逗号、空格或换行分隔。</small><textarea id="nsfw-worldbook-markers" rows="2">${escapeHtml(nsfw.worldbookMarkers.join('、'))}</textarea></label>
      </div>
      <button type="button" class="nsfw-reset-keywords" data-action="reset_nsfw_keywords">恢复默认词表</button>
      <p class="setting-help nsfw-default-summary">默认词表：${DEFAULT_NSFW_SETTINGS.openKeywords.length} 个启动词，${DEFAULT_NSFW_SETTINGS.closeKeywords.length} 个关闭词；世界书默认标记为 NSFW。摘要只读取明确的“NSFW：数字/20”，不会误判其他进度值。</p>
    </div>`;
  container.append(nsfwHtml);

  const aiModeHtml = `<div class="setting-group"><div class="setting-group-title">AI特殊模式</div><div class="button-group">
        <button data-setting="aiMode" data-value="none">常规模式</button>
        <button data-setting="aiMode" data-value="dialogue">对话模式</button>
        <button data-setting="aiMode" data-value="outline">大纲模式</button>
        <button data-setting="aiMode" data-value="summary">总结模式</button>
    </div></div>`;
  container.append(aiModeHtml);

  const perspectiveHtml = `<div class="setting-group"><div class="setting-group-title">叙事视角</div><div class="button-group">
        <button data-setting="perspective" data-value="third_person_omniscient">全知视角</button>
        <button data-setting="perspective" data-value="third_person_limited">第三人称有限</button>
        <button data-setting="perspective" data-value="first_person_limited">第一人称有限</button>
        <button data-setting="perspective" data-value="floating_person">飘浮人称</button>
    </div></div>`;
  container.append(perspectiveHtml);

  const userPronounHtml = `<div class="setting-group"><div class="setting-group-title">User 人称</div><div class="button-group">
        <button data-setting="userPronoun" data-value="third_person">第三人称</button>
        <button data-setting="userPronoun" data-value="second_person">第二人称</button>
        <button data-setting="userPronoun" data-value="first_person">第一人称</button>
        <button data-setting="userPronoun" data-value="floating_person">飘浮人称</button>
    </div></div>`;
  container.append(userPronounHtml);

  const takeoverHtml = `<div class="setting-group"><div class="setting-group-title">抢话开关</div><div class="button-group">
        <button data-setting="takeover" data-value="open">全接管</button>
        <button data-setting="takeover" data-value="half_open">动作接管</button>
        <button data-setting="takeover" data-value="assist">辅助补全</button>
        <button data-setting="takeover" data-value="closed">严格禁止</button>
    </div></div>`;
  container.append(takeoverHtml);

  const narrateHtml = `<div class="setting-group"><div class="setting-group-title">转述开关</div><div class="button-group">
        <button data-setting="narrate" data-value="open">完全转述</button>
        <button data-setting="narrate" data-value="balanced">平衡转述</button>
        <button data-setting="narrate" data-value="light">轻度转述</button>
        <button data-setting="narrate" data-value="closed">禁止转述</button>
    </div></div>`;
  container.append(narrateHtml);

  container.append(
    `<div class="setting-group"><div class="setting-group-title">高级：指令覆盖 (在此处修改仅影响本预设)</div><button data-action="toggle_preset_commands">显示/隐藏 指令详情</button><div id="preset-commands-wrapper" style="display:none; margin-top:10px;"></div></div>`,
  );

  const actionsHtml = `
    <div class="setting-group button-grid-2">
      <button data-action="save_preset_changes">保存更改</button>
      <button data-action="cancel_preset_changes" style="background-color: #f56565; color: white;">取消</button>
    </div>`;
  container.append(actionsHtml);

  const cmdWrapper = container.find('#preset-commands-wrapper');
  const commandMapping = [
    { key: 'paragraph_patch_long', label: '段落补丁 - 长段落' },
    { key: 'paragraph_patch_medium', label: '段落补丁 - 中段落' },
    { key: 'paragraph_patch_short', label: '段落补丁 - 短段落' },
    { key: 'paragraph_patch_free', label: '段落补丁 - 自由段落' },
    { key: 'takeover_open', label: '抢话 - 全接管' },
    { key: 'takeover_half_open', label: '抢话 - 动作接管' },
    { key: 'takeover_assist', label: '抢话 - 辅助补全' },
    { key: 'takeover_closed', label: '抢话 - 严格禁止' },
    { key: 'narrate_open', label: '转述 - 完全转述' },
    { key: 'narrate_balanced', label: '转述 - 平衡转述' },
    { key: 'narrate_light', label: '转述 - 轻度转述' },
    { key: 'narrate_closed', label: '转述 - 禁止转述' },
    { key: 'perspective_third_person_omniscient', label: '叙事视角 - 全知' },
    { key: 'perspective_third_person_limited', label: '叙事视角 - 第三人称有限' },
    { key: 'perspective_first_person_limited', label: '叙事视角 - 第一人称有限' },
    { key: 'perspective_floating_person', label: '叙事视角 - 飘浮人称' },
    { key: 'userPronoun_third_person', label: 'User人称 - 第三人称' },
    { key: 'userPronoun_second_person', label: 'User人称 - 第二人称' },
    { key: 'userPronoun_first_person', label: 'User人称 - 第一人称' },
    { key: 'userPronoun_floating_person', label: 'User人称 - 飘浮人称' },
  ];
  commandMapping.forEach(({ key, label }) => {
    const value = preset.commands[key] || defaultCommands[key as keyof typeof defaultCommands] || '';
    const html = `
        <div class="command-setting-group">
            <label>${label}</label>
            <textarea class="preset-command-input" data-command-key="${key}">${value}</textarea>
        </div>
        `;
    cmdWrapper.append(html);
  });

  await updateButtonStates({ panel, sourceSettings: preset });
}

interface RenderQuickSwitchPanelDeps {
  panel: JQuery<HTMLElement>;
  storage: any;
  getActivePresetId: () => string;
  getCharacterId: () => string;
  getPreset: (name: string) => Preset;
  builtinQuickSwitchSchemes: Array<any>;
}

export async function renderQuickSwitchPanel(deps: RenderQuickSwitchPanelDeps) {
  const { panel, storage, getActivePresetId, getCharacterId, getPreset, builtinQuickSwitchSchemes } = deps;
  const container = panel.find('#quick-switches-container');
  container.empty();

  const activePresetId = getActivePresetId();
  const activePreset = storage.presets[activePresetId];
  if (!activePreset) {
    container.append('<p style="padding:10px; opacity:0.7;">当前没有可用的脚本预设。</p>');
    return;
  }

  if (!activePreset.quickSwitchProfiles) {
    activePreset.quickSwitchProfiles = {};
  }
  if (!activePreset.quickSwitchRuntimeStates) {
    activePreset.quickSwitchRuntimeStates = {};
  }

  container.append(`
    <div class="quick-switch-intro">
      当前生效脚本预设：<b>${activePreset.name}</b>
    </div>
    <div class="button-group quick-switch-toolbar">
      <button data-action="create_quick_switch_profile"><i class="fas fa-plus"></i> 新建快捷开关</button>
    </div>
  `);

  const builtinNames = new Set(builtinQuickSwitchSchemes.map(item => item.name));
  const currentPreset = getPreset('in_use');
  const activePrompts = currentPreset?.prompts || [];
  const characterId = getCharacterId();
  const seenCustomProfileIds = new Set<string>();
  const customProfiles = [
    ...Object.values(storage.quickSwitchProfiles || {}),
    ...Object.values(storage.presets).flatMap((preset: any) => Object.values(preset.quickSwitchProfiles || {})),
  ]
    .filter((profile: any) => {
      if (!profile || builtinNames.has(profile.name) || seenCustomProfileIds.has(String(profile.id))) return false;
      seenCustomProfileIds.add(String(profile.id));
      return true;
    })
    .sort((a: any, b: any) => b.updateTime - a.updateTime);

  const builtinRows = builtinQuickSwitchSchemes
    .map((item, index) => {
      const profileId = `builtin:${index}`;
      const section = String(item.section || '其他').trim() || '其他';
      const runtimeState = activePreset.quickSwitchRuntimeStates?.[profileId];
      const isCustomizeScheme = item?.type === 'customize';
      const isModeScheme = item?.type === 'mode' && Array.isArray(item?.modes) && item.modes.length > 0;

      if (isCustomizeScheme) {
        return {
          section,
          html: `
            <div class="quick-switch-row">
              <div class="quick-switch-meta">
                <div class="quick-switch-name">${item.name}</div>
                <div class="quick-switch-desc">内置定制 · 按分区管理子条目</div>
              </div>
              <div class="quick-switch-actions">
                <button class="quick-switch-sub-btn" data-action="open_quick_switch_suboptions" data-id="${profileId}">定制</button>
              </div>
            </div>
          `,
        };
      }

      if (isModeScheme) {
        const modes = item.modes as Array<any>;
        const fallbackModeId = item.defaultModeId || modes[0].id;
        const currentModeId = runtimeState?.modeId || fallbackModeId;
        const currentMode = modes.find(mode => mode.id === currentModeId) || modes[0];
        return {
          section,
          html: `
          <div class="quick-switch-row">
            <div class="quick-switch-meta">
              <div class="quick-switch-name">${item.name}</div>
              <div class="quick-switch-desc">内置模式 · 不可删除</div>
            </div>
            <button class="quick-switch-mode-btn" data-action="select_quick_switch_mode" data-id="${profileId}">
              <span class="quick-switch-mode-label">${currentMode?.label || '未设置'}</span>
            </button>
          </div>
        `,
        };
      }

      const defaultEnabled = !!item?.defaultEnabled;
      const onRules = Array.isArray(item?.on?.rules) ? item.on.rules : Array.isArray(item?.rules) ? item.rules : [];
      const groupRules = resolveBaiBaiGroupRules(currentPreset, item?.on?.selection?.groups, onRules);
      const effectiveOnRules = onRules.length ? onRules : groupRules;
      const inferredEnabled = inferQuickSwitchEnabledFromPrompts(activePrompts, effectiveOnRules);
      const isOn =
        inferredEnabled ?? (typeof runtimeState?.enabled === 'boolean' ? !!runtimeState.enabled : defaultEnabled);
      if (runtimeState) {
        runtimeState.enabled = isOn;
      }
      const explicitDisplayRules = Array.isArray(item?.on?.selection?.displayRules)
        ? item.on.selection.displayRules
        : null;
      const customizableRules = combineDisplayRules(explicitDisplayRules, groupRules) || effectiveOnRules;
      const hasConfiguredGroups = Array.isArray(item?.on?.selection?.groups) && item.on.selection.groups.length > 0;
      const groupReadFailed = hasConfiguredGroups && groupRules.length === 0;
      const hasSubOptions =
        item?.type !== 'mode' &&
        (item?.on?.selection?.enabled ?? true) === true &&
        (customizableRules.length > 1 || groupReadFailed);
      return {
        section,
        html: `
        <div class="quick-switch-row ${isOn ? 'is-on' : ''}">
          <div class="quick-switch-meta">
            <div class="quick-switch-name">${item.name}</div>
            <div class="quick-switch-desc">内置方案 · 不可删除</div>
          </div>
          <div class="quick-switch-actions">
            ${hasSubOptions ? `<button class="quick-switch-sub-btn ${groupReadFailed ? 'has-warning' : ''}" data-action="open_quick_switch_suboptions" data-id="${profileId}" ${groupReadFailed ? 'title="未读取到柏柏分组子条目，点击查看提示"' : ''}>${groupReadFailed ? '检查分组' : '定制'}</button>` : ''}
            <button class="quick-switch-toggle ${isOn ? 'is-on' : ''}" data-action="toggle_quick_switch_profile" data-id="${profileId}" aria-pressed="${isOn ? 'true' : 'false'}">
              <span class="quick-switch-dot"></span>
              <span class="quick-switch-text">${isOn ? '开' : '关'}</span>
            </button>
          </div>
        </div>
      `,
      };
    })
    .filter(row => !!row.html);

  const builtinSections = new Map<string, string[]>();
  builtinRows.forEach(row => {
    if (!builtinSections.has(row.section)) builtinSections.set(row.section, []);
    builtinSections.get(row.section)!.push(row.html);
  });
  const builtinsHtml = Array.from(builtinSections.entries())
    .map(
      ([section, rows]) => `
        <div class="quick-switch-builtin-group">
          <div class="quick-switch-builtin-group-title">${section}</div>
          ${rows.join('')}
        </div>
      `,
    )
    .join('');

  container.append(`
    <div class="quick-switch-section">
      <div class="quick-switch-divider"><span>默认快捷开关</span></div>
      ${builtinsHtml || '<div class="quick-switch-empty">暂无内置方案。</div>'}
    </div>
  `);

  if (customProfiles.length === 0) {
    container.append('<div class="quick-switch-empty">暂无自定义快捷开关，点击上方按钮可创建。</div>');
    return;
  }

  const globalCount = customProfiles.filter((profile: any) => profile.scope !== 'character').length;
  const characterCount = customProfiles.length - globalCount;
  const activeScopeFilter = String(container.attr('data-custom-scope-filter') || 'all');
  container.append(`
    <div class="quick-switch-divider"><span>自定义快捷开关</span></div>
    <div class="quick-switch-scope-tabs" role="tablist" aria-label="自定义快捷开关范围筛选">
      <button class="${activeScopeFilter === 'all' ? 'active' : ''}" data-quick-scope-filter="all">全部 ${customProfiles.length}</button>
      <button class="${activeScopeFilter === 'global' ? 'active' : ''}" data-quick-scope-filter="global">全局 ${globalCount}</button>
      <button class="${activeScopeFilter === 'character' ? 'active' : ''}" data-quick-scope-filter="character">角色绑定 ${characterCount}</button>
    </div>
    <div class="quick-switch-scope-empty" style="display:none;">该分类暂无快捷开关。</div>
  `);

  customProfiles.forEach((profile: any) => {
    const runtimeState = activePreset.quickSwitchRuntimeStates?.[profile.id];
    const inferredEnabled = inferQuickSwitchEnabledFromPrompts(
      activePrompts,
      Array.isArray(profile.rules) ? profile.rules : [],
    );
    const rulesCount = Array.isArray(profile.rules) ? profile.rules.length : 0;
    const boundCharacterIds = Array.isArray(profile.characterIds)
      ? profile.characterIds.map(String)
      : profile.characterId !== null && profile.characterId !== undefined && profile.characterId !== ''
        ? [String(profile.characterId)]
        : [];
    const isCharacterScope = profile.scope === 'character';
    const isBoundToCurrentCharacter = !isCharacterScope || (!!characterId && boundCharacterIds.includes(characterId));
    const isOn = isBoundToCurrentCharacter && (inferredEnabled ?? !!runtimeState?.enabled);
    if (runtimeState) runtimeState.enabled = isOn;
    const scopeLabel = isCharacterScope
      ? `角色绑定 ${boundCharacterIds.length} 张${isBoundToCurrentCharacter ? ' · 当前角色已绑定' : ' · 当前角色未绑定'}`
      : '全局';

    const item = $(`
      <div class="quick-switch-row quick-switch-custom-row ${isOn ? 'is-on' : ''} ${isBoundToCurrentCharacter ? '' : 'is-unavailable'}" data-scope="${isCharacterScope ? 'character' : 'global'}">
        <div class="quick-switch-meta">
          <div class="quick-switch-name">${profile.name}</div>
          <div class="quick-switch-desc">${scopeLabel} · 自定义条目: ${rulesCount} · 更新: ${new Date(profile.updateTime).toLocaleString()}</div>
        </div>
        <div class="quick-switch-actions">
          <button class="quick-switch-sub-btn quick-switch-edit-btn" data-action="edit_quick_switch_profile" data-id="${profile.id}" aria-label="编辑 ${profile.name}" title="编辑快捷开关"><i class="fas fa-pen"></i></button>
          <button class="quick-switch-delete-btn" data-action="delete_quick_switch_profile" data-id="${profile.id}" aria-label="删除 ${profile.name}" title="删除快捷开关"><i class="fas fa-trash-alt"></i></button>
          <button class="quick-switch-toggle ${isOn ? 'is-on' : ''}" data-action="toggle_quick_switch_profile" data-id="${profile.id}" aria-pressed="${isOn ? 'true' : 'false'}" ${isBoundToCurrentCharacter ? '' : 'disabled title="该快捷开关未绑定当前角色"'}>
            <span class="quick-switch-dot"></span>
            <span class="quick-switch-text">${isOn ? '开' : '关'}</span>
          </button>
        </div>
      </div>
    `);
    container.append(item);
  });

  const applyScopeFilter = (scope: string) => {
    container.attr('data-custom-scope-filter', scope);
    container.find('[data-quick-scope-filter]').removeClass('active');
    container.find(`[data-quick-scope-filter="${scope}"]`).addClass('active');
    let visibleCount = 0;
    container.find('.quick-switch-custom-row').each((_, rowEl) => {
      const $row = $(rowEl);
      const visible = scope === 'all' || $row.attr('data-scope') === scope;
      $row.toggle(visible);
      if (visible) visibleCount += 1;
    });
    container.find('.quick-switch-scope-empty').toggle(visibleCount === 0);
  };
  container.off('click.quickSwitchScope').on('click.quickSwitchScope', '[data-quick-scope-filter]', e => {
    applyScopeFilter(String($(e.currentTarget).attr('data-quick-scope-filter') || 'all'));
  });
  applyScopeFilter(activeScopeFilter);
}

export function setPanelTheme(panel: JQuery<HTMLElement>, theme: 'light' | 'dark') {
  const isDark = theme === 'dark';
  panel.find('.control-panel').toggleClass('dark-mode', isDark);
}

export function isPanelInDarkMode(panel: JQuery<HTMLElement> | null) {
  return !!(panel && panel.find('.control-panel').hasClass('dark-mode'));
}

export function applyDialogTheme(panel: JQuery<HTMLElement> | null, $dialog: JQuery<HTMLElement>) {
  const isDark = isPanelInDarkMode(panel);
  $dialog.toggleClass('dark-mode', isDark);

  const uiSkin = panel?.find('.control-panel').attr('data-ui-skin');
  if (uiSkin) {
    $dialog.attr('data-ui-skin', uiSkin);
  }

  $dialog.find('.dialog-text').css('color', 'var(--panel-text-main)');
}
