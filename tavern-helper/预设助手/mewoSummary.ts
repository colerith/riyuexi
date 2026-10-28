/** Mewo-Large-Summary 1.2.17 的公开桥接接口；不复制配置或接管世界书写入。 */
interface MewoState {
  ready: boolean;
  enabled: boolean;
  autoEnabled: boolean;
  busy: boolean;
  paused: boolean;
  tokens: number | null;
  sourceVersion: string;
  message: string;
}

interface MewoIntegration {
  getState(): MewoState;
  setEnabled(value: boolean): Promise<boolean>;
  runManual(options: { operation: 'summary' | 'compact'; mode?: 'incremental' | 'merged' }): Promise<boolean>;
  mount(container: HTMLElement): boolean;
  unmount(container: HTMLElement): boolean;
}

const summaryIcons = {
  book: '<path d="M12 6C9 3 5 3 3 4v15c3-1 6-1 9 2 3-3 6-3 9-2V4c-2-1-6-1-9 2Zm0 0v15"/>',
  settings: '<path d="M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6"/>',
  file: '<path d="M14 3H5v18h14V8Zm0 0v5h5M8 12h8M8 16h8"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8Zm-10 9 10 5 10-5M2 16l10 5 10-5"/>',
  pen: '<path d="m16 3 5 5-12 12-6 1 1-6Zm-3 3 5 5"/>',
  history: '<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l3 2"/>',
  power: '<path d="M12 2v10M6 5a9 9 0 1 0 12 0"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 2M4 16l2 2a7 7 0 0 0 12-1"/>',
  collapse: '<path d="m6 15 6-6 6 6"/>',
};
function summaryIcon(name: keyof typeof summaryIcons) {
  return `<svg class="summary-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${summaryIcons[name]}</svg>`;
}

export const mewoSummaryHtml = `
  <section class="mewo-card" aria-label="喵喵大总结">
    <div class="mewo-heading"><div class="summary-section-title" role="heading" aria-level="3">${summaryIcon('book')}<span>喵喵大总结</span></div><span class="mewo-badge" data-mewo-version>未连接</span></div>
    <p class="setting-help">将旧剧情整理为世界书记忆，保存确认后隐藏旧楼层；支持自动触发、独立 API 和历史恢复。</p>
    <div class="mewo-status" role="status" aria-live="polite"><span data-mewo-status></span><small data-mewo-tokens></small></div>
    <div class="button-grid-2 mewo-actions">
      <button type="button" data-mewo="overview">${summaryIcon('book')} 总结面板</button>
      <button type="button" data-mewo="settings">${summaryIcon('settings')} 总结配置</button>
      <button type="button" data-mewo="incremental">${summaryIcon('file')} 增量大总结</button>
      <button type="button" data-mewo="merged">${summaryIcon('layers')} 合并大总结</button>
      <button type="button" data-mewo="prompt">${summaryIcon('pen')} 提示词模板</button>
      <button type="button" data-mewo="directory">${summaryIcon('history')} 总结历史</button>
      <button type="button" data-mewo="toggle" aria-pressed="false">${summaryIcon('power')}<span data-mewo-toggle-label>启用大总结</span></button>
      <button type="button" data-mewo="refresh">${summaryIcon('refresh')} 刷新接入状态</button>
    </div>
    <div class="mewo-install" data-mewo-install>
      <p>请在酒馆「扩展 → 安装扩展」中安装下方项目；已安装时请更新到支持面板接入的版本（1.2.17 起），刷新酒馆后重试。</p>
      <a href="https://github.com/AYUUKI-K/Mewo-Large-Summary" target="_blank" rel="noopener noreferrer">查看项目与安装说明 ↗</a>
      <input aria-label="喵喵大总结安装地址" readonly value="https://github.com/AYUUKI-K/Mewo-Large-Summary">
    </div>
    <div class="mewo-workspace" data-mewo-workspace hidden>
      <div class="mewo-workspace-heading"><div class="summary-section-title" role="heading" aria-level="3" data-mewo-workspace-title>总结面板</div><button type="button" class="mewo-collapse" data-mewo="collapse">${summaryIcon('collapse')}<span>收起</span></button></div>
      <div data-mewo-mount></div>
    </div>
  </section>`;

