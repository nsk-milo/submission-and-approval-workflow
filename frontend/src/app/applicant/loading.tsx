import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ApplicationsSkeleton } from '@/components/skeletons';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-full sm:w-44" />
      </div>
      <Card className="overflow-hidden">
        <ApplicationsSkeleton />
      </Card>
    </div>
  );
}
