import fs from 'node:fs/promises';
import sharp from 'sharp';
import { createAvatar } from '@dicebear/core';
import * as openPeeps from '@dicebear/open-peeps';
import * as notionists from '@dicebear/notionists';
import * as pixelArt from '@dicebear/pixel-art';
import * as micah from '@dicebear/micah';
import * as lorelei from '@dicebear/lorelei';
import * as adventurer from '@dicebear/adventurer';
import * as funEmoji from '@dicebear/fun-emoji';
import * as personas from '@dicebear/personas';
const destination = new URL('./', import.meta.url);
const styles = { openPeeps, notionists, pixelArt, micah, lorelei, adventurer, funEmoji, personas };
const colors = ['f3e8d4', 'dfebe4', 'e1e8f4', 'efdeea', 'f5e0d8', 'e2e0f1', 'd9edef', 'ede7dc'];
const chunks = [],
  all = [],
  credits = [];
for (const [name, style] of Object.entries(styles)) {
  const avatars = await Promise.all(
    Array.from({ length: 40 }, async (_, i) => {
      const svg = createAvatar(style, {
        seed: `riyuexi-comments-${name}-${i}`,
        size: 96,
        backgroundColor: [colors[i % colors.length]],
      }).toString();
      const bytes = await sharp(Buffer.from(svg)).resize(96, 96).webp({ quality: 82, effort: 6 }).toBuffer();
      return `data:image/webp;base64,${bytes.toString('base64')}`;
    }),
  );
  all.push(...avatars);
  chunks.push({ style: name, count: avatars.length, data: JSON.stringify(avatars) });
  credits.push(
    `${style.meta.title} — ${style.meta.creator}\nOriginal: ${style.meta.source}\nLicense: ${style.meta.license.name} ${style.meta.license.url}\nModification: generated combinations and pastel backgrounds via DiceBear 9.4.2; rasterized as 96px WebP for local use.\n`,
  );
}
if (new Set(all).size !== 320) throw Error('Duplicate avatar');
await fs.writeFile(new URL('avatars.pack.txt', destination), JSON.stringify(chunks));
await fs.writeFile(
  new URL('AVATAR-LICENSE.txt', destination),
  `320 embedded WebP portraits / 8 styles / 40 per style.\n\n${credits.join('\n')}\nGenerator code MIT:\n${await fs.readFile(new URL('../LICENSE', import.meta.resolve('@dicebear/open-peeps')), 'utf8')}`,
);
console.log('Generated 320 avatars across 8 lazy-load packs');
