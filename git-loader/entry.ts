import { loadPresetGit } from './runtime';

// 去重范围限定为当前脚本 iframe，卸载后不会留下阻止重启的宿主标记。
const scope = window as Window & { __presetGitLoading?: Promise<unknown> };
if (!scope.__presetGitLoading) {
  scope.__presetGitLoading = loadPresetGit().catch(error => {
    delete scope.__presetGitLoading;
    console.error('[预设助手 Git] 加载失败', error);
    toastr.error(`预设助手加载失败：${error instanceof Error ? error.message : String(error)}`);
  });
}
