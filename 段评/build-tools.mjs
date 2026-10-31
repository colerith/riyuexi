import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
export async function writeArtifacts(code, sourceDir, outputRoot) {
  const { version } = JSON.parse(
    (await fs.readFile(path.join(sourceDir, 'release.json'), 'utf8')).replace(/^\uFEFF/, ''),
  );
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Invalid comments version');
  if (/\bfrom\s*['"]https?:|\bimport\s*['"]https?:/.test(code))
    throw new Error('Offline bundle contains remote imports');
  const dir = path.join(outputRoot, `novel-comments-v${version}`);
  await fs.mkdir(dir, { recursive: true });
  const localName = 'novel-comments-local.js';
  const network = `import ${JSON.stringify(`https://cdn.jsdelivr.net/gh/colerith/riyuexi@main/段评/release/novel-comments-v${version}/index-${version}.js`)};\n`;
  const script = (content, mode) => ({
    type: 'script',
    enabled: true,
    name: `日月西-段评美化（${mode}）`,
    id: 'fc9962b6-e3d1-445c-9a0e-106a5d104208',
    content,
    info: `v${version}；本地版与网络版只启用一个。内置240张头像；点赞、日期及等级为本地模拟评论展示。`,
    button: { enabled: true, buttons: [{ name: '段评设置', visible: true }] },
    data: {},
    export_with: { data: true, button: true },
  });
  const files = {
    [`index-${version}.js`]: code,
    [localName]: code,
    'novel-comments-local.json': JSON.stringify(script(code, '本地'), null, 2) + '\n',
    'novel-comments-network.js': network,
    'novel-comments-network.json': JSON.stringify(script(network, '网络'), null, 2) + '\n',
  };
  for (const name of ['提示词.txt', 'AVATAR-LICENSE.txt', 'FFLATE-LICENSE.txt'])
    files[name] = await fs.readFile(path.join(sourceDir, name), 'utf8');
  for (const [name, value] of Object.entries(files)) await fs.writeFile(path.join(dir, name), value);
  const manifest = {
    version,
    avatars: 240,
    sha256: createHash('sha256').update(code).digest('hex'),
    files: Object.fromEntries(
      Object.entries(files).map(([name, value]) => [
        name,
        { bytes: Buffer.byteLength(value), sha256: createHash('sha256').update(value).digest('hex') },
      ]),
    ),
  };
  await fs.writeFile(path.join(dir, 'release.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`[段评] 已生成本地/网络脚本和导入 JSON：${dir}`);
  return dir;
}
export function commentArtifactsPlugin(sourceDir, outputRoot) {
  return {
    apply(compiler) {
      compiler.hooks.afterEmit.tapPromise('NovelCommentsArtifacts', async compilation => {
        if (compilation.errors.length) return;
        const code = await fs.readFile(path.join(compiler.options.output.path, 'index.js'), 'utf8');
        await writeArtifacts(code, sourceDir, outputRoot);
      });
    },
  };
}
