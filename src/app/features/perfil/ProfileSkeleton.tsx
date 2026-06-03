import { Card, CardContent } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";

export function ProfileSkeleton() {
  return (
    <div className="size-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-auto pb-20">
        <div className="bg-white px-4 pb-6 pt-8">
          <div className="mb-6 flex items-center justify-between">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-10 w-24 rounded-full" />
          </div>

          <div className="mb-6 flex items-center gap-4">
            <Skeleton className="size-24 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>

          <Skeleton className="mb-4 h-14 w-full" />
          <div className="space-y-3">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-5 w-48" />
          </div>
        </div>

        <div className="px-4 py-4">
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={`profile-stat-skeleton-${index}`} className="border-0 bg-white shadow-sm">
                <CardContent className="space-y-2 pb-3 pt-4 text-center">
                  <Skeleton className="mx-auto h-7 w-10" />
                  <Skeleton className="mx-auto h-3 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-3 px-4 pb-4">
          <Skeleton className="h-6 w-36" />
          {Array.from({ length: 2 }).map((_, index) => (
            <Card key={`profile-list-skeleton-${index}`} className="overflow-hidden border-0 bg-white shadow-sm">
              <CardContent className="p-3">
                <div className="flex gap-3">
                  <Skeleton className="size-20 rounded-xl" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-4 w-24" />
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
