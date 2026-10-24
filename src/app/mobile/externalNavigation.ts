import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { getSafeWebsiteUrl } from '../lib/externalUrl';

export async function openExternalUrl(value: string): Promise<void> {
  const url = getSafeWebsiteUrl(value);
  if (!url) throw new Error('El enlace no es válido.');
  if (Capacitor.isNativePlatform()) await Browser.open({ url });
  else window.open(url, '_blank', 'noopener,noreferrer');
}
