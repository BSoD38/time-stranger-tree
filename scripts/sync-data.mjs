// data/ (scraper drop-in, committed) → public/ (gitignored, served by Vite).
// Copies digimon.json + full icons, and emits 128px webp thumbnails for graph
// nodes. Incremental: skips outputs newer than their source, so the predev
// hook is a fast no-op when nothing changed.
import { copyFile, mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');
const DATA = path.join(ROOT, 'data');
const PUBLIC = path.join(ROOT, 'public');

const THUMB_SIZE = 128; // 56px nodes @2x DPR need >=112px
const THUMB_QUALITY = 75;

async function mtime(file) {
  try {
    return (await stat(file)).mtimeMs;
  } catch {
    return -1;
  }
}

async function main() {
  await mkdir(path.join(PUBLIC, 'icons'), { recursive: true });
  await mkdir(path.join(PUBLIC, 'thumbs'), { recursive: true });

  let copied = 0;
  let thumbed = 0;

  const jsonSrc = path.join(DATA, 'digimon.json');
  const jsonDest = path.join(PUBLIC, 'digimon.json');
  if ((await mtime(jsonSrc)) > (await mtime(jsonDest))) {
    await copyFile(jsonSrc, jsonDest);
    copied += 1;
  }

  const icons = (await readdir(path.join(DATA, 'icons'))).filter((f) => f.endsWith('.png'));
  for (const file of icons) {
    const src = path.join(DATA, 'icons', file);
    const srcTime = await mtime(src);

    const iconDest = path.join(PUBLIC, 'icons', file);
    if (srcTime > (await mtime(iconDest))) {
      await copyFile(src, iconDest);
      copied += 1;
    }

    const thumbDest = path.join(PUBLIC, 'thumbs', file.replace(/\.png$/, '.webp'));
    if (srcTime > (await mtime(thumbDest))) {
      await sharp(src)
        .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: THUMB_QUALITY })
        .toFile(thumbDest);
      thumbed += 1;
    }
  }

  console.log(`data:sync — ${icons.length} icons; ${copied} copied, ${thumbed} thumbnails generated`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
