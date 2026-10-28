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

export const mewoSummaryHtml = `
  <section class="mewo-card" aria-label="喵喵大总结">
    <div class="mewo-heading"><h3><i class="fas fa-cat" aria-hidden="true"></i> 喵喵大总结</h3><span class="mewo-badge" data-mewo-version>未连接</span></div>
    <p class="setting-help">将旧剧情整理为世界书记忆，保存确认后隐藏旧楼层；支持自动触发、独立 API 和历史恢复。</p>
    <div class="mewo-status" role="status" aria-live="polite"><span data-mewo-status></span><small data-mewo-tokens></small></div>
    <div class="button-grid-2 mewo-actions">
      <button type="button" data-mewo="overview"><i class="fas fa-book-open" aria-hidden="true"></i> 总结面板</button>
      <button type="button" data-mewo="settings"><i class="fas fa-sliders-h" aria-hidden="true"></i> 总结配置</button>
      <button type="button" data-mewo="incremental"><i class="fas fa-file-alt" aria-hidden="true"></i> 增量大总结</button>
      <button type="button" data-mewo="merged"><i class="fas fa-layer-group" aria-hidden="true"></i> 合并大总结</button>
      <button type="button" data-mewo="prompt"><i class="fas fa-pen" aria-hidden="true"></i> 提示词模板</button>
      <button type="button" data-mewo="directory"><i class="fas fa-history" aria-hidden="true"></i> 总结历史</button>
      <button type="button" data-mewo="toggle" aria-pressed="false">启用大总结</button>
      <button type="button" data-mewo="refresh"><i class="fas fa-sync-alt" aria-hidden="true"></i> 刷新接入状态</button>
    </div>
    <div class="mewo-install" data-mewo-install>
      <p>请在酒馆「扩展 → 安装扩展」中安装下方项目；已安装时请更新到支持面板接入的版本（1.2.17 起），刷新酒馆后重试。</p>
      <a href="https://github.com/AYUUKI-K/Mewo-Large-Summary" target="_blank" rel="noopener noreferrer">查看项目与安装说明 ↗</a>
      <input aria-label="喵喵大总结安装地址" readonly value="https://github.com/AYUUKI-K/Mewo-Large-Summary">
    </div>
    <div class="mewo-workspace" data-mewo-workspace hidden>
      <div class="button-grid-2"><button type="button" data-mewo="collapse">收起内嵌面板</button></div>
      <div data-mewo-mount></div>
    </div>
  </section>`;

export const mewoSummaryCss = `
  #control-panel-container .summary-content { display: flex; flex-direction: column; gap: 16px; }
  #control-panel-container .mewo-card, #control-panel-container .summary-legacy { padding: 14px; border: 1px solid var(--panel-border); border-radius: 12px; background: var(--panel-button-bg); min-width: 0; }
  #control-panel-container .mewo-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
  #control-panel-container .mewo-heading h3, #control-panel-container .summary-legacy h3 { margin: 0; font-size: 15px; color: var(--panel-text-main); }
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
    panel
      .find('[data-mewo="toggle"]')
      .text(state?.enabled ? '停用大总结' : '启用大总结')
      .attr('aria-pressed', String(Boolean(state?.enabled)));
  };
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
