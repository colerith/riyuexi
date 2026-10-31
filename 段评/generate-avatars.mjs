import fs from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createAvatar } from '@dicebear/core';
import * as openPeeps from '@dicebear/open-peeps';
const destination = new URL('./', import.meta.url);
const colors = ['f3e8d4', 'dfebe4', 'e1e8f4', 'efdeea', 'f5e0d8', 'e2e0f1', 'd9edef', 'ede7dc'];
const avatars = Array.from({ length: 240 }, (_, i) =>
  createAvatar(openPeeps, {
    seed: `riyuexi-comments-${i}`,
    size: 96,
    backgroundColor: [colors[i % colors.length]],
  }).toString(),
);
if (new Set(avatars).size !== 240) throw new Error('Duplicate avatars');
await fs.writeFile(
  new URL('avatars.pack.txt', destination),
  gzipSync(JSON.stringify(avatars), { level: 9 }).toString('base64'),
);
await fs.writeFile(
  new URL('AVATAR-LICENSE.txt', destination),
  `Open Peeps by Pablo Stanley, remixed by DiceBear.\nDesign: CC0 1.0 https://creativecommons.org/publicdomain/zero/1.0/\nSource: https://www.openpeeps.com/\nGenerator: @dicebear/core 9.4.2 + @dicebear/open-peeps 9.4.2\n240 deterministic SVG portraits, generated locally.\n\n${await fs.readFile(new URL('./node_modules/@dicebear/open-peeps/LICENSE', import.meta.url), 'utf8')}`,
);
console.log('Generated 240 unique embedded Open Peeps avatars');
