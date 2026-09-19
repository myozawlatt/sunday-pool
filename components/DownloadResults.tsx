'use client';

import { useRef, useState } from 'react';

type Status = 'idle' | 'busy' | 'ready' | 'error';

const LABELS: Record<Status, string> = {
  idle: 'Download results as image',
  busy: 'Creating image…',
  ready: 'Save image',
  error: 'Couldn’t create the image — tap to retry',
};

// iOS Safari refuses to draw canvases over ~16.7M pixels
const MAX_PIXELS = 16_000_000;

// Brand row drawn above the captured page, in CSS px; larger than the header's since it heads the image
type BrandSize = { top: number; logo: number; font: number; gap: number };
const BRAND: Record<'desktop' | 'phone', BrandSize> = {
  desktop: { top: 40, logo: 48, font: 28, gap: 12 },
  phone: { top: 24, logo: 40, font: 24, gap: 10 },
};

// Loaded on demand so the capture library stays out of the page bundle
const loadCapture = () => import('modern-screenshot');

async function captureImage(root: HTMLElement) {
  const { domToCanvas } = await loadCapture();
  // Most avatars are lazy-loaded and may not have been scrolled into view yet
  const images = Array.from(root.querySelectorAll('img'));
  images.forEach((img) => (img.loading = 'eager'));
  const logo = new Image();
  logo.src = '/logo.png';
  await Promise.all([
    document.fonts.ready,
    document.fonts.load('700 1em "Clash Grotesk"'),
    logo.decode(),
    ...images.map((img) => img.decode().catch(() => {})),
  ]);

  const tokens = getComputedStyle(document.documentElement);
  const color = (name: string) => tokens.getPropertyValue(name).trim();
  const { width, height } = root.getBoundingClientRect();
  const brand = width > 600 ? BRAND.desktop : BRAND.phone;
  const band = brand.top + brand.logo;
  const scale = Math.min(2, Math.sqrt(MAX_PIXELS / (width * (height + band))));

  // The copy renders text a touch wider than the page, so shrink-wrapped labels (the champion's name,
  // "4 players") would wrap. Mark text that sits on one line here, and keep it on one line in the copy.
  const singleLine = Array.from(root.querySelectorAll('*')).filter(isSingleLineText);
  singleLine.forEach((el) => el.setAttribute('data-capture-nowrap', ''));
  let page: HTMLCanvasElement;
  try {
    page = await domToCanvas(root, {
      scale,
      backgroundColor: color('--bg'),
      filter: (node) => !(node instanceof Element && node.hasAttribute('data-capture-exclude')),
      onCloneEachNode: fixClone,
    });
  } finally {
    singleLine.forEach((el) => el.removeAttribute('data-capture-nowrap'));
  }

  // The brand row exists only in the image (the page has it in the header), so it is drawn rather than captured
  const canvas = document.createElement('canvas');
  canvas.width = page.width;
  canvas.height = page.height + Math.round(band * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color('--bg');
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(page, 0, Math.round(band * scale));
  drawBrand(ctx, { logo, size: brand, width, scale, ink: color('--ink'), accent: color('--accent') });

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Canvas export failed'))), 'image/png'),
  );
}

/** An element with its own text, all of it on one line on the page. */
function isSingleLineText(el: Element) {
  if (!Array.from(el.childNodes).some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())) return false;
  const range = document.createRange();
  range.selectNodeContents(el);
  const [first, ...rest] = Array.from(range.getClientRects());
  return !!first && rest.every((rect) => rect.top < first.bottom && rect.bottom > first.top);
}

/** Adjusts each copied element, whose styles the library has inlined as computed (pixel) values. */
function fixClone(node: Node) {
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as HTMLElement;
  // The fixtures table sizes columns with width 1% / 100% plus max-width: 0 on the name column. Copied as
  // pixel widths, that max-width (and its logical twin) hands the spare width to the wrong columns; the
  // pixel widths alone match the page.
  if (el.tagName === 'TD' || el.tagName === 'TH') {
    el.style.removeProperty('max-width');
    el.style.removeProperty('max-inline-size');
  }
  if (el.hasAttribute('data-capture-nowrap')) el.style.setProperty('white-space', 'nowrap');
}

