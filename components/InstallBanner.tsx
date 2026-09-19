'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

type InstallPromptEvent = Event & { prompt(): Promise<unknown> };

const DISMISSED_KEY = 'install-banner-dismissed';

// Chrome can fire beforeinstallprompt before React hydrates, so listen from module load.
let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function setDeferred(event: InstallPromptEvent | null) {
  deferred = event;
  listeners.forEach((listener) => listener());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // suppress Chrome's own mini-infobar; the banner replaces it
    setDeferred(event as InstallPromptEvent);
  });
  window.addEventListener('appinstalled', () => setDeferred(null));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Phone-only "Install Sunday Pool" bar: Chrome's install dialog on Android, Add to Home Screen steps on iOS. */
export function InstallBanner() {
  const installPrompt = useSyncExternalStore(subscribe, () => deferred, () => null);
  const [hidden, setHidden] = useState(true);
  const [ios, setIos] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    const standalone =
      matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && navigator.standalone === true);
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISSED_KEY) === '1';
    } catch {}
    setHidden(standalone || dismissed);
    // iOS browsers have no install API; installing is manual, via the Share sheet
    setIos(/iPhone|iPad|iPod/.test(navigator.userAgent));
  }, []);

  if (hidden || (!installPrompt && !ios)) return null;

  function install() {
    if (installPrompt) {
      setDeferred(null); // a prompt can only be shown once
      installPrompt.prompt();
    } else {
      setShowSteps(true);
    }
  }

  function dismiss() {
    setHidden(true);
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {}
  }

  return (
    <aside className="install-banner" aria-label="Install app">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="install-banner__logo" src="/logo.png" width={36} height={36} alt="" />
      <div className="install-banner__text">
        <p className="install-banner__title">Install Sunday Pool</p>
        <p className="install-banner__sub" aria-live="polite">
          {showSteps ? (
            <>
              Tap Share <ShareIcon /> then <strong>Add to Home Screen</strong>
            </>
          ) : (
            'Add to your home screen'
          )}
        </p>
      </div>
      {!showSteps && (
        <button type="button" className="install-banner__button" onClick={install}>
          Install
        </button>
      )}
      <button type="button" className="install-banner__close" aria-label="Dismiss" onClick={dismiss}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </aside>
  );
}

/** The iOS Share glyph: a box with an arrow leaving the top. */
function ShareIcon() {
  return (
    <svg className="install-banner__share" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 15V3M8 7l4-4 4 4M8 10H6v11h12V10h-2" />
    </svg>
  );
}
