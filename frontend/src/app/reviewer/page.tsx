'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banknote, CalendarDays, FileText, Search, Tag, User } from 'lucide-react';
import { useReviewerQueue } from '@/hooks/use-reviewer';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/status-badge';
import { ApplicationCard } from '@/components/application-card';
import { EmptyState } from '@/components/empty-state';
import { ApplicationsSkeleton } from '@/components/skeletons';
import { STATUS_FILTERS, categoryLabel } from '@/lib/workflow';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { ApplicationStatus } from '@/types';

export default function ReviewerDashboard() {
  const router = useRouter();
  const [status, setStatus] = useState<ApplicationStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const { data, isLoading, isError } = useReviewerQueue({
    status: status === 'ALL' ? undefined : status,
    search: search.trim() || undefined,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Review queue</h1>
        <p className="text-sm text-muted-foreground">
          Procurement requests submitted for review.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatus(f.value)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1 text-sm transition-colors',
                status === f.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background hover:bg-muted',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <ApplicationsSkeleton />
        ) : isError ? (
          <div className="p-6 text-sm text-rose-600">Failed to load the queue.</div>
        ) : !data || data.length === 0 ? (
          <div className="p-6">
            <EmptyState title="Nothing to review" hint="No applications match your filters." />
          </div>
        ) : (
          <>
            {/* Mobile: stacked cards */}
            <div className="divide-y divide-border md:hidden">
              {data.map((app) => (
                <ApplicationCard
                  key={app.id}
                  app={app}
                  href={`/reviewer/applications/${app.id}`}
                  showApplicant
                />
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <span className="inline-flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" /> Title
                      </span>
                    </TableHead>
                    <TableHead>
                      <span className="inline-flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" /> Applicant
                      </span>
                    </TableHead>
                    <TableHead>
                      <span className="inline-flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5" /> Category
                      </span>
                    </TableHead>
                    <TableHead>
                      <span className="inline-flex items-center gap-1.5">
                        <Banknote className="h-3.5 w-3.5" /> Amount
                      </span>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" /> Submitted
                      </span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((app) => (
                    <TableRow
                      key={app.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/reviewer/applications/${app.id}`)}
                    >
                      <TableCell className="font-medium">{app.title}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {app.createdBy?.name ?? app.createdBy?.email ?? '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {categoryLabel(app.category)}
                      </TableCell>
                      <TableCell>{formatCurrency(app.amount)}</TableCell>
                      <TableCell>
                        <StatusBadge status={app.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(app.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
