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
  getLoadedPresetName: () => string | null;
}): Promise<boolean> {
  const loadedPresetName = (options.getLoadedPresetName() || '').trim();
  if (!loadedPresetName.includes('日月西')) {
    updateInput('#start_reply_with', '');
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
