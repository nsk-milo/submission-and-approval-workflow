'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Banknote, CalendarDays, Gavel, History, Tag, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useReviewerApplication } from '@/hooks/use-reviewer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/status-badge';
import { AuditTimeline } from '@/components/audit-timeline';
import { DetailSkeleton } from '@/components/skeletons';
import { ReviewActions } from '@/features/reviewer/review-actions';
import { categoryLabel, isReviewable } from '@/lib/workflow';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export default function ReviewerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, isError } = useReviewerApplication(id);

  if (isLoading) return <DetailSkeleton />;
  if (isError || !data) return <p className="text-sm text-rose-600">Application not found.</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/reviewer"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to queue
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{data.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <StatusBadge status={data.status} />
          <span className="hidden sm:inline">·</span>
          <span className="inline-flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            {data.createdBy?.name ?? data.createdBy?.email}
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Detail icon={Tag} label="Category" value={categoryLabel(data.category)} />
            <Detail icon={Banknote} label="Amount" value={formatCurrency(data.amount)} />
            <Detail icon={CalendarDays} label="Submitted" value={formatDateTime(data.createdAt)} />
            <div>
              <p className="text-muted-foreground">Description</p>
              <p className="mt-1 whitespace-pre-wrap">{data.description || '—'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" /> Audit history
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AuditTimeline entries={data.auditTrail} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gavel className="h-4 w-4" /> Decision
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isReviewable(data.status) ? (
            <ReviewActions id={id} />
          ) : (
            <p className="text-sm text-muted-foreground">
              This application has already been resolved ({data.status.toLowerCase().replace(/_/g, ' ')}).
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
