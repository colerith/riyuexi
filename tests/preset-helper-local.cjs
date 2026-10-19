const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
if (typeof vm.SyntheticModule !== 'function') {
  require('node:child_process').execFileSync(
    process.execPath,
    ['--experimental-vm-modules', __filename, ...process.argv.slice(2)],
    { stdio: 'inherit' },
  );
  process.exit(0);
}
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const ts = require('typescript');
const folder = process.argv[2] || 'file';
const manifest = fs.existsSync(`${folder}/preset-helper-release-v1.json`)
  ? `${folder}/preset-helper-release-v1.json`
  : path.join(folder, '..', 'preset-helper-release-v1.json');
const release = JSON.parse(fs.readFileSync(manifest, 'utf8'));
const artifact = (kind, ext) => {
  const plain = `${folder}/preset-helper-${kind}.${ext}`;
  return fs.existsSync(plain) ? plain : `${folder}/preset-helper-${kind}-${release.version}.${ext}`;
};
const main = fs.readFileSync(`${folder}/index-${release.version}.js`, 'utf8');
const loader = fs.readFileSync(artifact('local', 'js'), 'utf8');
assert.equal(createHash('sha256').update(main).digest('hex'), release.sha256);
const ast = ts.createSourceFile('main.js', main, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(ast.statements.filter(node => ts.isImportDeclaration(node)).length, 0);
assert.ok(Buffer.byteLength(loader) < 350000, 'offline upload must remain small');

(async () => {
  let captured,
    runs = 0,
    revoked = 0;
  const window = {};
  const context = vm.createContext({
    window,
    Uint8Array,
    TextDecoder,
    TextEncoder,
    Blob,
    console,
    atob: value => Buffer.from(value, 'base64').toString('binary'),
    URL: {
      createObjectURL(blob) {
        captured = blob;
        return 'blob:test-local';
      },
      revokeObjectURL(url) {
        assert.equal(url, 'blob:test-local');
        revoked++;
      },
    },
    fetch() {
      throw Error('Local loader must never fetch');
    },
    toastr: {
      error(message) {
        throw Error(message);
      },
    },
  });
  const script = new vm.Script(loader, {
    importModuleDynamically: async url => {
      assert.equal(url, 'blob:test-local');
      runs++;
      const mod = new vm.SyntheticModule([], () => {}, { context });
      await mod.link(() => {});
      await mod.evaluate();
      return mod;
    },
  });
  script.runInContext(context);
  script.runInContext(context);
  await window.__presetLocalLoading;
  assert.equal(await captured.text(), main, 'decompression must reproduce the exact complete application');
  assert.equal(runs, 1, 'repeated paste does not start twice in the same iframe');
  assert.equal(revoked, 1, 'blob is released after import');
  for (const kind of ['git-loader', 'local']) {
    const imported = JSON.parse(fs.readFileSync(artifact(kind, 'json'), 'utf8'));
    assert.equal(imported.content, fs.readFileSync(artifact(kind, 'js'), 'utf8'));
    assert.equal(imported.id, 'bbc187d8-b4c4-4a2f-984a-3eac92d859da');
  }
  console.log(
    'PASS: offline startup without fetch, exact payload, single execution, blob cleanup, import JSON, release hash, no external modules, size budget',
  );
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
