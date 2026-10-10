const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<input id="start_reply_with"><input type="checkbox" id="chat-show-reply-prefix-checkbox">');
const $ = require('jquery')(dom.window);
let model = 'gemini-3.1-pro';
const SillyTavern = { getChatCompletionModel: () => model, chatCompletionSettings: {} };
function load(file, globals = {}) {
  const context = { exports: {}, console, $, SillyTavern, ...globals };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(`tavern-helper/预设助手/${file}.ts`, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText,
    context,
  );
  return context.exports;
}
(async () => {
  const api = load('modelMode');
  const schemes = [
    {
      type: 'mode',
      modes: [
        { id: 'pro', label: 'Pro', modelPattern: 'gemini.*3.1.*pro', startReplyWith: '<electric>', rules: [] },
        { id: 'flash', label: 'Flash', modelPattern: 'gemini.*flash', startReplyWith: '', rules: [] },
        { id: 'claude', label: 'Claude', modelPattern: 'claude', startReplyWith: '', rules: [] },
      ],
    },
  ];
  let storage = { presets: { default: {} } };
  const status = () => api.getPrefillStatus(storage, schemes, '日月西');
  const sync = () =>
    api.syncModelLinkedQuickSwitch({
      schemes,
      storage,
      getActivePresetId: () => 'default',
      getLoadedPresetName: () => '日月西',
      applyRules: async () => {},
    });
  assert.equal(status().enabled, true);
  storage.prefillOverrides = { [status().key]: false };
  storage = JSON.parse(JSON.stringify(storage));
  await sync();
  assert.equal($('#start_reply_with').val(), '');
  model = 'claude-sonnet';
  assert.equal(status().enabled, false);
  storage.prefillOverrides[status().key] = true;
  await sync();
  assert.equal($('#start_reply_with').val(), '<electric>');
  model = 'gemini-3.1-pro';
  await sync();
  assert.equal($('#start_reply_with').val(), '');
  delete storage.prefillOverrides[status().key];
  await sync();
  assert.equal($('#start_reply_with').val(), '<electric>');
  model = 'unknown';
  assert.equal(status().enabled, false);
  model = '';
  assert.equal(status().enabled, false);
  model = 'gemini-3.5-flash';
  assert.equal(status().enabled, false);
  assert.ok(status().reason.includes('Flash'));
  const formatting = load('reasoningFormatting', {
    $: () => {
      throw Error('disabled formatting touched DOM');
    },
  });
  assert.equal(
    await formatting.ensureReasoningFormatting({ isEnabled: () => false, getLoadedPresetName: () => '日月西' }),
    false,
  );
  $('body').append(
    '<select id="reasoning_select"><option value="日月西">日月西</option><option value="Blank">Blank</option></select><input id="reasoning_prefix"><input id="reasoning_suffix"><input id="reasoning_separator"><input type="checkbox" id="reasoning_auto_parse">',
  );
  let savedTemplate = null;
  const repair = load('reasoningFormatting', {
    SillyTavern: {
      getPresetManager: () => ({
        getAllPresets: () => (savedTemplate ? ['日月西'] : []),
        getCompletionPresetByName: () => savedTemplate,
        savePreset: async (_, template) => {
          savedTemplate = template;
        },
      }),
    },
  });
  await repair.ensureReasoningFormatting({ getLoadedPresetName: () => '日月西' });
  assert.equal($('#reasoning_prefix').val(), '<electric>');
  $('#reasoning_prefix').val('broken');
  $('#reasoning_auto_parse').prop('checked', false);
  await repair.ensureReasoningFormatting({ getLoadedPresetName: () => '日月西' });
  assert.equal($('#reasoning_prefix').val(), '<electric>');
  assert.equal($('#reasoning_auto_parse').prop('checked'), true);
  $('#start_reply_with').val('manual');
  await repair.ensureReasoningFormatting({ getLoadedPresetName: () => '其他预设' });
  assert.equal($('#start_reply_with').val(), 'manual', 'formatting must not overwrite prefill decisions');
  assert.equal(repair.inspectReasoningFormatting(() => '其他预设').state, 'inactive');
  assert.equal(repair.inspectReasoningFormatting(() => '日月西').state, 'error');
  $('body').append(
    '<input type="checkbox" id="reasoning_auto_expand"><input type="checkbox" id="reasoning_show_hidden"><input type="checkbox" id="reasoning_add_to_prompts"><input id="reasoning_max_additions">',
  );
  await repair.ensureReasoningFormatting({ getLoadedPresetName: () => '日月西' });
  assert.equal(repair.inspectReasoningFormatting(() => '日月西').state, 'ok');
  $('#reasoning_suffix').val('</wrong>');
  let inspection = repair.inspectReasoningFormatting(() => '日月西');
  assert.equal(inspection.state, 'error');
  assert.ok(inspection.details.some(detail => detail.includes('</wrong>') && detail.includes('</electric>')));
  await repair.ensureReasoningFormatting({ getLoadedPresetName: () => '日月西' });
  assert.equal(repair.inspectReasoningFormatting(() => '日月西').state, 'ok');
  $('#reasoning_auto_parse').remove();
  assert.equal(repair.inspectReasoningFormatting(() => '日月西').state, 'pending');
  let writes = 0;
  const env = load('environment', {
    window: {},
    SillyTavern: { getContext: () => ({ characterId: 0, characters: [{ data: { creator_notes: 'MVU变量' } }] }) },
    getPreset: () => ({ prompts: [{ name: 'MVU变量', enabled: false }] }),
  });
  const deps = {
    getLoadedPresetName: () => '日月西',
    updatePresetWith: async (_, fn) => {
      writes++;
      const p = fn({ prompts: [{ name: 'MVU变量', enabled: false }] });
      assert.equal(p.prompts[0].enabled, true);
      return p;
    },
  };
  await env.applyEnvironmentPromptToggles({ ...deps, isEnabled: () => false });
  assert.equal(writes, 0);
  await env.applyEnvironmentPromptToggles(deps);
  assert.equal(writes, 1);
  await env.applyEnvironmentPromptToggles({ ...deps, isEnabled: () => false });
  await env.applyEnvironmentPromptToggles(deps);
  assert.equal(writes, 2);
  console.log(
    'PASS: model defaults, persisted overrides, model switching, restore auto, unknown model, formatting opt-out, MVU opt-out/re-enable',
  );
  dom.window.close();
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
