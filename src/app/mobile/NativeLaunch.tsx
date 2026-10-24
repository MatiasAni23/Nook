import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { useCurrentUser } from '../context/CurrentUserContext';
import { router } from '../routes';
import { destinationAfterLogin } from '../features/auth/authNavigation';
import { NativeSplashArtwork } from './NativeSplashArtwork';

export function NativeLaunch() {
  const native = Capacitor.isNativePlatform();
  const { currentUser, isLoadingCurrentUser } = useCurrentUser();
  const [path, setPath] = useState(router.state.location.pathname);
  const [visible, setVisible] = useState(native);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (!native) return;
    return router.subscribe(state => setPath(state.location.pathname));
  }, [native]);
  useEffect(() => {
    if (!native) return;
    const frame = requestAnimationFrame(() => { void SplashScreen.hide({ fadeOutDuration: 160 }).catch(() => undefined); });
    // A network problem must not trap the user behind the launch artwork.
    const safety = setTimeout(() => setLeaving(true), 4000);
    return () => { cancelAnimationFrame(frame); clearTimeout(safety); };
  }, [native]);
  useEffect(() => {
    if (!native || !visible || isLoadingCurrentUser) return;
    if (currentUser && path === '/') { void router.navigate(destinationAfterLogin(currentUser.role), { replace: true }); return; }
    let frame = 0;
    const ready = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!document.querySelector('[data-page-loading]')) setLeaving(true);
      });
    };
    const observer = new MutationObserver(ready);
    const app = document.getElementById('root'); if (app) observer.observe(app, { childList: true, subtree: true });
    ready();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [native, visible, currentUser, isLoadingCurrentUser, path]);
  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => setVisible(false), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180);
    return () => clearTimeout(timer);
  }, [leaving]);
  return visible ? <NativeSplashArtwork leaving={leaving} /> : null;
}
