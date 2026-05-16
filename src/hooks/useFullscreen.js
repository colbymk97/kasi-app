import { useCallback, useEffect, useState } from 'react';

function getStandalone() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
  if (typeof navigator !== 'undefined' && navigator.standalone === true) return true;
  return false;
}

function getIsIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iP(hone|ad|od)/.test(navigator.userAgent);
}

function getFullscreenElement() {
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    null
  );
}

function fullscreenApiSupported() {
  if (typeof document === 'undefined') return false;
  if (document.fullscreenEnabled) return true;
  if (document.webkitFullscreenEnabled) return true;
  return false;
}

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(
    () => typeof document !== 'undefined' && !!getFullscreenElement()
  );
  const [isStandalone, setIsStandalone] = useState(() => getStandalone());

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!getFullscreenElement());
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);

    const mql = window.matchMedia?.('(display-mode: standalone)');
    const onStandaloneChange = () => setIsStandalone(getStandalone());
    mql?.addEventListener?.('change', onStandaloneChange);

    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
      mql?.removeEventListener?.('change', onStandaloneChange);
    };
  }, []);

  const request = useCallback(async () => {
    const el = document.documentElement;
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen({ navigationUI: 'hide' });
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      }
    } catch {
      /* gesture rejected, unsupported, etc. — silent */
    }
  }, []);

  const exit = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    } catch {
      /* silent */
    }
  }, []);

  const toggle = useCallback(async () => {
    if (getFullscreenElement()) {
      await exit();
    } else {
      await request();
    }
  }, [request, exit]);

  return {
    isFullscreen,
    isStandalone,
    isSupported: fullscreenApiSupported(),
    isIOS: getIsIOS(),
    request,
    exit,
    toggle,
  };
}
