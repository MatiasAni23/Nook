import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase } from '../lib/supabase';
import { getNativeLinkDestination } from './appUrls';

interface NativeNavigation {
  navigate: (destination: string | number) => void;
}

export function startNativeRuntime(navigation: NativeNavigation): () => void {
  if (!Capacitor.isNativePlatform()) return () => undefined;
  let disposed = false;
  const handles: PluginListenerHandle[] = [];
  const keep = (pending: Promise<PluginListenerHandle>) => {
    void pending.then(handle => {
      if (disposed) void handle.remove();
      else handles.push(handle);
    }).catch(() => undefined);
  };
  const openLink = (url: string) => {
    if (disposed) return;
    const destination = getNativeLinkDestination(url);
    if (destination) navigation.navigate(destination);
  };
  keep(NativeApp.addListener('appUrlOpen', ({ url }) => openLink(url)));
  void NativeApp.getLaunchUrl().then(result => { if (result?.url) openLink(result.url); }).catch(() => undefined);
  keep(NativeApp.addListener('appStateChange', ({ isActive }) => {
    if (disposed) return;
    if (isActive) {
      void supabase?.auth.startAutoRefresh().catch(() => undefined);
      supabase?.realtime.connect();
      // Existing private feeds refresh on focus, using their account-scoped services.
      window.dispatchEvent(new Event('focus'));
    } else {
      void supabase?.auth.stopAutoRefresh().catch(() => undefined);
      supabase?.realtime.disconnect();
    }
    window.dispatchEvent(new CustomEvent('pinwi:app-state', { detail: { isActive } }));
  }));
  if (Capacitor.getPlatform() === 'android') {
    keep(NativeApp.addListener('backButton', () => {
      if (disposed) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
      } else if (Number(window.history.state?.idx) > 0) {
        navigation.navigate(-1);
      } else {
        void NativeApp.minimizeApp();
      }
    }));
  }
  const externalClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0) return;
    const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute('download')) return;
    const url = new URL(anchor.href);
    if (!['https:', 'http:'].includes(url.protocol) || url.origin === window.location.origin) return;
    event.preventDefault();
    void Browser.open({ url: url.href }).catch(() => window.alert('No se pudo abrir el enlace. Intenta nuevamente.'));
  };
  document.addEventListener('click', externalClick);
  void supabase?.auth.startAutoRefresh().catch(() => undefined);
  return () => {
    disposed = true;
    document.removeEventListener('click', externalClick);
    for (const handle of handles) void handle.remove();
    void supabase?.auth.stopAutoRefresh().catch(() => undefined);
  };
}
