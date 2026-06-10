import { useEffect, useState } from "react";
import type React from "react";
import { cn } from "./utils";

const IMAGE_CACHE_NAME = "nook-image-cache-v1";
const objectUrlBySource = new Map<string, string>();
const pendingSourceLoads = new Map<string, Promise<string>>();

async function loadCachedImage(source: string) {
  if (!source || source.startsWith("data:") || source.startsWith("blob:")) {
    return source;
  }

  if (objectUrlBySource.has(source)) {
    return objectUrlBySource.get(source)!;
  }

  if (pendingSourceLoads.has(source)) {
    return pendingSourceLoads.get(source)!;
  }

  const loadPromise = (async () => {
    if (!("caches" in window)) {
      return source;
    }

    try {
      const cache = await caches.open(IMAGE_CACHE_NAME);
      const cachedResponse = await cache.match(source);
      const response = cachedResponse ?? await fetch(source, { mode: "cors" });

      if (!cachedResponse && response.ok) {
        await cache.put(source, response.clone());
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      objectUrlBySource.set(source, objectUrl);
      return objectUrl;
    } catch {
      return source;
    } finally {
      pendingSourceLoads.delete(source);
    }
  })();

  pendingSourceLoads.set(source, loadPromise);
  return loadPromise;
}

export function useCachedImageSrc(source?: string | null) {
  const [cachedSource, setCachedSource] = useState(source ?? "");

  useEffect(() => {
    let isMounted = true;

    if (!source) {
      setCachedSource("");
      return () => {
        isMounted = false;
      };
    }

    setCachedSource(objectUrlBySource.get(source) ?? source);

    loadCachedImage(source).then((nextSource) => {
      if (isMounted) setCachedSource(nextSource);
    });

    return () => {
      isMounted = false;
    };
  }, [source]);

  return cachedSource;
}

export function CachedImage({
  src,
  className,
  onLoad,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  const cachedSource = useCachedImageSrc(src);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
  }, [cachedSource]);

  return (
    <img
      {...props}
      src={cachedSource}
      className={cn("transition-opacity duration-200", isLoaded ? "opacity-100" : "opacity-0", className)}
      onLoad={(event) => {
        setIsLoaded(true);
        onLoad?.(event);
      }}
    />
  );
}
