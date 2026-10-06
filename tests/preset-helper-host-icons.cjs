const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const jquery = require('jquery');
const workspaceRoot = path.resolve(__dirname, '../src/util/酒馆助手脚本/预设助手');
const root = fs.existsSync(workspaceRoot) ? workspaceRoot : path.resolve(__dirname, '../tavern-helper/预设助手');
const source = fs.readFileSync(process.argv[2] || path.join(root, 'index.ts'), 'utf8');
const ast = ts.createSourceFile('index.ts', source, ts.ScriptTarget.Latest, true);
const functions = ['initializeScript', 'createOrShowPanel']
  .map(name => ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(ast))
  .join('\n');
async function check() {
  // 模拟宿主图标由打包 CSS 加载、没有独立 fontawesome link 的情况。
  const dom = new JSDOM(
    `<style>.fas,.fa-solid{display:inline-block}.mes_ghost{display:none}.mes[is_system="true"] .mes_ghost{display:flex}</style><div class="mes" is_system="false"><i class="mes_ghost fas fa-ghost"></i></div><div class="mes" is_system="true"><i class="mes_ghost fas fa-ghost"></i></div>`,
  );
  const $ = jquery(dom.window);
  const noOp = () => {};
  const context = {
    $,
    console,
    setTimeout,
    panel: null,
    styleTag: null,
    faLink: null,
    storage: { initialized: true },
    activeSettings: { theme: 'light' },
    hostEntryController: null,
    unregisterPanelViewportSync: null,
    loadStorage: noOp,
    refreshActiveSettings: noOp,
    refreshNsfwStatus: noOp,
    applyUiSkinToVisiblePanels: noOp,
    prepareControlPanelLayout: noOp,
    bindPanelViewportSync: noOp,
    containPanelTouchScroll: noOp,
    setPanelTheme: noOp,
    bindPanelEvents: noOp,
    renderStatusDisplay: noOp,
    renderPresetsList: noOp,
    renderQuickSwitchPanel: noOp,
    resolveUiSkinByLoadedPresetName: () => 'riyuexi',
    CURRENT_CHANGELOG_VERSION: 'test',
  };
  vm.createContext(context);
  const templates = fs
    .readFileSync(path.join(root, 'templates.ts'), 'utf8')
    .replace(/^import .*$/gm, '')
    .replaceAll('export const ', 'var ');
  vm.runInContext(templates, context);
  vm.runInContext(
    ts.transpileModule(functions, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText,
    context,
  );
  for (const name of ['initializeScript', 'createOrShowPanel', 'createOrShowPanel']) {
    await context[name]();
    assert.equal($('link[href*="font-awesome"]').length, 0, `${name} must not inject global icon CSS`);
    assert.equal(dom.window.getComputedStyle($('.mes[is_system="false"] .mes_ghost')[0]).display, 'none');
    assert.equal(dom.window.getComputedStyle($('.mes[is_system="true"] .mes_ghost')[0]).display, 'flex');
    assert.equal($('.mes[is_system="false"]').length, 1);
    assert.equal($('.mes[is_system="true"]').length, 1);
  }
  dom.window.close();
  console.log('PASS: startup, panel open/reopen preserve host hidden indicators and message visibility');
}
check().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
