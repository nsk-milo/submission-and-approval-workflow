'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  Clock,
  History,
  Pencil,
  RotateCcw,
  Send,
  Tag,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  useMyApplication,
  useSubmitApplication,
  useReviseApplication,
} from '@/hooks/use-applications';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { StatusBadge } from '@/components/status-badge';
import { AuditTimeline } from '@/components/audit-timeline';
import { DetailSkeleton } from '@/components/skeletons';
import { categoryLabel, isEditable, isRevisable } from '@/lib/workflow';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api';

export default function ApplicantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, isError } = useMyApplication(id);
  const submit = useSubmitApplication();
  const revise = useReviseApplication();
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <DetailSkeleton />;
  if (isError || !data) return <p className="text-sm text-rose-600">Application not found.</p>;

  const act = (fn: () => Promise<unknown>) => {
    setError(null);
    fn().catch((e) => setError(getApiErrorMessage(e)));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/applicant"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to applications
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{data.title}</h1>
          <StatusBadge status={data.status} />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          {isEditable(data.status) && (
            <>
              <Link
                href={`/applicant/applications/${id}/edit`}
                className={buttonVariants({ variant: 'outline' })}
              >
                <Pencil className="h-4 w-4" /> Edit
              </Link>
              <Button disabled={submit.isPending} onClick={() => act(() => submit.mutateAsync(id))}>
                {submit.isPending ? <Spinner /> : <Send className="h-4 w-4" />} Submit for review
              </Button>
            </>
          )}
          {isRevisable(data.status) && (
            <Button disabled={revise.isPending} onClick={() => act(() => revise.mutateAsync(id))}>
              {revise.isPending ? <Spinner /> : <RotateCcw className="h-4 w-4" />} Reopen &amp; edit
            </Button>
          )}
        </div>
      </div>

      {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Detail icon={Tag} label="Category" value={categoryLabel(data.category)} />
            <Detail icon={Banknote} label="Amount" value={formatCurrency(data.amount)} />
            <Detail icon={CalendarDays} label="Created" value={formatDateTime(data.createdAt)} />
            <Detail icon={Clock} label="Last updated" value={formatDateTime(data.updatedAt)} />
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
