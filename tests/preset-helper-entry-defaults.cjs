const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const context = { exports: {}, require: () => ({ defaultPreset: {} }) };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('tavern-helper/预设助手/state.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
const api = context.exports;
assert.equal(api.storage.panelEntries.floatingBall, true);
assert.equal(api.storage.panelEntries.extensionsMenu, true);
assert.equal(api.defaultPanelEntries.extensionsMenu, true);
for (const entries of [undefined, { floatingBall: false, quickReply: true, extensionsMenu: false }, { floatingBall: true, quickReply: false, extensionsMenu: false }]) {
  api.storage.panelEntries = entries;
  delete api.storage.extensionsMenuDefaultMigrated;
  const result = api.normalizePanelEntries();
  assert.equal(result.extensionsMenu, true);
  if (entries) { assert.equal(result.floatingBall, entries.floatingBall); assert.equal(result.quickReply, entries.quickReply); }
  result.extensionsMenu = false;
  const saved = JSON.parse(JSON.stringify(api.storage));
  api.setStorage(saved);
  assert.equal(api.normalizePanelEntries().extensionsMenu, false, 'manual opt-out survives reload after migration');
}
console.log('PASS: default dual entries, one-time migration, preserve other entries and subsequent opt-out');
