import { Badge } from '@/components/ui/badge';
import { STATUS_META } from '@/lib/workflow';
import { cn } from '@/lib/utils';
import type { ApplicationStatus } from '@/types';

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const meta = STATUS_META[status];
  return <Badge className={cn(meta.className)}>{meta.label}</Badge>;
}
