const REASONING_FORMATTING_VERSION = 1;
const REASONING_TEMPLATE = {
  name: '日月西',
  prefix: '<electric>',
  suffix: '</electric>',
  separator: '',
} as const;
let templateSavePromise: Promise<unknown> | null = null;

function selectTemplate(name: string) {
  const $select = $('#reasoning_select');
  if (String($select.val() ?? '') !== name) $select.val(name).trigger('change');
}

function updateCheckbox(selector: string, checked: boolean) {
  const $input = $(selector);
  if (!$input.length || $input.prop('checked') === checked) return;
  $input.prop('checked', checked).trigger('change');
}

function updateInput(selector: string, value: string) {
  const $input = $(selector);
  if (!$input.length || String($input.val() ?? '') === value) return;
  $input.val(value).trigger('input');
}

export async function ensureReasoningFormatting(options: {
  configuredVersion?: number;
  isEnabled?: () => boolean;
  getLoadedPresetName: () => string | null;
}): Promise<boolean> {
  if (options.isEnabled?.() === false) return false;
  const loadedPresetName = (options.getLoadedPresetName() || '').trim();
  if (!loadedPresetName.includes('日月西')) {
    const $select = $('#reasoning_select');
    const blankName = $select
      .find('option')
      .toArray()
      .find(option => option.value.toLowerCase() === 'blank')?.value;
    if (blankName) selectTemplate(blankName);
    updateInput('#reasoning_prefix', '');
    updateInput('#reasoning_suffix', '');
    updateInput('#reasoning_separator', '');
    return false;
  }

  const $templateSelect = $('#reasoning_select');
  const presetManager = SillyTavern.getPresetManager?.('reasoning');
  if (!$templateSelect.length || !presetManager) {
    console.warn('预设助手 [推理格式化]: 酒馆推理格式化功能尚未就绪，将在预设切换时重试。');
    return false;
  }

  const templateNames: string[] = presetManager.getAllPresets?.() || [];
  const existingTemplate = templateNames.includes(REASONING_TEMPLATE.name)
    ? presetManager.getCompletionPresetByName?.(REASONING_TEMPLATE.name)
    : null;
  const templateMatches =
    existingTemplate?.prefix === REASONING_TEMPLATE.prefix &&
    existingTemplate?.suffix === REASONING_TEMPLATE.suffix &&
    existingTemplate?.separator === REASONING_TEMPLATE.separator;

  if (!templateMatches) {
    templateSavePromise ??= Promise.resolve(
      presetManager.savePreset(REASONING_TEMPLATE.name, REASONING_TEMPLATE),
    ).finally(() => {
      templateSavePromise = null;
    });
    await templateSavePromise;
    // 保存期间可能已切换预设，按当前预设重新同步，禁止旧任务覆盖新设置。
    if ((options.getLoadedPresetName() || '').trim() !== loadedPresetName) {
      return ensureReasoningFormatting(options);
    }
  }
  if (options.isEnabled?.() === false) return false;
  selectTemplate(REASONING_TEMPLATE.name);
  updateInput('#reasoning_prefix', REASONING_TEMPLATE.prefix);
  updateInput('#reasoning_suffix', REASONING_TEMPLATE.suffix);
  updateInput('#reasoning_separator', REASONING_TEMPLATE.separator);

  updateCheckbox('#reasoning_auto_parse', true);
  updateCheckbox('#reasoning_auto_expand', false);
  updateCheckbox('#reasoning_show_hidden', true);
  updateCheckbox('#reasoning_add_to_prompts', false);
  updateInput('#reasoning_max_additions', '1');

  console.info('预设助手 [推理格式化]: 已自动应用“日月西”配置。');
  return true;
}

export { REASONING_FORMATTING_VERSION };

/** 只读检查当前酒馆配置，不覆盖用户正在编辑的内容。 */
export function inspectReasoningFormatting(getLoadedPresetName: () => string | null) {
  if (!(getLoadedPresetName() || '').includes('日月西')) {
    return { state: 'inactive', title: '当前预设不适用', details: ['切换到日月西预设后自动检查。'] };
  }
  const fields: Array<[string, string, string | boolean]> = [
    ['#reasoning_select', '格式化模板', REASONING_TEMPLATE.name],
    ['#reasoning_prefix', '推理前缀', REASONING_TEMPLATE.prefix],
    ['#reasoning_suffix', '推理后缀', REASONING_TEMPLATE.suffix],
    ['#reasoning_separator', '分隔符', ''],
    ['#reasoning_auto_parse', '自动解析', true],
    ['#reasoning_auto_expand', '自动展开', false],
    ['#reasoning_show_hidden', '显示隐藏推理', true],
    ['#reasoning_add_to_prompts', '添加到提示词', false],
    ['#reasoning_max_additions', '最大添加次数', '1'],
  ];
  const missing: string[] = [];
  const errors: string[] = [];
  const describe = (value: string | boolean) =>
    typeof value === 'boolean' ? (value ? '开启' : '关闭') : value === '' ? '空白' : JSON.stringify(value);
  for (const [selector, label, expected] of fields) {
    const input = $(selector);
    if (!input.length) {
      missing.push(label);
      continue;
    }
    const actual = typeof expected === 'boolean' ? !!input.prop('checked') : String(input.val() ?? '');
    if (actual !== expected) errors.push(`${label}：当前为${describe(actual)}，应为${describe(expected)}。`);
  }
  if (errors.length)
    return {
      state: 'error',
      title: `发现 ${errors.length} 项配置不符`,
      details: [...errors, ...missing.map(label => `${label}：控件未就绪，暂未检查。`)],
    };
  if (missing.length)
    return { state: 'pending', title: '等待酒馆配置就绪', details: [`尚未读取：${missing.join('、')}。`] };
  return { state: 'ok', title: '当前配置正确', details: ['模板、前后缀、分隔符及解析选项均符合日月西配置。'] };
}
