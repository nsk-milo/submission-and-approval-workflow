import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ApplicationsSkeleton } from '@/components/skeletons';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-10 w-full sm:w-64" />
      </div>
      <Card className="overflow-hidden">
        <ApplicationsSkeleton />
      </Card>
    </div>
  );
}
