/** 串行提交条目开关差异；不保存具名预设，不传回 settings / extensions / 未使用条目。 */
export function createPromptStateWriter(api: {
  getPreset: (name: string) => Preset;
  getLoadedPresetName: () => string | null;
  getCharacterId: () => string;
  setPreset: (name: string, preset: { prompts: PresetPrompt[] }) => Promise<Preset>;
}) {
  let queue: Promise<unknown> = Promise.resolve();
  let writing = false;
  let revision = 0;
  const invalidate = () => {
    revision += 1;
  };
  const update = (name: string, updater: (preset: Preset) => Preset): Promise<Preset> => {
    if (name !== 'in_use') return Promise.reject(new Error('预设助手仅允许修改当前使用状态，请通过酒馆保存预设。'));
    const presetName = api.getLoadedPresetName();
    const characterId = api.getCharacterId();
    const requestedRevision = revision;
    const assertCurrent = () => {
      if (
        revision !== requestedRevision ||
        api.getLoadedPresetName() !== presetName ||
        api.getCharacterId() !== characterId
      ) {
        throw new Error('预设或角色已切换，已取消旧的条目更新。');
      }
    };
    const task = queue.then(async () => {
      assertCurrent();
      const current = api.getPreset('in_use');
      if (!Array.isArray(current.prompts) || !current.prompts.length) {
        throw new Error('当前预设条目尚未加载，已取消写入。');
      }
      const updated = updater(structuredClone(current));
      const states = new Map(updated.prompts.map(prompt => [prompt.id, prompt.enabled]));
      let changed = false;
      const prompts = current.prompts.map(prompt => {
        const enabled = states.get(prompt.id);
        if (typeof enabled !== 'boolean' || enabled === prompt.enabled) return prompt;
        changed = true;
        return { ...prompt, enabled };
      });
      assertCurrent();
      if (!changed) return current;
      writing = true;
      try {
        // 部分更新，禁止把 API 归一化后的整份预设覆盖原始扩展数据（含预设正则）。
        return await api.setPreset('in_use', { prompts });
      } finally {
        writing = false;
      }
    });
    queue = task.catch(() => undefined);
    return task;
  };
  return { update, invalidate, isWriting: () => writing };
}
