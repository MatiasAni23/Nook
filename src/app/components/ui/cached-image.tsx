import type React from 'react';

// Native image loading avoids a second fetch/Blob for every photo and respects
// lazy loading, HTTP caching and the device's own decoder/memory management.
export async function clearCachedImages() {
  if (typeof window !== 'undefined' && 'caches' in window) await caches.delete('pinwi-image-cache-v1');
}
export async function preloadCachedImage(source: string) {
  if (!source) return;
  const image = new Image(); image.src = source;
  await image.decode().catch(() => undefined);
}
export async function preloadCachedImages(sources: string[]) {
  const queue = [...new Set(sources.filter(Boolean))];
  await Promise.all(Array.from({ length: Math.min(4, queue.length) }, async () => {
    while (queue.length) await preloadCachedImage(queue.shift()!);
  }));
}
export function useCachedImageSrc(source?: string | null) { return source ?? ''; }
export function CachedImage({ loading = 'lazy', decoding = 'async', ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
  return <img loading={loading} decoding={decoding} {...props} />;
}
