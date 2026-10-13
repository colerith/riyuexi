const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<input id="start_reply_with" value="old"><input type="checkbox" id="chat-show-reply-prefix-checkbox"><textarea id="custom_exclude_body"></textarea>');
const $ = require('jquery')(dom.window);
function load(name, globals) {
  const context = { exports: {}, console, ...globals };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(`tavern-helper/预设助手/${name}.ts`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
  return context.exports;
}
const constants = load('constants', { getScriptId: () => 'test', require: () => ({ DEFAULT_NSFW_SETTINGS: { openKeywords: [], closeKeywords: [], worldbookMarkers: [] } }) });
let model = 'gemini-4-argon';
const settings = { chat_completion_source: 'custom', custom_exclude_body: '' };
const api = load('modelMode', { $, SillyTavern: { getChatCompletionModel: () => model, mainApi: 'openai', chatCompletionSettings: settings, saveSettingsDebounced: async () => {} } });
(async () => {
  const schemes = constants.BUILTIN_QUICK_SWITCH_SCHEMES;
  const storage = { presets: { default: {} } };
  let rules;
  await api.syncModelLinkedQuickSwitch({ schemes, storage, getActivePresetId: () => 'default', getLoadedPresetName: () => '日月西', applyRules: async value => { rules = value; } });
  assert.equal($('#start_reply_with').val(), '');
  assert.equal(storage.presets.default.quickSwitchRuntimeStates['builtin:0'].modeId, 'gemini flash');
  assert.ok(rules.some(rule => rule.nameIncludes === 'Gemini尾部②' && rule.enabled));
  assert.ok(settings.custom_exclude_body.includes('- temperature'));
  assert.equal(settings.custom_exclude_body.split('\n').length, 5);
  for (model of ['gemini-4-argon', 'GEMINI-4-ARGON', 'google/gemini-4-argon', 'gemini-3.8-flash']) {
    const status = api.getPrefillStatus(storage, schemes, '日月西');
    assert.equal(status.enabled, false);
    assert.ok(status.reason.includes('Flash / Argon'));
  }
  model = 'gemini-3.1-pro';
  assert.equal(api.getPrefillStatus(storage, schemes, '日月西').enabled, true);
  console.log('PASS: Argon shares Flash prompts, excluded parameters and disabled automatic prefill; Pro unchanged');
  dom.window.close();
})().catch(error => { console.error(error); process.exitCode = 1; });


