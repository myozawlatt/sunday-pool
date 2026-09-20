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
const BRAND = { top: 40, logo: 48, font: 28, gap: 12 };

// The image always shows the desktop layout, so phones and desktops download the same thing. A page
// lays itself out for its own window, so the capture renders one off-screen at this width.
const CAPTURE_WIDTH = 1100;

// Loaded on demand so the capture library stays out of the page bundle
const loadCapture = () => import('modern-screenshot');

/**
 * Loads the current page off-screen at desktop width, so the capture can read its markup and styles.
 * The scripts are stripped: nothing needs to run, and a second copy of the app would only hydrate over
 * the very nodes the capture is reading.
 */
async function openCaptureFrame() {
  const response = await fetch(location.href, { credentials: 'same-origin' });
  if (!response.ok) throw new Error(`Could not load the page to capture (${response.status})`);
  const html = (await response.text()).replace(/<script\b[\s\S]*?<\/script>/gi, '');

  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.setAttribute('tabindex', '-1');
  frame.style.cssText = `position:fixed;top:0;left:-20000px;border:0;width:${CAPTURE_WIDTH}px;height:800px`;
  const loaded = new Promise<void>((resolve, reject) => {
    frame.addEventListener('load', () => resolve(), { once: true });
    frame.addEventListener('error', () => reject(new Error('Could not load the page to capture')), { once: true });
  });
  // srcdoc keeps the frame on this origin, and relative URLs still resolve against this page
  frame.srcdoc = html;
  document.body.append(frame);
  await loaded;
  const doc = frame.contentDocument;
  const root = doc?.querySelector<HTMLElement>('[data-capture-root]');
  if (!doc || !root) {
    frame.remove();
    throw new Error('Could not find the page to capture');
  }
  // Fit the frame to the page: a scrollbar would take 15px off the layout width and narrow the image
  frame.style.height = `${doc.documentElement.scrollHeight}px`;
  await new Promise(requestAnimationFrame);
  return { frame, root };
}

async function captureImage() {
  const { domToCanvas } = await loadCapture();
  const logo = new Image();
  logo.src = '/logo.png';
  const { frame, root } = await openCaptureFrame();

  try {
    // Avatars are lazy-loaded, and nothing in an off-screen frame is ever in view
    const images = Array.from(root.querySelectorAll('img'));
    images.forEach((img) => (img.loading = 'eager'));
    await Promise.all([
      frame.contentDocument!.fonts.ready,
      document.fonts.load('700 1em "Clash Grotesk"'),
      logo.decode(),
      ...images.map((img) => img.decode().catch(() => {})),
    ]);

    const tokens = getComputedStyle(document.documentElement);
    const color = (name: string) => tokens.getPropertyValue(name).trim();
    const { width, height } = root.getBoundingClientRect();
    const band = BRAND.top + BRAND.logo;
    const scale = Math.min(2, Math.sqrt(MAX_PIXELS / (width * (height + band))));

    // The copy renders text a touch wider than the page, so shrink-wrapped labels (the champion's name,
    // "4 players") would wrap. Mark text that sits on one line here, and keep it on one line in the copy.
    Array.from(root.querySelectorAll('*'))
      .filter(isSingleLineText)
      .forEach((el) => el.setAttribute('data-capture-nowrap', ''));

    const page = await domToCanvas(root, {
      scale,
      backgroundColor: color('--bg'),
      // Nodes live in the frame's realm, where `instanceof Element` from this one is always false
      filter: (node) => node.nodeType !== Node.ELEMENT_NODE || !(node as Element).hasAttribute('data-capture-exclude'),
      onCloneEachNode: fixClone,
    });

    // The brand row exists only in the image (the page has it in the header), so it is drawn rather than captured
    const canvas = document.createElement('canvas');
    canvas.width = page.width;
    canvas.height = page.height + Math.round(band * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color('--bg');
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(page, 0, Math.round(band * scale));
    drawBrand(ctx, { logo, width, scale, ink: color('--ink'), accent: color('--accent') });

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Canvas export failed'))), 'image/png'),
    );
  } finally {
    frame.remove();
  }
}

/** An element with its own text, all of it on one line on the page. */
function isSingleLineText(el: Element) {
  if (!Array.from(el.childNodes).some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())) return false;
  const range = el.ownerDocument.createRange();
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
  // backdrop-filter blurs up to its backdrop root, and the copy is its own root: on phones the glass
  // cards smeared the page around them. In the image they sit on a flat background, so it does nothing.
  el.style.removeProperty('backdrop-filter');
  el.style.removeProperty('-webkit-backdrop-filter');
}

/** The header's brand (logo, "Sunday Pool" with "Pool" in the accent colour), centred in the top band. */
function drawBrand(
  ctx: CanvasRenderingContext2D,
  { logo, width, scale, ink, accent }: { logo: HTMLImageElement; width: number; scale: number; ink: string; accent: string },
) {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.font = `700 ${BRAND.font}px "Clash Grotesk", Inter, sans-serif`;
  ctx.textBaseline = 'middle';
  const sunday = ctx.measureText('Sunday').width;
  const space = ctx.measureText(' ').width + BRAND.font * 0.12; // .brand's word-spacing
  const pool = ctx.measureText('Pool').width;
  const x = (width - (BRAND.logo + BRAND.gap + sunday + space + pool)) / 2;
  const y = BRAND.top + BRAND.logo / 2;

  // Shadows ignore the canvas transform, so they are scaled by hand (matches .brand__logo's drop-shadow)
  ctx.shadowColor = 'rgba(43, 31, 28, 0.25)';
  ctx.shadowBlur = 4 * scale;
  ctx.shadowOffsetY = 2 * scale;
  ctx.drawImage(logo, x, BRAND.top, BRAND.logo, BRAND.logo);
  ctx.shadowColor = 'transparent';

  const textX = x + BRAND.logo + BRAND.gap;
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
 * Saves the match day (page + footer, without the menus) as a PNG, always in the desktop layout.
 * Touch devices get the share sheet (Save Image → Photos, or a chat app); everything else downloads.
 */
export function DownloadResults({ date, label }: { date: string; label: string }) {
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
    setStatus('busy');
    try {
      const blob = await captureImage();
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