export const mewoSummaryCss = `
  #control-panel-container .summary-content { display: flex; flex-direction: column; gap: 16px; }
  #control-panel-container .mewo-card, #control-panel-container .summary-legacy { padding: 14px; border: 1px solid var(--panel-border); border-radius: 12px; background: var(--panel-button-bg); min-width: 0; }
  #control-panel-container .mewo-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
  #control-panel-container .summary-section-title { display: flex; align-items: center; gap: 8px; min-width: 0; margin: 0; padding: 0; border: none; background: none; box-shadow: none; font-family: inherit; font-size: 1em; font-weight: 700; line-height: 1.4; color: var(--panel-text-accent); text-shadow: none; }
  #control-panel-container .summary-section-title > i { flex: 0 0 18px; width: 18px; margin: 0; text-align: center; opacity: .9; }
  #control-panel-container .mewo-badge { font-size: 11px; padding: 3px 8px; border: 1px solid var(--panel-border); border-radius: 20px; color: var(--panel-text-accent); }
  #control-panel-container .mewo-status { display: flex; flex-direction: column; gap: 4px; margin: 12px 0; padding: 10px; border-radius: 8px; background: var(--panel-button-bg); color: var(--panel-text-main); line-height: 1.5; }
  #control-panel-container .mewo-status small, #control-panel-container .mewo-install { color: var(--panel-text-value); font-size: 12px; line-height: 1.6; }
  #control-panel-container .mewo-install { margin-top: 12px; overflow-wrap: anywhere; }
  #control-panel-container .mewo-install a { color: var(--panel-text-accent); }
  #control-panel-container .mewo-install input { box-sizing: border-box; width: 100%; min-width: 0; margin-top: 8px; padding: 8px; border: 1px solid var(--panel-border); border-radius: 6px; background: var(--panel-button-bg); color: var(--panel-text-main); font-size: 12px; }
  #control-panel-container .mewo-workspace { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--panel-border); }
  #control-panel-container .mewo-workspace[hidden], #control-panel-container .mewo-install[hidden] { display: none !important; }
  #control-panel-container .mewo-card button:disabled { opacity: .45; cursor: not-allowed; }
  #control-panel-container .mewo-card button:focus-visible { outline: 2px solid var(--panel-text-accent); outline-offset: 2px; }
  #control-panel-container [data-mewo-mount] { min-width: 0; margin-top: 10px; }
  #control-panel-container [data-mewo-mount] .als-settings {
    --als-ink: var(--panel-text-main); --als-ink-secondary: var(--panel-text-value); --als-ink-muted: var(--panel-text-value);
    --als-paper: var(--panel-button-bg); --als-bookmark: var(--panel-text-accent); --als-rule: var(--panel-border);
    --als-control-line: var(--panel-border); font-family: inherit; color: var(--panel-text-main); text-shadow: none;
  }
  #control-panel-container [data-mewo-mount] .als-settings .inline-drawer-content { display: block !important; }
  #control-panel-container [data-mewo-mount] .als-settings > .inline-drawer > .inline-drawer-header { display: none; }
  #control-panel-container .summary-icon { display: inline-block; width: 18px; height: 18px; flex: 0 0 18px; overflow: visible; fill: none; stroke: currentColor; vertical-align: middle; }
  #control-panel-container .mewo-actions button { gap: 8px; }
  #control-panel-container .mewo-workspace-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--panel-border); }
  #control-panel-container .mewo-collapse { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; padding: 6px 10px; min-height: 36px; border: 1px solid var(--panel-border); border-radius: 8px; background: var(--panel-button-bg); color: var(--panel-text-main); font: inherit; cursor: pointer; }
  /* Embedded content shares the assistant's scroll area: sticky footers would cover later sections. */
  #control-panel-container [data-mewo-mount] .als-savebar { position: static !important; inset: auto !important; z-index: auto !important; margin-top: 8px; padding: 14px 0 4px; background: transparent; isolation: auto; }
  #control-panel-container [data-mewo-mount] .als-panel { position: static; gap: 20px; }
  #control-panel-container [data-mewo-mount] .als-settings :is(h3, h4) { margin: 0 !important; padding: 0 !important; border: 0 !important; background: none !important; box-shadow: none !important; text-shadow: none !important; font-family: inherit !important; font-size: 14px !important; font-weight: 700 !important; line-height: 1.5 !important; color: var(--panel-text-main) !important; }
  #control-panel-container [data-mewo-mount] .als-settings h3 { font-size: 15px !important; color: var(--panel-text-accent) !important; }
  #control-panel-container [data-mewo-mount] .als-settings :is(h3, h4)::before,
  #control-panel-container [data-mewo-mount] .als-settings :is(h3, h4)::after { display: none !important; content: none !important; }
  #control-panel-container [data-mewo-mount] .als-page-heading { display: flex; flex-direction: column; gap: 6px; padding: 12px; border: 1px solid var(--panel-border); border-radius: 8px; background: var(--panel-button-bg); }
  #control-panel-container [data-mewo-mount] .als-settings .als-icon { display: inline-block !important; width: 18px; height: 18px; flex: 0 0 18px; fill: none; stroke: currentColor; overflow: visible; }
  #control-panel-container [data-mewo-mount] .als-tabs { position: static; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
  #control-panel-container [data-mewo-mount] .als-tab { min-width: 0; padding: 8px 4px; gap: 5px; }
  @media (max-width: 480px) { #control-panel-container [data-mewo-mount] .als-tab { flex-direction: column; font-size: 12px; } }
  @media (max-width: 480px) { #control-panel-container .mewo-card, #control-panel-container .summary-legacy { padding: 10px; } }
`;

