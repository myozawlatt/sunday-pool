/**
 * Builds the favicon, header logo and install (web app manifest) icons from public/favicon.png.
 * Usage: npm run icons   (re-run whenever the source image changes)
 */
import sharp from 'sharp';

const SOURCE = 'public/favicon.png';
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

type Output = { file: string; size: number; background: typeof TRANSPARENT | string; inset?: number };

const outputs: Output[] = [
  // Browser tab icon — picked up automatically by Next.js (app/icon.png); also the manifest's 192px icon
  { file: 'app/icon.png', size: 192, background: TRANSPARENT },
  // iOS home-screen icon — iOS shows transparency as black, so use the cream main colour
  { file: 'app/apple-icon.png', size: 180, background: '#fbfaee' },
  // Header logo, 2x for sharp rendering at 40px
  { file: 'public/logo.png', size: 128, background: TRANSPARENT },
  // Install icons (app/manifest.ts): Chrome requires a 512px icon to offer installation
  { file: 'public/icon-512.png', size: 512, background: TRANSPARENT },
  // Android crops maskable icons to a circle/squircle, so keep the logo inside the central safe zone
  { file: 'public/icon-maskable.png', size: 512, background: '#fbfaee', inset: 100 },
];

for (const { file, size, background, inset = 0 } of outputs) {
  const inner = size - inset * 2;
  let image = sharp(SOURCE).resize(inner, inner, { fit: 'contain', background });
  if (inset) image = image.extend({ top: inset, bottom: inset, left: inset, right: inset, background });
  if (background !== TRANSPARENT) image = image.flatten({ background });
  const info = await image.png({ compressionLevel: 9 }).toFile(file);
  console.log(`${file.padEnd(24)} ${info.width}x${info.height}  ${(info.size / 1024).toFixed(1)} KB`);
}
