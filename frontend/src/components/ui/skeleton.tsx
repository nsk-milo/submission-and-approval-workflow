import { cn } from '@/lib/utils';

/** Shimmering placeholder block used while content is loading. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
}