export function bindMewoSummary(panel: JQuery<HTMLElement>) {
  const host = panel[0].ownerDocument.defaultView as Window & { MewoLargeSummary?: MewoIntegration };
  const container = panel.find<HTMLElement>('[data-mewo-mount]')[0];
  const workspace = panel.find('[data-mewo-workspace]');
  let mounted: MewoIntegration | null = null;
  let pending = false;
  let disposed = false;
  const getApi = () => {
    const api = host.MewoLargeSummary;
    return api &&
      ['getState', 'mount', 'unmount', 'setEnabled', 'runManual'].every(
        key => typeof api[key as keyof MewoIntegration] === 'function',
      )
      ? api
      : null;
  };
  const unmount = () => {
    // Return the live node before jQuery.remove() cleans its listeners and drafts.
    mounted?.unmount(container);
    mounted = null;
    workspace.prop('hidden', true);
  };
  const refresh = () => {
    if (disposed) return;
    const api = getApi();
    const state = api?.getState();
    if (mounted && mounted !== api) unmount();
    const ready = Boolean(state?.ready);
    panel.find('[data-mewo-status]').text(state?.message || '尚未检测到兼容的喵喵大总结扩展。');
    panel.find('[data-mewo-version]').text(state ? `v${state.sourceVersion}` : '未连接');
    panel
      .find('[data-mewo-tokens]')
      .text(Number.isFinite(state?.tokens) ? `最近上下文：${state!.tokens!.toLocaleString()} token` : '尚无上下文计数');
    panel.find('[data-mewo-install]').prop('hidden', Boolean(api));
    panel.find('[data-mewo]').each((_, element) => {
      const action = element.dataset.mewo;
      const needsIdle = ['incremental', 'merged', 'toggle'].includes(action || '');
      const needsEnabled = ['incremental', 'merged'].includes(action || '');
      $(element).prop(
        'disabled',
        action !== 'refresh' &&
          action !== 'collapse' &&
          (!ready || (needsIdle && (pending || state?.busy)) || (needsEnabled && !state?.enabled)),
      );
    });
    panel.find('[data-mewo="toggle"]').attr('aria-pressed', String(Boolean(state?.enabled)));
    panel.find('[data-mewo-toggle-label]').text(state?.enabled ? '停用大总结' : '启用大总结');
  };
  panel.on('click.mewoSummary', '[data-mewo-mount] .als-tab', event => {
    const labels: Record<string, string> = {
      overview: '总结概览',
      settings: '总结配置',
      prompt: '提示词模板',
      directory: '总结历史',
    };
    panel.find('[data-mewo-workspace-title]').text(labels[event.currentTarget.dataset.tab || ''] || '总结面板');
  });
  panel.on('click.mewoSummary', '[data-mewo]', async event => {
    const action = event.currentTarget.dataset.mewo;
    let ownsPending = false;
    try {
      if (action === 'refresh') return refresh();
      if (action === 'collapse') return unmount();
      const api = getApi();
      if (!api?.getState().ready) return refresh();
      if (['overview', 'settings', 'prompt', 'directory'].includes(action || '')) {
        if (!api.mount(container)) throw new Error('总结面板暂时被其他窗口使用，请关闭该窗口后重试。');
        mounted = api;
        workspace.prop('hidden', false);
        const tab = container.querySelector<HTMLButtonElement>(`.als-tab[data-tab="${action}"]`);
        if (!tab) throw new Error('扩展面板结构已变化，请更新喵喵大总结后重试。');
        tab.click();
        tab.focus({ preventScroll: true });
        return;
      }
      if (pending || api.getState().busy) return;
      pending = true;
      ownsPending = true;
      refresh();
      const success =
        action === 'toggle'
          ? await api.setEnabled(!api.getState().enabled)
          : await api.runManual({ operation: 'summary', mode: action === 'merged' ? 'merged' : 'incremental' });
      if (!success && !disposed) toastr.info('操作未完成或已取消，请在总结面板查看原因。');
    } catch (error) {
      console.warn('预设助手[喵喵大总结]:', error);
      if (!disposed) {
        const message =
          error && typeof error === 'object' && 'message' in error
            ? String(error.message)
            : '喵喵大总结操作失败，请重试。';
        toastr.error(message);
      }
    } finally {
      if (ownsPending) pending = false;
      refresh();
    }
  });
  panel.find('.back-button, button[data-panel]').on('click.mewoSummary', () => {
    unmount();
    refresh();
  });
  host.addEventListener('mewo-large-summary-state', refresh);
  refresh();
  return {
    unmount,
    dispose() {
      disposed = true;
      unmount();
      host.removeEventListener('mewo-large-summary-state', refresh);
      panel.off('.mewoSummary');
      panel.find('.back-button, button[data-panel]').off('.mewoSummary');
    },
  };
}
