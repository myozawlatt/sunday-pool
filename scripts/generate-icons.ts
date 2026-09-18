/**
 * Builds the favicon and header logo from public/favicon.png.
 * Usage: npm run icons   (re-run whenever the source image changes)
 */
import sharp from 'sharp';

const SOURCE = 'public/favicon.png';
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

const outputs = [
  // Browser tab icon — picked up automatically by Next.js (app/icon.png)
  { file: 'app/icon.png', size: 192, background: TRANSPARENT },
  // iOS home-screen icon — iOS shows transparency as black, so use the cream main colour
  { file: 'app/apple-icon.png', size: 180, background: '#fbfaee' },
  // Header logo, 2x for sharp rendering at 40px
  { file: 'public/logo.png', size: 128, background: TRANSPARENT },
];

for (const { file, size, background } of outputs) {
  let image = sharp(SOURCE).resize(size, size, { fit: 'contain', background: TRANSPARENT });
  if (background !== TRANSPARENT) image = image.flatten({ background });
  const info = await image.png({ compressionLevel: 9 }).toFile(file);
  console.log(`${file.padEnd(20)} ${info.width}x${info.height}  ${(info.size / 1024).toFixed(1)} KB`);
}
