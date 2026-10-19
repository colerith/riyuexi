import { gunzipSync, strFromU8 } from 'fflate';

// 打包时注入压缩后的完整主程序，不包含任何在线加载地址。
declare const PRESET_LOCAL_PAYLOAD: string;
declare const PRESET_LOCAL_VERSION: string;

export function decodeLocalPayload(payload: string) {
  const binary = atob(payload);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return strFromU8(gunzipSync(bytes));
}

async function startLocal() {
  const code = decodeLocalPayload(PRESET_LOCAL_PAYLOAD);
  const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
  try {
    await import(/* webpackIgnore: true */ url);
    console.info(`[预设助手本地版] v${PRESET_LOCAL_VERSION} 已加载`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const scope = window as Window & { __presetLocalLoading?: Promise<void> };
if (!scope.__presetLocalLoading) {
  scope.__presetLocalLoading = startLocal().catch(error => {
    delete scope.__presetLocalLoading;
    console.error('[预设助手本地版] 加载失败', error);
    toastr.error('预设助手本地版加载失败，请重新导入完整脚本。');
  });
}
