const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const root = 'tavern-helper/预设助手';
function load(file, edition) {
  const context = vm.createContext({
    exports: {},
    PRESET_EDITION: edition,
    TextEncoder,
    console,
    require: name =>
      name.startsWith('.') ? load(path.resolve(path.dirname(file), name + '.ts'), edition) : require(name),
  });
  vm.runInContext(
    ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
    }).outputText,
    context,
  );
  return context.exports;
}
(async () => {
  for (const [edition, version, other, channel] of [
    ['1.0', '1.0.2', '0.42.10', 'v1'],
    ['0.42', '0.42.10', '1.0.2', 'v042'],
  ]) {
    const logs = load(`${root}/changelog.ts`, edition);
    assert.equal(logs.CURRENT_CHANGELOG_VERSION, edition);
    assert.equal(logs.CHANGELOGS[0].version, edition);
    if (edition === '0.42') assert.ok(logs.CHANGELOGS.every(entry => entry.version !== '1.0'));
    const document = new JSDOM(logs.renderChangelogEntries()).window.document;
    assert.equal(document.querySelectorAll('.changelog-latest-tag').length, 1);
    const latest = document.querySelector('.changelog-entry-body');
    const original = fs
      .readFileSync(`${root}/changelogs/v${edition}.md`, 'utf8')
      .split(/\r?\n/)
      .slice(1)
      .map(line => line.replace(/^(?:> |##? |\s*- )/, ''))
      .filter(Boolean)
      .join('');
    assert.equal(latest.textContent.replace(/\s/g, ''), original.replace(/\s/g, ''));
    const api = load('git-loader/runtime.ts', edition);
    const code = 'window.presetTest = true;';
    const sha256 = createHash('sha256').update(code).digest('hex');
    assert.ok(api.validCache({ version, code, sha256 }));
    assert.equal(api.validCache({ version: other, code, sha256 }), false);
    const urls = [];
    await api.downloadRelease(async url => {
      urls.push(url);
      return url.split('?')[0].endsWith('.json') ? JSON.stringify({ version, sha256 }) : code;
    });
    assert.ok(urls[0].split('?')[0].endsWith(`preset-helper-release-${channel}.json`));
    assert.ok(urls[3].includes(`@v${version}/file/index-${version}.js`));
  }
  console.log('PASS: exact changelog text, latest marker, edition isolation and matching release URLs');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
