import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";

export function DelegatePage({ title, description, eyebrow, actions, children }: {
  title: string; description: string; eyebrow: string; actions?: ReactNode; children: ReactNode;
}) {
  return <div className="min-h-full bg-[#F6F7FB] px-4 py-5 pb-24 sm:px-6 sm:py-7"><div className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><p className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#8D86AA]">{eyebrow}</p><h1 className="text-2xl font-bold tracking-tight text-[#26213C] sm:text-3xl">{title}</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-[#78728D]">{description}</p></div>{actions && <div className="flex flex-wrap gap-2">{actions}</div>}</header>
    {children}
  </div></div>;
}
export function DelegateRefresh({ updating, onClick }: { updating: boolean; onClick: () => void }) {
  return <Button variant="outline" className="border-[#E2DEED] bg-white" disabled={updating} onClick={onClick}><RefreshCw className={`mr-2 size-4 ${updating ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" />{updating ? "Actualizando…" : "Actualizar"}</Button>;
}
export function DelegateNotice({ children, success = false }: { children: ReactNode; success?: boolean }) {
  return <p role={success ? "status" : "alert"} className={`rounded-xl border p-3 text-sm ${success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>{children}</p>;
}
export function DelegateSkeleton({ cards = 3 }: { cards?: number }) {
  return <div role="status" aria-label="Cargando datos" className="space-y-5"><span className="sr-only">Cargando datos…</span>
    <div className="grid grid-cols-3 gap-3">{[0,1,2].map((i) => <div key={i} className="rounded-2xl border border-[#E6E8F2] bg-white p-4"><Skeleton className="mb-3 h-3 w-2/3 motion-reduce:animate-none" /><Skeleton className="h-7 w-12 motion-reduce:animate-none" /></div>)}</div>
    <div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: cards }, (_, i) => <div key={i} className="overflow-hidden rounded-2xl border border-[#E6E8F2] bg-white"><Skeleton className="h-36 rounded-none motion-reduce:animate-none" /><div className="space-y-3 p-5"><Skeleton className="h-5 w-2/3 motion-reduce:animate-none" /><Skeleton className="h-3 w-5/6 motion-reduce:animate-none" /><Skeleton className="h-3 w-1/2 motion-reduce:animate-none" /><div className="flex gap-2 pt-3"><Skeleton className="h-9 w-1/2 motion-reduce:animate-none" /><Skeleton className="h-9 w-1/2 motion-reduce:animate-none" /></div></div></div>)}</div>
  </div>;
}

export function DelegateReservationSkeleton() {
  return <div role="status" aria-label="Cargando reservas" className="space-y-3"><span className="sr-only">Cargando reservas…</span>{[0,1].map((i) => <div key={i} className="overflow-hidden rounded-2xl border border-[#E6E8F2] bg-white">
    <div className="flex items-center gap-3 border-b border-[#EFEDF6] p-4"><Skeleton className="size-10 shrink-0 rounded-full motion-reduce:animate-none" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/3 motion-reduce:animate-none" /><Skeleton className="h-3 w-1/2 motion-reduce:animate-none" /></div><Skeleton className="h-6 w-20 rounded-full motion-reduce:animate-none" /></div>
    <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3">{[0,1,2].map((j) => <div key={j} className="space-y-2"><Skeleton className="h-3 w-1/2 motion-reduce:animate-none" /><Skeleton className="h-4 w-full motion-reduce:animate-none" /></div>)}</div>
    <div className="flex justify-end gap-2 border-t border-[#EFEDF6] p-4"><Skeleton className="h-8 w-20 motion-reduce:animate-none" /><Skeleton className="h-8 w-20 motion-reduce:animate-none" /></div>
  </div>)}</div>;
}
