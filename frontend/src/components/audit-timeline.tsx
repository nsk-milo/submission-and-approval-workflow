import { Check } from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import { cn, formatDateTime } from '@/lib/utils';
import type { AuditLogEntry } from '@/types';

/**
 * Renders the immutable audit trail as a chronological vertical timeline.
 * Entries are expected oldest-first (as the API returns them).
 */
export function AuditTimeline({ entries }: { entries: AuditLogEntry[] }) {
  if (!entries?.length) {
    return <p className="text-sm text-muted-foreground">No history yet.</p>;
  }

  const currentIndex = entries.length - 1;

  return (
    <ol className="relative space-y-6 border-l border-border pl-6">
      {entries.map((entry, index) => {
        const isCurrent = index === currentIndex;
        const isApproved = entry.newStatus === 'APPROVED';
        return (
        <li key={entry.id} className="relative">
          <span className="absolute -left-[1.65rem] top-0.5 grid h-4 w-4 place-items-center">
            {/* The most recent entry is the current state — ping ring for emphasis. */}
            {isCurrent && (
              <span
                className={cn(
                  'absolute inset-0 animate-ping rounded-full opacity-75',
                  isApproved ? 'bg-emerald-500' : 'bg-primary',
                )}
              />
            )}
            {isApproved ? (
              // Approved steps get a green tick.
              <span className="relative grid h-4 w-4 place-items-center rounded-full bg-emerald-500 ring-2 ring-background">
                <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
              </span>
            ) : (
              <span
                className={cn(
                  'relative block h-3 w-3 rounded-full border-2 border-background',
                  isCurrent ? 'bg-primary' : 'bg-muted-foreground/40',
                )}
              />
            )}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {entry.oldStatus ? (
              <>
                <StatusBadge status={entry.oldStatus} />
                <span className="text-muted-foreground">→</span>
              </>
            ) : (
              <span className="text-xs font-medium text-muted-foreground">Created</span>
            )}
            <StatusBadge status={entry.newStatus} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDateTime(entry.createdAt)}
            {entry.performedBy?.name ? ` · ${entry.performedBy.name}` : ''}
            {entry.performedBy?.role ? ` (${entry.performedBy.role.toLowerCase()})` : ''}
          </p>
          {entry.comment && (
            <p className="mt-2 rounded-md bg-muted px-3 py-2 text-sm text-foreground">
              {entry.comment}
            </p>
          )}
        </li>
        );
      })}
    </ol>
  );
}
