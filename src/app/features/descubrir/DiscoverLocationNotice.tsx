import { LocateFixed } from 'lucide-react';

interface Props {
  hasLocation: boolean;
  isLocating: boolean;
  error: string;
  onRequest: () => void;
}

export function DiscoverLocationNotice({ hasLocation, isLocating, error, onRequest }: Props) {
  if (hasLocation && !error && !isLocating) return null;
  return (
    <div className="my-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-slate-900">
      <p role="status" className="min-w-0 flex-1 basis-48 leading-relaxed">
        {isLocating ? 'Buscando tu ubicación para mostrarte lugares cercanos…' : error || 'Activa tu ubicación para encontrar espacios cerca de ti.'}
      </p>
      <button type="button" onClick={onRequest} disabled={isLocating}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-2 font-semibold text-white hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700 disabled:opacity-60">
        <LocateFixed className="size-4" aria-hidden="true" />
        {isLocating ? 'Buscando…' : error ? 'Reintentar ubicación' : 'Usar mi ubicación'}
      </button>
    </div>
  );
}
