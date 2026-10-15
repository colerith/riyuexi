const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync('tavern-helper/预设助手/persistence.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText;

(async () => {
  for (const scenario of ['open-timeout', 'blocked', 'read-timeout', 'success']) {
    const timers = new Map();
    let id = 0;
    let closed = false;
    const read = {};
    const transaction = {
      objectStore: () => ({ get: () => read }),
      abort() {
        this.onabort?.();
      },
    };
    const database = {
      close() {
        closed = true;
      },
      transaction: () => transaction,
    };
    const request = { result: database };
    // IDBRequest.error cannot be read before the request has finished.
    Object.defineProperty(request, 'error', {
      get() {
        throw new Error('InvalidStateError');
      },
    });
    const context = vm.createContext({
      exports: {},
      console: { warn() {} },
      indexedDB: { open: () => request },
      setTimeout: fn => {
        timers.set(++id, fn);
        return id;
      },
      clearTimeout: key => timers.delete(key),
    });
    vm.runInContext(code, context);
    const result = context.exports.loadStorageFromIndexedDb();
    if (scenario === 'blocked') request.onblocked();
    else if (scenario === 'open-timeout') [...timers.values()][0]();
    else {
      request.onsuccess();
      await Promise.resolve();
      if (scenario === 'read-timeout') [...timers.values()][0]();
      else {
        read.result = { savedAt: 1, data: { presets: {} } };
        read.onsuccess();
        transaction.oncomplete();
      }
    }
    const value = await result;
    assert.equal(value === null, scenario !== 'success');
    if (scenario === 'open-timeout' || scenario === 'blocked') request.onsuccess();
    assert.ok(closed, `${scenario}: database released, including late open`);
    console.log(`PASS ${scenario}`);
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
