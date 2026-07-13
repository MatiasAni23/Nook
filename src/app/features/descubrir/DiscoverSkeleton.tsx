import { Card, CardContent } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";

export function DiscoverSkeleton() {
  return (
    <div className="size-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-auto pb-20">
        <div className="bg-white pb-4">
          <div className="rounded-b-[1.75rem] bg-[#5B4AEE] px-4 pb-16 pt-12 sm:px-6 md:px-8 lg:px-10">
            <div className="mb-7 flex items-center justify-between">
              <Skeleton className="h-9 w-28 bg-white/20" />
              <div className="flex items-center gap-2">
                <Skeleton className="size-9 rounded-xl bg-white/20" />
                <Skeleton className="size-10 rounded-full bg-white/20" />
              </div>
            </div>

            <div className="space-y-2">
              <Skeleton className="h-4 w-24 bg-white/20" />
              <Skeleton className="h-7 w-48 bg-white/20" />
              <Skeleton className="h-4 w-56 bg-white/20" />
            </div>
          </div>

          <div className="-mt-7 px-4 sm:px-6 md:px-8 lg:px-10">
            <div className="rounded-[1.15rem] bg-white p-2 shadow-[0_12px_28px_rgba(79,70,229,0.14)]">
              <Skeleton className="h-12 w-full rounded-[0.85rem]" />
            </div>
          </div>
        </div>

        <div className="px-4 py-4">
          <Skeleton className="h-44 w-full rounded-3xl" />
        </div>

        <div className="mb-3 flex items-center justify-between px-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-14" />
        </div>

        <div className="space-y-3 px-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={`discover-place-skeleton-${index}`} className="overflow-hidden bg-white">
              <CardContent className="p-3">
                <div className="flex gap-3">
                  <Skeleton className="size-24 shrink-0 rounded-xl" />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-4 w-14" />
                    </div>
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
