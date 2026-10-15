import { sha256 } from '@noble/hashes/sha2.js';

export type Release = { version: string; sha256: string };
export type CacheEntry = Release & { code: string };
const hosts = [
  'https://fastly.jsdelivr.net/gh/colerith/riyuexi@',
  'https://cdn.jsdmirror.com/gh/colerith/riyuexi@',
  'https://raw.githubusercontent.com/colerith/riyuexi/',
];
const urlFor = (host: string, revision: string, path: string) => `${host}${revision}/${path}`;
const revision = (version: string) => Number(version.split('.').pop());
const validRelease = (value: any): value is Release =>
  !!value && /^0\.42\.\d+$/.test(value.version) && /^[a-f0-9]{64}$/.test(value.sha256);
export const validCache = (value: unknown): value is CacheEntry => {
  const entry = value as CacheEntry;
  return (
    validRelease(entry) &&
    typeof entry.code === 'string' &&
    Array.from(sha256(new TextEncoder().encode(entry.code)), byte => byte.toString(16).padStart(2, '0')).join('') ===
      entry.sha256
  );
};

async function requestText(url: string) {
  const controller = new AbortController();
  // 不使用 Safari 旧版本不支持的 AbortSignal.timeout。
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function downloadRelease(fetchText = requestText): Promise<CacheEntry> {
  for (const host of hosts) {
    try {
      const release = JSON.parse(await fetchText(urlFor(host, 'main', 'preset-helper-release.json')));
      if (!validRelease(release)) throw new Error('发布清单无效');
      const code = await fetchText(urlFor(host, `v${release.version}`, `file/index-${release.version}.js`));
      const entry = { ...release, code };
      if (!validCache(entry)) throw new Error('SHA-256 校验失败');
      return entry;
    } catch (error) {
      console.warn('[预设助手 Git] 当前下载源不可用，尝试下一源', host, error);
    }
  }
  throw new Error('所有下载源均不可用，请检查网络后重新加载脚本');
}

// 主文件包含图片，可能超过 localStorage 容量；使用 IndexedDB 缓存完整脚本。
export function scriptCache(write?: CacheEntry): Promise<CacheEntry | null> {
  return new Promise((resolve, reject) => {
    let database: IDBDatabase | undefined;
    let transaction: IDBTransaction | undefined;
    let settled = false;
    const finish = (value: CacheEntry | null, error?: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      database?.close();
      if (error) reject(error);
      else resolve(value);
    };
    const timer = setTimeout(() => {
      finish(null, new Error('脚本缓存访问超时'));
      try {
        transaction?.abort();
      } catch {
        /* 已结束的事务无需中止 */
      }
    }, 2000);
    try {
      const request = indexedDB.open('preset-helper-git-loader', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('scripts');
      request.onblocked = () => finish(null, new Error('脚本缓存被占用'));
      request.onerror = () => finish(null, request.error);
      request.onsuccess = () => {
        database = request.result;
        if (settled) {
          database.close();
          return;
        }
        try {
          transaction = database.transaction('scripts', write ? 'readwrite' : 'readonly');
          const store = transaction.objectStore('scripts');
          const operation = write ? store.put(write, 'current') : store.get('current');
          transaction.oncomplete = () => finish(write ?? operation.result ?? null);
          transaction.onerror = transaction.onabort = () =>
            finish(null, transaction?.error || new Error('脚本缓存操作失败'));
        } catch (error) {
          finish(null, error);
        }
      };
    } catch (error) {
      finish(null, error);
    }
  });
}

async function execute(entry: CacheEntry) {
  const url = URL.createObjectURL(new Blob([entry.code], { type: 'text/javascript' }));
  try {
    await import(/* webpackIgnore: true */ url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function loadPresetGit(
  deps = {
    read: () => scriptCache(),
    save: (entry: CacheEntry) => scriptCache(entry),
    download: () => downloadRelease(),
    run: execute,
  },
) {
  let cached: CacheEntry | null = null;
  try {
    const entry = await deps.read();
    if (validCache(entry)) cached = entry;
  } catch (error) {
    console.warn('[预设助手 Git] 缓存不可用，改为在线加载', error);
  }
  if (cached) {
    await deps.run(cached);
    // 不在当前页面热替换，避免重复注册事件或打断正在编辑的设置。
    const current = cached;
    const update = deps
      .download()
      .then(async next => {
        if (revision(next.version) > revision(current.version)) {
          await deps.save(next);
          console.info('[预设助手 Git] 更新已缓存，下次重载生效：', next.version);
        }
      })
      .catch(error => console.warn('[预设助手 Git] 更新检查失败，当前缓存版可继续使用', error));
    return { version: cached.version, update };
  }
  const entry = await deps.download();
  // 运行失败时不再执行另一份代码，避免部分初始化后重复注册。
  await deps.run(entry);
  try {
    await deps.save(entry);
  } catch (error) {
    console.warn('[预设助手 Git] 本次运行正常，但无法保存离线缓存', error);
  }
  return { version: entry.version, update: Promise.resolve() };
}
