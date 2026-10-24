import { lazy, Suspense, type ComponentType } from 'react';

export function deferPage(load: () => Promise<{ default: ComponentType }>) {
  const Page = lazy(load);
  return function DeferredPage() {
    return <Suspense fallback={<div data-page-loading className="grid size-full min-h-40 place-items-center" role="status" aria-label="Cargando pantalla"><span className="size-7 animate-spin rounded-full border-2 border-violet-100 border-t-violet-600 motion-reduce:animate-none" /></div>}><Page /></Suspense>;
  };
}
