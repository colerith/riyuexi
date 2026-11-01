/** 优先兼容原名称，再通过预设简介识别改名后的日月西；不依赖条目启用状态。 */
export function isRiyuexiPreset(
  name: string | null,
  preset?: {
    prompts?: Array<{ name?: string; content?: string }>;
    prompts_unused?: Array<{ name?: string; content?: string }>;
  },
): boolean {
  if ((name || '').includes('日月西')) return true;
  if (!preset) {
    try {
      if (typeof getPreset !== 'function') return false;
      preset = getPreset('in_use');
    } catch {
      return false;
    }
  }
  return [...(preset.prompts || []), ...(preset.prompts_unused || [])].some(
    prompt =>
      typeof prompt.name === 'string' &&
      prompt.name.replace(/\s/g, '').includes('预设简介') &&
      typeof prompt.content === 'string' &&
      prompt.content.includes('日月西'),
  );
}
