import type { StorageData } from './types';

const CACHE_KEY = 'tavern-helper:preset-assistant:storage:v1';
const DATABASE_NAME = 'tavern-helper-preset-assistant';
const DATABASE_VERSION = 1;
const STORE_NAME = 'configuration';
const RECORD_KEY = 'storage';

interface StorageEnvelope {
  savedAt: number;
  data: StorageData;
}

function isStorageData(value: unknown): value is StorageData {
  const data = value as Partial<StorageData> | null;
  return !!data && typeof data === 'object' && !!data.presets && typeof data.presets === 'object';
}

function parseEnvelope(value: unknown): StorageEnvelope | null {
  const envelope = value as Partial<StorageEnvelope> | null;
  if (!envelope || typeof envelope !== 'object' || !isStorageData(envelope.data)) return null;
  return {
    savedAt: Number(envelope.savedAt) || Number(envelope.data.storageRevision) || 0,
    data: envelope.data,
  };
}

export function loadStorageFromBrowserCache(): StorageEnvelope | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? parseEnvelope(JSON.parse(raw)) : null;
  } catch (error) {
    console.warn('预设助手: 读取浏览器缓存配置失败', error);
    return null;
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB 打开失败'));
  });
}

export async function loadStorageFromIndexedDb(): Promise<StorageEnvelope | null> {
  try {
    const database = await openDatabase();
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(RECORD_KEY);
      request.onsuccess = () => resolve(parseEnvelope(request.result));
      request.onerror = () => reject(request.error || new Error('IndexedDB 读取失败'));
      transaction.oncomplete = () => database.close();
    });
  } catch (error) {
    console.warn('预设助手: 读取 IndexedDB 配置失败', error);
    return null;
  }
}

export function saveStorageToBrowser(data: StorageData) {
  const envelope: StorageEnvelope = {
    savedAt: Number(data.storageRevision) || Date.now(),
    data: klona(data),
  };

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(envelope));
  } catch (error) {
    console.warn('预设助手: 写入浏览器缓存配置失败', error);
  }

  void (async () => {
    try {
      const database = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).put(envelope, RECORD_KEY);
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error || new Error('IndexedDB 写入失败'));
        transaction.onabort = () => reject(transaction.error || new Error('IndexedDB 写入中止'));
      });
    } catch (error) {
      console.warn('预设助手: 写入 IndexedDB 配置失败', error);
    }
  })();
}

export function getStorageRevision(data: StorageData | null | undefined): number {
  if (!data) return 0;
  const explicitRevision = Number(data.storageRevision) || 0;
  const presetRevision = Math.max(
    0,
    ...Object.values(data.presets || {}).map(preset => Number(preset.updateTime) || 0),
  );
  const customQuickRequestRevision = Math.max(
    0,
    ...Object.values(data.customQuickRequests || {}).map(item => Number(item.updateTime) || 0),
  );
  return Math.max(explicitRevision, presetRevision, customQuickRequestRevision);
}
