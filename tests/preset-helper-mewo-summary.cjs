/* eslint-disable @typescript-eslint/no-require-imports, import-x/no-nodejs-modules */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync('tavern-helper/预设助手/mewoSummary.ts', 'utf8');
const code = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText;
const dom = new JSDOM('<body><div id="home"></div></body>');
const $ = require('jquery')(dom.window);
const notices = [];
const context = vm.createContext({
  exports: {},
  $,
  console,
  toastr: { info: value => notices.push(value), error: value => notices.push(value) },
});
vm.runInContext(code, context);
const { bindMewoSummary, mewoSummaryHtml } = context.exports;
const panel = $(`<div><button class="back-button">返回</button>${mewoSummaryHtml}</div>`).appendTo('body');
const controller = bindMewoSummary(panel);
const button = action => panel.find(`[data-mewo="${action}"]`);
const click = action => button(action).trigger('click');
const tick = () => new Promise(resolve => setImmediate(resolve));
const state = {
  ready: true,
  enabled: true,
  busy: false,
  autoEnabled: true,
  tokens: 12345,
  sourceVersion: '1.2.17',
  message: '自动总结已开启',
};
const root = $(
  '<div><button class="als-tab" data-tab="settings">配置</button><input value="未保存草稿"></div>',
).appendTo('#home');
let tabClicks = 0;
root.find('button').on('click', () => tabClicks++);
let runs = 0;
let resolveRun;
let rejectRun;
let lastOptions;
let refuseMount = false;
dom.window.MewoLargeSummary = {
  getState: () => ({ ...state }),
  mount(container) {
    if (refuseMount) return false;
    container.append(root[0]);
    return true;
  },
  unmount(container) {
    if (root[0].parentElement !== container) return false;
    $('#home').append(root);
    return true;
  },
  setEnabled: async enabled => {
    state.enabled = enabled;
    return true;
  },
  runManual: options => {
    runs++;
    lastOptions = options;
    return new Promise((resolve, reject) => {
      resolveRun = resolve;
      rejectRun = reject;
    });
  },
};
const notify = () => dom.window.dispatchEvent(new dom.window.Event('mewo-large-summary-state'));

(async () => {
  assert.equal(button('settings').prop('disabled'), true, 'missing plugin disables entry');
  assert.equal(panel.find('[data-mewo-install]').prop('hidden'), false);
  notify();
  assert.equal(button('settings').prop('disabled'), false, 'late plugin readiness refreshes UI');
  assert.match(panel.find('[data-mewo-tokens]').text(), /12,345/);
  assert.equal(runs, 0, 'status never generates');
  click('settings');
  assert.equal(tabClicks, 1);
  assert.equal(panel.find('[data-mewo-workspace-title]').text(), '总结配置');
  assert.equal(button('toggle').find('svg.summary-icon').length, 1, 'status refresh preserves inline icon');
  assert.equal(root[0].parentElement, panel.find('[data-mewo-mount]')[0]);
  panel.find('.back-button').trigger('click');
  assert.equal(root[0].parentElement.id, 'home');
  assert.equal(root.find('input').val(), '未保存草稿');
  state.busy = true;
  notify();
  assert.equal(button('incremental').prop('disabled'), true);
  assert.equal(button('settings').prop('disabled'), false, 'busy task controls stay accessible');
  state.busy = false;
  notify();
  click('incremental');
  click('refresh');
  click('merged');
  assert.equal(runs, 1, 'refresh cannot clear an in-flight lock');
  assert.equal(lastOptions.mode, 'incremental');
  resolveRun(true);
  await tick();
  click('merged');
  assert.equal(lastOptions.mode, 'merged');
  rejectRun(new Error('模拟失败'));
  await tick();
  assert.equal(button('merged').prop('disabled'), false, 'error releases local lock');
  assert.ok(notices.includes('模拟失败'));
  click('toggle');
  await tick();
  assert.equal(state.enabled, false);
  assert.equal(button('toggle').find('[data-mewo-toggle-label]').text(), '启用大总结');
  assert.equal(button('toggle').find('svg.summary-icon').length, 1, 'enable toggle does not erase icon');
  assert.equal(button('merged').prop('disabled'), true);
  assert.equal(button('settings').prop('disabled'), false);
  refuseMount = true;
  click('settings');
  await tick();
  assert.match(notices.at(-1), /其他窗口/);
  refuseMount = false;
  click('settings');
  controller.dispose();
  panel.remove();
  root.find('button').trigger('click');
  assert.equal(tabClicks, 3, 'return live DOM before jQuery cleanup preserves plugin handlers');
  assert.equal(root.find('input').val(), '未保存草稿');
  notify();
  dom.window.close();
  console.log(
    'PASS: missing/late plugin, state, tabs, drafts, busy/pending locks, errors, enable, mount conflict, disposal',
  );
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
