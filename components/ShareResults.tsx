'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';

type Status = 'busy' | 'ready' | 'error';
type Target = 'download' | 'facebook' | 'tiktok' | 'viber';

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
    const scale = Math.min(1, Math.sqrt(MAX_PIXELS / (width * (height + band))));

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
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Canvas export failed'))), 'image/jpeg', 0.9),
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
  // backdrop-filter blurs up to its backdrop root, and the copy is its own root: on phones any glass
  // surface smeared the page around it. In the image it sits on a flat background, so it does nothing.
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

/** Whether this device can hand an image to another app through the share sheet (phones, and most desktop browsers). */
function canShareImages() {
  return !!navigator.canShare?.({ files: [new File([], 'probe.jpg', { type: 'image/jpeg' })] });
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

async function toPng(image: Blob) {
  const bitmap = await createImageBitmap(image);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
  bitmap.close();
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG export failed'))), 'image/png'),
  );
}

/** Clipboards only take PNG. The item gets a promise so the write starts inside the tap (Safari insists). */
async function copyImage(image: Blob) {
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': toPng(image) })]);
    return true;
  } catch {
    return false;
  }
}

const TARGETS: { id: Target; name: string }[] = [
  { id: 'download', name: 'Download' },
  { id: 'facebook', name: 'Facebook' },
  { id: 'tiktok', name: 'TikTok' },
  { id: 'viber', name: 'Viber' },
];

/**
 * Shares the match day (page + footer, without the menus) as a JPEG, always in the desktop layout.
 * A website can't hand an image to one particular app, so wherever the browser can share files every app
 * opens the share sheet with the image and caption (the caption is copied too: Facebook drops pre-filled
 * text). Elsewhere each app gets its own link, with the image on the clipboard to paste in.
 */
export function ShareResults({ date, label }: { date: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>('busy');
  const [sheet, setSheet] = useState(false);
  const [note, setNote] = useState('');
  const file = useRef<File | null>(null);
  const capturing = useRef(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  const pageUrl = () => `${location.origin}/?date=${date}`;
  const caption = () => `The result have been made for ${label}\n\nWATCH OUT:\n${pageUrl()}`;

  // Made as soon as the menu opens, so the file is ready by the time an app is picked: the share sheet
  // needs the tap's user activation, which runs out while an image is being made (iOS allows very little)
  function prepare() {
    if (file.current || capturing.current) return;
    capturing.current = true;
    setStatus('busy');
    captureImage()
      .then((blob) => {
        file.current = new File([blob], `sunday-pool-${date}.jpg`, { type: 'image/jpeg' });
        setStatus('ready');
      })
      .catch((error) => {
        console.error('Could not create the results image', error);
        setStatus('error');
      })
      .finally(() => (capturing.current = false));
  }

  function toggle() {
    if (!open) {
      setSheet(canShareImages());
      prepare();
    }
    setOpen(!open);
  }

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!note) return;
    const timer = setTimeout(() => setNote(''), 4000);
    return () => clearTimeout(timer);
  }, [note]);

  function copyCaption() {
    copyText(caption()).then((copied) => copied && setNote('Caption copied — paste it into your post'));
  }

  /** Without a share sheet: the app's own link, with the image (or for TikTok, a file) to paste in. */
  function fallback(target: Exclude<Target, 'download'>, image: File) {
    if (target === 'tiktok') {
      copyCaption();
      download(image);
      window.open('https://www.tiktok.com/upload', '_blank', 'noopener');
      return;
    }
    // Started before the app opens: the clipboard refuses writes once the page loses focus
    copyImage(image).then((copied) => {
      if (!copied) return copyCaption();
      setNote(target === 'facebook' ? 'Image copied — paste it into your post' : 'Image copied — paste it into the chat');
    });
    // Opened straight from the tap, so popup blockers let it through. The link also brings the /api/og preview.
    if (target === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl())}`, '_blank', 'noopener');
    } else {
      location.href = `viber://forward?text=${encodeURIComponent(caption())}`;
    }
  }

  function pick(target: Target) {
    const image = file.current;
    setOpen(false);
    if (!image) return;
    if (target === 'download') return download(image);
    if (!sheet) return fallback(target, image);

    copyCaption();
    navigator.share({ files: [image], text: caption(), title: `Sunday Pool · ${label}` }).catch((error) => {
      if (!(error instanceof DOMException && error.name === 'AbortError')) fallback(target, image);
    });
  }

  return (
    <div className="hero__share" ref={wrapper} data-capture-exclude>
      <button
        type="button"
        ref={button}
        className="hero__share-button"
        aria-label="Share results"
        title="Share results"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="share-menu"
        onClick={toggle}
        onPointerEnter={loadCapture}
        onFocus={loadCapture}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
        </svg>
      </button>

      {open && (
        <div className="share-menu" id="share-menu">
          {TARGETS.map(({ id, name }) => {
            const waiting = status !== 'ready';
            return (
              <button
                key={id}
                type="button"
                className="share-menu__item"
                disabled={waiting}
                aria-busy={waiting && status === 'busy'}
                onClick={() => pick(id)}
              >
                {waiting && status === 'busy' ? <Spinner /> : <TargetIcon target={id} />}
                {name}
              </button>
            );
          })}
          {status === 'busy' && <p className="share-menu__status">Preparing image…</p>}
          {status === 'error' && (
            <button type="button" className="share-menu__item share-menu__item--retry" onClick={prepare}>
              Couldn’t create the image — retry
            </button>
          )}
        </div>
      )}

      <p className="hero__share-note" role="status">
        {note}
      </p>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="share-menu__icon share-menu__icon--spin" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="34 17" />
    </svg>
  );
}

function TargetIcon({ target }: { target: Target }) {
  const svg = (children: ReactNode) => (
    <svg className="share-menu__icon" viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  );
  switch (target) {
    case 'download':
      return svg(
        <path
          d="M12 4v11M7 10l5 5 5-5M5 20h14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />,
      );
    case 'facebook':
      return svg(
        <>
          <circle cx="12" cy="12" r="10" fill="#1877f2" />
          <path
            d="M13.4 22v-7.2h2.4l.4-2.8h-2.8v-1.8c0-.8.2-1.4 1.4-1.4h1.5V6.3c-.3 0-1.1-.1-2.1-.1-2.1 0-3.6 1.3-3.6 3.7V12H8.2v2.8h2.4V22"
            fill="#fff"
          />
        </>,
      );
    case 'tiktok':
      return svg(
        <path
          d="M16 3c.3 2.3 1.8 3.8 4 4v3c-1.5 0-2.9-.5-4-1.3V15a6 6 0 1 1-6-6v3.1A3 3 0 1 0 13 15V3z"
          fill="currentColor"
        />,
      );
    case 'viber':
      return svg(
        <>
          <path
            d="M12 2.5c5 0 9 3.2 9 8.3s-4 8.2-9 8.2c-.8 0-1.6-.1-2.3-.3L6 21v-3.4c-2-1.5-3-3.9-3-6.8C3 5.7 7 2.5 12 2.5z"
            fill="#7360f2"
          />
          <path
            d="M9.2 7.5c.3-.3.8-.3 1 .1l.8 1.3c.2.3.1.7-.1.9l-.5.4c.4 1 1.3 1.9 2.3 2.4l.4-.5c.2-.3.6-.3.9-.1l1.3.8c.4.2.4.7.1 1l-.6.6c-.5.5-1.3.6-2 .3a8 8 0 0 1-4-4c-.3-.7-.2-1.5.3-2z"
            fill="#fff"
          />
        </>,
      );
  }
}
