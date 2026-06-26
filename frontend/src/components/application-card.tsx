'use client';

import { useRouter } from 'next/navigation';
import { Banknote, CalendarDays, ChevronRight, Tag, User } from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import { categoryLabel } from '@/lib/workflow';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Application } from '@/types';

/**
 * Mobile-friendly card representation of an application row. Used on small
 * screens where the wide table would otherwise overflow.
 */
export function ApplicationCard({
  app,
  href,
  showApplicant = false,
}: {
  app: Application;
  href: string;
  showApplicant?: boolean;
}) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(href)}
      className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-muted/50"
    >
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-medium">{app.title}</p>
          <StatusBadge status={app.status} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {showApplicant && app.createdBy && (
            <span className="inline-flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {app.createdBy.name ?? app.createdBy.email}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Tag className="h-3.5 w-3.5" />
            {categoryLabel(app.category)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Banknote className="h-3.5 w-3.5" />
            {formatCurrency(app.amount)}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDate(app.createdAt)}
          </span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
