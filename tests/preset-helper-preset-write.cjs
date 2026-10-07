const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const workspaceRoot = path.resolve(__dirname, '../src/util/酒馆助手脚本/预设助手');
const root = fs.existsSync(workspaceRoot) ? workspaceRoot : path.resolve(__dirname, '../tavern-helper/预设助手');
function load(file, globals = {}) {
  const context = { exports: {}, console, structuredClone, ...globals };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    context,
  );
  return context.exports;
}
(async () => {
  const { createPromptStateWriter } = load('presetWrite.ts');
  let presetName = 'A',
    character = 'c',
    calls = 0;
  let live = {
    settings: { temperature: 0.8 },
    extensions: { regex_scripts: [{ id: 'regex', disabled: false }] },
    prompts_unused: [{ id: 'unused', enabled: false }],
    prompts: [
      { id: 'a', enabled: true, content: 'user edited', unknown: 42 },
      { id: 'b', enabled: true },
    ],
  };
  let release;
  const gate = new Promise(r => (release = r));
  const writer = createPromptStateWriter({
    getPreset: () => structuredClone(live),
    getLoadedPresetName: () => presetName,
    getCharacterId: () => character,
    setPreset: async (name, patch) => {
      assert.equal(name, 'in_use');
      assert.deepEqual(Object.keys(patch), ['prompts']);
      calls++;
      live.prompts = structuredClone(patch.prompts);
      if (calls === 1) await gate;
      return structuredClone(live);
    },
  });
  const toggle = id => p => {
    p.prompts.find(x => x.id === id).enabled = false;
    return p;
  };
  const a = writer.update('in_use', toggle('a'));
  const b = writer.update('in_use', toggle('b'));
  await new Promise(r => setImmediate(r));
  assert.equal(calls, 1);
  assert.equal(writer.isWriting(), true);
  live.extensions.regex_scripts[0].disabled = true;
  live.prompts[0].content = 'newest manual edit';
  release();
  await Promise.all([a, b]);
  assert.equal(calls, 2);
  assert.equal(live.prompts[0].content, 'newest manual edit');
  assert.equal(live.prompts[0].unknown, 42);
  assert.equal(live.extensions.regex_scripts[0].disabled, true);
  assert.equal(live.settings.temperature, 0.8);
  assert.equal(live.prompts_unused[0].id, 'unused');
  assert(live.prompts.every(p => !p.enabled));
  await writer.update('in_use', p => p);
  assert.equal(calls, 2);
  await assert.rejects(writer.update('A', p => p));
  const stale = writer.update('in_use', p => p);
  presetName = 'B';
  await assert.rejects(stale, /切换/);
  assert.equal(calls, 2);
  const roundtrip = writer.update('in_use', p => p);
  writer.invalidate();
  await assert.rejects(roundtrip, /切换/);
  live.prompts = [];
  await assert.rejects(
    writer.update('in_use', p => p),
    /尚未加载/,
  );
  assert.equal(calls, 2);
  live.prompts = [{ id: 'a', enabled: true }];
  await writer.update('in_use', toggle('a'));
  assert.equal(calls, 3);
  // 具名预设不能再成为自动联动的写入目标。
  const writes = [];
  const deps = {
    getLoadedPresetName: () => 'A',
    updatePresetWith: async (name, updater) => {
      writes.push(name);
      return updater({ prompts: [{ id: 'a', name: 'MVU变量', enabled: true }] });
    },
  };
  const quick = load('quickSwitch.ts');
  await quick.applyQuickSwitchRules([{ promptId: 'a', enabled: false }], deps);
  await quick.restoreQuickSwitchRules({ a: true }, deps);
  const thinking = load('thinking.ts', {
    require: () => ({ THINKING_ENTRIES: { SPECIAL: 'special', CONVENTIONAL: 'normal', OUTPUT_ORDER: 'order' } }),
  });
  await thinking.applyThinkingMode('special', undefined, deps);
  const env = load('environment.ts', {
    window: {},
    SillyTavern: {},
    getPreset: () => ({ prompts: [{ id: 'a', name: 'MVU变量', enabled: true }] }),
  });
  await env.applyEnvironmentPromptToggles(deps);
  const nsfw = load('nsfw.ts', {
    getPreset: () => ({ prompts: [{ id: '098af4e4-5021-4c23-b013-b4646684994b', enabled: false }] }),
  });
  await nsfw.applyConfiguredNsfwMode({ nsfw: { configured: true, mode: 'on' } }, deps);
  assert.deepEqual(writes, ['in_use', 'in_use', 'in_use', 'in_use', 'in_use']);
  const profile = {
    id: 'unbound',
    scope: 'character',
    characterIds: ['other'],
    rules: [{ nameIncludes: 'entry', enabled: true }],
  };
  const profileStorage = {
    presets: { default: { quickSwitchRuntimeStates: {} } },
    quickSwitchProfiles: { unbound: profile },
  };
  let unboundWrites = 0;
  const profileDeps = {
    ...deps,
    storage: profileStorage,
    getCharacterId: () => 'current',
    getPreset: () => ({ prompts: [{ id: 'a', name: 'entry', enabled: true }] }),
    updatePresetWith: async (name, update) => {
      unboundWrites++;
      return update({ prompts: [{ id: 'a', name: 'entry', enabled: true }] });
    },
  };
  await quick.deactivateUnboundQuickSwitchProfiles(profileDeps);
  assert.equal(unboundWrites, 0, 'unused character schemes must not disable any prompts');
  profileStorage.presets.default.quickSwitchRuntimeStates.unbound = { enabled: true, beforeStates: { a: false } };
  await quick.deactivateUnboundQuickSwitchProfiles(profileDeps);
  assert.equal(unboundWrites, 1);
  assert.equal(profileStorage.presets.default.quickSwitchRuntimeStates.unbound.enabled, false);
  console.log(
    'PASS: serialized prompt patches, preserved regex/settings/content, no-op, preset switch, empty state, queue recovery, runtime-only automation',
  );
})().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
