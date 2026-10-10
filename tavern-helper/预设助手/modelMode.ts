import type { BuiltinQuickSwitchRule, BuiltinQuickSwitchScheme, QRPreset, StorageData } from './types';

const FLASH_CUSTOM_EXCLUDE_BODY = ['presence_penalty', 'frequency_penalty', 'top_p', 'top_k', 'temperature']
  .map(parameter => `- ${parameter}`)
  .join('\n');

export function applyStartReplyWith(value: string | undefined): boolean {
  if (value === undefined) return false;

  let changed = false;
  const $prefix = $('#start_reply_with');
  if ($prefix.length && String($prefix.val() ?? '') !== value) {
    $prefix.val(value).trigger('input');
    changed = true;
  }

  const $showPrefix = $('#chat-show-reply-prefix-checkbox');
  if ($showPrefix.length && $showPrefix.prop('checked') !== true) {
    $showPrefix.prop('checked', true).trigger('change');
    changed = true;
  }
  return changed;
}

function matchesModel(model: string, pattern: string | undefined): boolean {
  if (!pattern) return false;
  try {
    return new RegExp(pattern, 'iu').test(model);
  } catch (error) {
    console.warn(`预设助手 [模型联动]: 无效的模型匹配规则：${pattern}`, error);
    return false;
  }
}

async function syncCustomExcludeBody(model: string) {
  const settings = SillyTavern.chatCompletionSettings;
  if (!settings) return;

  // Claude 可能需要用户自行排除渠道不支持的主体参数，保留现有内容，不做自动写入或清空。
  if (/claude/iu.test(model)) return;

  const isSupportedFlash = /gemini.*3[._-]?[5-8].*flash/iu.test(model);
  const isCustomChatCompletion = SillyTavern.mainApi === 'openai' && settings.chat_completion_source === 'custom';
  const desiredValue = isCustomChatCompletion && isSupportedFlash ? FLASH_CUSTOM_EXCLUDE_BODY : '';
  if (String(settings.custom_exclude_body || '') === desiredValue) return;

  settings.custom_exclude_body = desiredValue;
  $('#custom_exclude_body').val(desiredValue);
  await SillyTavern.saveSettingsDebounced();
  console.info(
    desiredValue
      ? '预设助手 [模型联动]: 已填写 Flash 自定义接口的排除主体参数。'
      : '预设助手 [模型联动]: 已清空排除主体参数。',
  );
}

export function getPrefillStatus(storage: StorageData, schemes: BuiltinQuickSwitchScheme[], presetName: string | null) {
  const model = String(SillyTavern.getChatCompletionModel?.() || '').trim();
  const key = JSON.stringify([String(SillyTavern.chatCompletionSettings?.chat_completion_source || ''), model]);
  const mode = schemes
    .flatMap(scheme => (scheme.type === 'mode' ? scheme.modes || [] : []))
    .find(item => matchesModel(model, item.modelPattern));
  const supportedPreset = (presetName || '').includes('日月西');
  const automatic = supportedPreset && !!mode?.startReplyWith;
  const override = model ? storage.prefillOverrides?.[key] : undefined;
  const enabled = override ?? automatic;
  const reason = !supportedPreset
    ? '当前不是日月西预设，默认不预填充。'
    : !model
      ? '尚未识别到模型，默认不预填充。'
      : !mode
        ? '未匹配已知模型规则，默认不预填充。'
        : automatic
          ? `匹配 ${mode.label}，使用 <electric> 衔接推理内容。`
          : `匹配 ${mode.label}，按该模式规则不预填充。`;
  return { model, key, enabled, reason, manual: override !== undefined };
}

export async function syncModelLinkedQuickSwitch(options: {
  schemes: BuiltinQuickSwitchScheme[];
  storage: StorageData;
  getActivePresetId: () => string;
  getLoadedPresetName: () => string | null;
  applyRules: (rules: BuiltinQuickSwitchRule[]) => Promise<void>;
}): Promise<boolean> {
  const model = String(SillyTavern.getChatCompletionModel?.() || '').trim();
  const prefill = getPrefillStatus(options.storage, options.schemes, options.getLoadedPresetName());
  applyStartReplyWith(prefill.enabled ? '<electric>' : '');
  await syncCustomExcludeBody(model);

  const loadedPresetName = (options.getLoadedPresetName() || '').trim();
  if (!loadedPresetName.includes('日月西')) {
    return false;
  }
  if (!model) return false;

  for (const [schemeIndex, scheme] of options.schemes.entries()) {
    if (scheme.type !== 'mode' || !scheme.modes?.length) continue;
    const mode = scheme.modes.find(item => matchesModel(model, item.modelPattern));
    if (!mode) continue;

    const targetPreset: QRPreset | undefined = options.storage.presets[options.getActivePresetId()];
    if (!targetPreset) return false;
    if (!targetPreset.quickSwitchRuntimeStates) targetPreset.quickSwitchRuntimeStates = {};

    const switchId = `builtin:${schemeIndex}`;
    const runtimeState = targetPreset.quickSwitchRuntimeStates[switchId];
    const modeChanged = runtimeState?.modeId !== mode.id;
    if (modeChanged) {
      await options.applyRules(mode.rules);
      if ((options.getLoadedPresetName() || '').trim() !== loadedPresetName) return false;
      targetPreset.quickSwitchRuntimeStates[switchId] = {
        enabled: true,
        updateTime: Date.now(),
        beforeStates: runtimeState?.beforeStates || {},
        modeId: mode.id,
        manualOverride: false,
      };
      targetPreset.updateTime = Date.now();
    }

    if (modeChanged) {
      console.info(`预设助手 [模型联动]: ${model} -> ${scheme.name} / ${mode.label}`);
    }
    return modeChanged;
  }

  return false;
}
