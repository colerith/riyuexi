const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const ts = require('typescript');
const source = fs.readFileSync('git-loader/runtime.ts', 'utf8');
const context = vm.createContext({ exports: {}, require, TextEncoder, console: { warn() {}, info() {} } });
vm.runInContext(
  ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText,
  context,
);
const api = context.exports;
const entry = (version, code = 'window.test = 1;') => ({
  version,
  code,
  sha256: createHash('sha256').update(code).digest('hex'),
});
const old = entry('1.0.9');
const next = entry('1.0.10', 'window.test = 2;');
(async () => {
  assert.ok(api.validCache(old));
  assert.equal(api.validCache(entry('0.42.9')), false, 'legacy cache cannot cross release channels');
  assert.equal(api.validCache(entry('1.0.01')), false);
  assert.ok(api.compareVersions('1.0.10', '1.0.9') > 0);
  assert.ok(api.compareVersions('1.0.0', '0.42.99') > 0);
  assert.equal(api.validCache({ ...old, code: 'tampered' }), false);
  let ran = [],
    saved = [];
  const deps = {
    read: async () => old,
    save: async e => saved.push(e),
    run: async e => ran.push(e),
    download: async () => next,
  };
  const cached = await api.loadPresetGit(deps);
  await cached.update;
  assert.deepEqual(ran, [old]);
  assert.deepEqual(saved, [next]);
  ran = [];
  saved = [];
  const offline = await api.loadPresetGit({
    ...deps,
    download: async () => {
      throw Error('offline');
    },
  });
  await offline.update;
  assert.deepEqual(ran, [old]);
  const downgrade = await api.loadPresetGit({ ...deps, download: async () => entry('1.0.8') });
  await downgrade.update;
  assert.equal(saved.length, 0);
  ran = [];
  await api.loadPresetGit({
    ...deps,
    read: async () => {
      throw Error('storage blocked');
    },
    save: async () => {
      throw Error('quota');
    },
  });
  assert.deepEqual(ran, [next]);
  let downloads = 0;
  await assert.rejects(
    api.loadPresetGit({
      ...deps,
      run: async () => {
        throw Error('execution failed');
      },
      download: async () => {
        downloads++;
        return next;
      },
    }),
  );
  assert.equal(downloads, 0, 'execution errors do not start a second instance');
  const urls = [];
  const downloaded = await api.downloadRelease(async url => {
    urls.push(url);
    if (url.endsWith('.json')) return JSON.stringify(next);
    return url.includes('fastly') ? 'tampered' : next.code;
  });
  assert.equal(downloaded.sha256, next.sha256);
  assert.equal(urls.length, 4, 'bad checksum falls back to next mirror');
  assert.ok(urls[0].endsWith('main/preset-helper-release-v1.json'));
  await assert.rejects(
    api.downloadRelease(async () => {
      throw Error('offline');
    }),
  );
  console.log(
    'PASS: hash validation, cached startup, offline fallback, background update, no downgrade, blocked storage, single execution, mirror fallback',
  );
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
