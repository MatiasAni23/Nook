import { Card, CardContent } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";

export function DiscoverSkeleton() {
  return (
    <div className="size-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-auto pb-20">
        <div className="bg-white px-4 pb-4 pt-8">
          <div className="mb-6 flex items-center justify-between">
            <Skeleton className="h-9 w-28" />
            <div className="flex items-center gap-3">
              <Skeleton className="size-6 rounded-full" />
              <Skeleton className="size-10 rounded-full" />
            </div>
          </div>

          <div className="mb-4 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-56" />
          </div>

          <Skeleton className="mb-4 h-12 w-full rounded-lg" />
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={`discover-tab-skeleton-${index}`} className="h-9 w-24 shrink-0 rounded-full" />
            ))}
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
