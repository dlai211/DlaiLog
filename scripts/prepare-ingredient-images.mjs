// Turns the photos in `images/` into the app's ingredient pictures.
//
// The originals are full-size PNGs (a few megabytes each); the app needs small
// squares. Each one is drawn onto a white 256×256 canvas and saved as a JPEG in
// `assets/ingredients/`, named after the ingredient key it belongs to (see
// src/data/ingredient-photos.ts). Run it again after adding new photos:
//
//   node scripts/prepare-ingredient-images.mjs
//
// It also writes a contact sheet to scripts/contact-sheet.png so the whole set
// can be checked at a glance.
import { readdirSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const SOURCE_DIR = 'images';
const OUT_DIR = 'assets/ingredients';
const SIZE = 256;

/** Filename (without extension) → ingredient key. Anything not listed keeps its name. */
const RENAMES = {
  eggs: 'egg',
  shanghai_bok_choy: 'bok-choy',
};

const files = readdirSync(SOURCE_DIR).filter((name) => name.toLowerCase().endsWith('.png'));
mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });

const results = [];
for (const file of files.sort()) {
  const base = file.replace(/\.png$/i, '');
  const key = (RENAMES[base] ?? base).replace(/_/g, '-');
  const dataUrl = `data:image/png;base64,${(await import('node:fs')).readFileSync(join(SOURCE_DIR, file)).toString('base64')}`;

  const output = await page.evaluate(
    async ([src, size]) => {
      const image = new Image();
      image.src = src;
      await image.decode();

      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, size, size);

      // Contain the picture inside the square, centred.
      const scale = Math.min(size / image.width, size / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);

      return canvas.toDataURL('image/jpeg', 0.86);
    },
    [dataUrl, SIZE]
  );

  const bytes = Buffer.from(output.split(',')[1], 'base64');
  writeFileSync(join(OUT_DIR, `${key}.jpg`), bytes);
  results.push({ key, file, kb: Math.round(bytes.length / 1024), src: output });
  console.log(`${file.padEnd(26)} → ${OUT_DIR}/${key}.jpg (${Math.round(bytes.length / 1024)} KB)`);
}

// A labelled contact sheet, for checking the whole set in one look.
const cells = results
  .map(
    ({ key, src }) =>
      `<figure><img src="${src}" alt=""><figcaption>${key}</figcaption></figure>`
  )
  .join('');
await page.setContent(
  `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;padding:24px;background:#FBF3D5;font:13px/1.4 system-ui;display:grid;
      grid-template-columns:repeat(6,1fr);gap:16px}
    figure{margin:0;background:#FFFDF6;border:1px dashed #C4BFA4;border-radius:12px;padding:8px;
      display:flex;flex-direction:column;gap:6px;align-items:center}
    img{width:100%;aspect-ratio:1;border-radius:8px}
    figcaption{color:#33382F;font-weight:600}
  </style><body>${cells}</body>`,
  { baseURL: undefined }
);
await page.evaluate(async () => {
  // Wait for every picture before the screenshot.
  await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
});
await page.screenshot({ path: 'scripts/contact-sheet.png', fullPage: true });

await browser.close();
console.log(`\n${results.length} pictures · total ${results.reduce((sum, r) => sum + r.kb, 0)} KB`);
console.log('Contact sheet: scripts/contact-sheet.png');