/** The header's brand (logo, "Sunday Pool" with "Pool" in the accent colour), centred in the top band. */
function drawBrand(
  ctx: CanvasRenderingContext2D,
  { logo, size, width, scale, ink, accent }: { logo: HTMLImageElement; size: BrandSize; width: number; scale: number; ink: string; accent: string },
) {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.font = `700 ${size.font}px "Clash Grotesk", Inter, sans-serif`;
  ctx.textBaseline = 'middle';
  const sunday = ctx.measureText('Sunday').width;
  const space = ctx.measureText(' ').width + size.font * 0.12; // .brand's word-spacing
  const pool = ctx.measureText('Pool').width;
  const x = (width - (size.logo + size.gap + sunday + space + pool)) / 2;
  const y = size.top + size.logo / 2;

  // Shadows ignore the canvas transform, so they are scaled by hand (matches .brand__logo's drop-shadow)
  ctx.shadowColor = 'rgba(43, 31, 28, 0.25)';
  ctx.shadowBlur = 4 * scale;
  ctx.shadowOffsetY = 2 * scale;
  ctx.drawImage(logo, x, size.top, size.logo, size.logo);
  ctx.shadowColor = 'transparent';

  const textX = x + size.logo + size.gap;
  ctx.fillStyle = ink;
  ctx.fillText('Sunday', textX, y);
  ctx.fillStyle = accent;
  ctx.fillText('Pool', textX + sunday + space, y);
  ctx.restore();
}

function download(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Saves the match day (page + footer, without the menus) as a PNG at the layout it is viewed in.
 * Touch devices get the share sheet (Save Image → Photos, or a chat app); everything else downloads.
 */
export function DownloadResults({ date, label }: { date: string; label: string }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pendingFile = useRef<File | null>(null);
  const [status, setStatus] = useState<Status>('idle');

  async function share(file: File, retried: boolean) {
    try {
      await navigator.share({ files: [file], title: `Sunday Pool · ${label}` });
      setStatus('idle');
    } catch (error) {
      const name = error instanceof DOMException ? error.name : '';
      if (name === 'AbortError') {
        setStatus('idle'); // share sheet closed
      } else if (name === 'NotAllowedError' && !retried) {
        // The tap's user activation ran out while the image was made (iOS allows very little): ask for another tap
        pendingFile.current = file;
        setStatus('ready');
      } else {
        download(file);
        setStatus('idle');
      }
    }
  }

  async function handleClick() {
    if (pendingFile.current) {
      const file = pendingFile.current;
      pendingFile.current = null;
      return share(file, true);
    }
    const root = buttonRef.current?.closest<HTMLElement>('[data-capture-root]');
    if (!root) return;

    setStatus('busy');
    try {
      const blob = await captureImage(root);
      const file = new File([blob], `sunday-pool-${date}.png`, { type: 'image/png' });
      if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
        await share(file, false);
      } else {
        download(file);
        setStatus('idle');
      }
    } catch (error) {
      console.error('Could not create the results image', error);
      setStatus('error');
    }
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`hero__download is-${status}`}
      data-capture-exclude
      aria-label={LABELS[status]}
      aria-busy={status === 'busy'}
      title={LABELS[status]}
      disabled={status === 'busy'}
      onClick={handleClick}
      onPointerEnter={loadCapture}
      onFocus={loadCapture}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {status === 'busy' ? (
          <circle cx="12" cy="12" r="8" strokeDasharray="34 17" />
        ) : status === 'ready' ? (
          <path d="M12 15V3M8 7l4-4 4 4M8 10H6v11h12V10h-2" />
        ) : (
          <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
        )}
      </svg>
    </button>
  );
}
