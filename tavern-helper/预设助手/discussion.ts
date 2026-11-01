export const DISCUSSION_MODES = [
  { id: 'comments', label: '单独段评', icon: 'fa-comment-dots', names: ['段评一键开关'] },
  { id: 'forum', label: '单独论坛', icon: 'fa-comments', names: ['论坛一键开关'] },
  {
    id: 'both',
    label: '论坛＆段评',
    icon: 'fa-layer-group',
    names: ['段评&论坛开关', '段评＆论坛开关', '论坛&段评开关', '论坛＆段评开关'],
  },
] as const;
export type DiscussionMode = (typeof DISCUSSION_MODES)[number]['id'];
export interface DiscussionConfig {
  bindings: Record<DiscussionMode, string>;
  groupIds: string[];
  selectedGroupIds: string[];
}
export function resolveDiscussionConfig(prompts: PresetPrompt[], saved?: DiscussionConfig): DiscussionConfig {
  if (saved) return structuredClone(saved);
  const bindings = { comments: '', forum: '', both: '' };
  for (const mode of DISCUSSION_MODES) {
    const matches = prompts.filter(p => mode.names.some(name => String(p.name).includes(name)));
    if (matches.length === 1) bindings[mode.id] = String(matches[0].id);
  }
  const groups = prompts.filter(p => /\{\{\s*setvar::吐槽群组\d+::/i.test(String(p.content ?? '')));
  return {
    bindings,
    groupIds: groups.map(p => String(p.id)),
    selectedGroupIds: groups.filter(p => p.enabled).map(p => String(p.id)),
  };
}
export function validateDiscussionConfig(config: DiscussionConfig, prompts: PresetPrompt[]) {
  const ids = new Set(prompts.map(p => String(p.id)));
  const bound = DISCUSSION_MODES.map(m => config.bindings[m.id]);
  if (bound.some(id => !id || !ids.has(id))) throw new Error('请先为三个模式分别绑定有效的预设开关。');
  if (new Set(bound).size !== 3) throw new Error('三个模式必须绑定不同的开关。');
  if (config.groupIds.some(id => !ids.has(id))) throw new Error('群组条目已变动，请重新定制。');
  if (config.groupIds.some(id => bound.includes(id))) throw new Error('模式开关不能同时作为群组条目。');
  if (config.selectedGroupIds.some(id => !config.groupIds.includes(id)))
    throw new Error('群组选择已失效，请重新定制。');
}
export function discussionStatus(
  config: DiscussionConfig,
  prompts: PresetPrompt[],
): DiscussionMode | 'off' | 'conflict' | 'unbound' {
  try {
    validateDiscussionConfig(config, prompts);
  } catch {
    return 'unbound';
  }
  const active = DISCUSSION_MODES.filter(m => prompts.find(p => String(p.id) === config.bindings[m.id])?.enabled);
  return active.length > 1 ? 'conflict' : (active[0]?.id ?? 'off');
}
export function applyDiscussionMode(preset: Preset, config: DiscussionConfig, mode: DiscussionMode | 'off'): Preset {
  validateDiscussionConfig(config, preset.prompts);
  if (mode !== 'off' && !DISCUSSION_MODES.some(m => m.id === mode)) throw new Error('未知讨论模式。');
  const states = new Map(DISCUSSION_MODES.map(m => [config.bindings[m.id], m.id === mode]));
  if (mode !== 'off') for (const id of config.groupIds) states.set(id, config.selectedGroupIds.includes(id));
  return {
    ...preset,
    prompts: preset.prompts.map(p => (states.has(String(p.id)) ? { ...p, enabled: states.get(String(p.id))! } : p)),
  };
}
export function discussionCard(config: DiscussionConfig, prompts: PresetPrompt[]) {
  const status = discussionStatus(config, prompts);
  const label =
    status === 'unbound'
      ? '请定制模式绑定'
      : status === 'conflict'
        ? '多个开关同时开启，请选择一种模式'
        : status === 'off'
          ? '已关闭'
          : '当前：' + DISCUSSION_MODES.find(m => m.id === status)!.label;
  const modeLabel = DISCUSSION_MODES.find(m => m.id === status)?.label ?? (status === 'off' ? '关闭' : '选择模式');
  return `<div class="quick-switch-row discussion-card ${DISCUSSION_MODES.some(m => m.id === status) ? 'is-on' : ''}"><div class="quick-switch-meta"><div class="quick-switch-name">🐦论坛与段评</div><div class="quick-switch-desc">${label} · 已选 ${config.selectedGroupIds.length} 个群组</div></div><div class="quick-switch-actions"><button class="quick-switch-sub-btn" data-action="configure_discussion">定制</button><details class="discussion-picker"><summary aria-label="选择论坛与段评模式">${modeLabel}<i class="fas fa-chevron-down" aria-hidden="true"></i></summary><div class="discussion-modes" role="group" aria-label="讨论模式">${DISCUSSION_MODES.map(m => `<button data-action="apply_discussion_mode" data-id="${m.id}" aria-pressed="${status === m.id}">${m.label}</button>`).join('')}<button data-action="apply_discussion_mode" data-id="off" aria-pressed="${status === 'off'}">关闭</button></div></details></div></div>`;
}

const html = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
export function openDiscussionConfig(
  prompts: PresetPrompt[],
  config: DiscussionConfig,
  mount: (dialog: JQuery<HTMLElement>) => void,
): Promise<DiscussionConfig | null> {
  return new Promise(resolve => {
    const options = (selected = '') =>
      '<option value="">请选择预设条目</option>' +
      prompts
        .map(
          p =>
            `<option value="${html(p.id)}" ${String(p.id) === selected ? 'selected' : ''}>${html(p.name)} [${html(p.id)}]</option>`,
        )
        .join('');
    const dialog = $(
      `<div class="qs-builder-overlay discussion-overlay"><div class="control-panel qs-builder-panel qs-sub-panel"><header class="panel-header"><div></div><div class="header-title">定制论坛与段评</div><button class="close-button discussion-cancel" aria-label="关闭"><i class="fas fa-times"></i></button></header><div class="panel-content"><p class="qs-builder-hint">三个模式分别绑定一个开关。切换模式时会关闭另外两个；下方群组将按勾选结果同步。</p><div class="discussion-bindings">${DISCUSSION_MODES.map(m => `<label><span>${m.label}</span><select data-discussion-binding="${m.id}">${options(config.bindings[m.id])}</select></label>`).join('')}</div><h4>参与群组</h4><p class="qs-builder-hint">自动识别设置“吐槽群组”的条目，也可手动添加。取消勾选的群组会在启用模式时关闭。</p><div class="discussion-add"><select aria-label="添加群组条目">${options()}</select><button type="button" class="quick-switch-sub-btn discussion-add-group">添加群组</button></div><div class="qs-sub-list discussion-groups"></div><p class="discussion-error" role="alert"></p><div class="qs-builder-footer"><button class="qs-cancel-btn discussion-cancel">取消</button><button class="qs-save-btn discussion-save">保存配置</button></div><p class="qs-builder-hint">保存后点击卡片上的模式应用。仅修改当前使用状态，不自动覆盖具名预设。</p></div></div></div>`,
    );
    const addGroup = (id: string, selected: boolean) => {
      if (
        dialog
          .find('[data-discussion-group]')
          .toArray()
          .some(el => el.getAttribute('data-discussion-group') === id)
      )
        return;
      const prompt = prompts.find(p => String(p.id) === id);
      const row = $(
        `<div class="qs-sub-row"><input type="checkbox" data-discussion-group="${html(id)}" aria-label="参与群组 ${html(prompt?.name ?? id)}" ${selected ? 'checked' : ''}><span class="qs-sub-name">${html(prompt?.name ?? '已失效条目：' + id)}</span><button type="button" class="quick-switch-sub-btn discussion-remove" aria-label="移除此群组绑定">移除</button></div>`,
      );
      dialog.find('.discussion-groups').append(row);
    };
    config.groupIds.forEach(id => addGroup(id, config.selectedGroupIds.includes(id)));
    const close = (result: DiscussionConfig | null) => {
      dialog.remove();
      resolve(result);
    };
    dialog.on('click', '.discussion-remove', e => {
      $(e.currentTarget).closest('.qs-sub-row').remove();
    });
    dialog.on('click', '.discussion-cancel', () => close(null));
    dialog.on('click', '.discussion-add-group', () => {
      const id = String(dialog.find('.discussion-add select').val() || '');
      if (id) addGroup(id, true);
    });
    dialog.on('click', '.discussion-save', () => {
      const bindings = { comments: '', forum: '', both: '' };
      DISCUSSION_MODES.forEach(m => {
        bindings[m.id] = String(dialog.find(`[data-discussion-binding="${m.id}"]`).val() || '');
      });
      const groupIds: string[] = [],
        selectedGroupIds: string[] = [];
      dialog.find<HTMLInputElement>('[data-discussion-group]').each((_, node) => {
        const id = node.getAttribute('data-discussion-group')!;
        groupIds.push(id);
        if (node.checked) selectedGroupIds.push(id);
      });
      const result = { bindings, groupIds, selectedGroupIds };
      try {
        validateDiscussionConfig(result, prompts);
        close(result);
      } catch (error) {
        dialog.find('.discussion-error').text(error instanceof Error ? error.message : String(error));
      }
    });
    mount(dialog);
  });
}
