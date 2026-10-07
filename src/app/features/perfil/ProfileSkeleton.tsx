import { Skeleton } from "../../components/ui/skeleton";

export function ProfileSkeleton() {
  return (
    <div
      className="size-full overflow-y-auto bg-[#F8F9FC]"
      role="status"
      aria-label="Cargando perfil"
    >
      <div className="mx-auto max-w-5xl space-y-6 px-4 pb-32 pt-8 sm:px-8 sm:pt-10">
        <Skeleton className="h-10 w-40 rounded-xl" />
        <div className="overflow-hidden rounded-3xl border border-[#E9EAF2] bg-white">
          <Skeleton className="h-24 w-full rounded-none" />
          <div className="space-y-5 px-6 pb-8">
            <Skeleton className="-mt-10 size-24 rounded-full border-4 border-white" />
            <Skeleton className="h-7 w-48 max-w-full" />
            <Skeleton className="h-4 w-80 max-w-full" />
            <div className="grid gap-4 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <Skeleton className="h-72 w-full rounded-3xl" />
          <Skeleton className="h-52 w-full rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
