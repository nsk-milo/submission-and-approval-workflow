'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Banknote, CalendarDays, ChevronRight, FileText, Plus, Tag } from 'lucide-react';
import { useMyApplications } from '@/hooks/use-applications';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { categoryLabel } from '@/lib/workflow';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function ApplicantDashboard() {
  const router = useRouter();
  const { data, isLoading, isError } = useMyApplications();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">My applications</h1>
          <p className="text-sm text-muted-foreground">
            Procurement requests you have created. Select any row to view its details and history.
          </p>
        </div>
        <Link
          href="/applicant/applications/new"
          className={`${buttonVariants()} w-full sm:w-auto`}
        >
          <Plus className="h-4 w-4" /> Create application
        </Link>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <ApplicationsSkeleton />
        ) : isError ? (
          <div className="p-6 text-sm text-rose-600">Failed to load applications.</div>
        ) : !data || data.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No applications yet"
              hint="Create your first procurement request to get started."
            />
          </div>
        ) : (
          <>
            {/* Mobile: stacked cards */}
            <div className="divide-y divide-border md:hidden">
              {data.map((app) => (
                <ApplicationCard
                  key={app.id}
                  app={app}
                  href={`/applicant/applications/${app.id}`}
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
                        <CalendarDays className="h-3.5 w-3.5" /> Created
                      </span>
                    </TableHead>
                    <TableHead className="w-10">
                      <span className="sr-only">Open</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((app) => {
                    const go = () => router.push(`/applicant/applications/${app.id}`);
                    return (
                      <TableRow
                        key={app.id}
                        role="link"
                        tabIndex={0}
                        aria-label={`View ${app.title}`}
                        onClick={go}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            go();
                          }
                        }}
                        className="group cursor-pointer outline-none hover:bg-muted focus-visible:bg-muted"
                      >
                        <TableCell className="font-medium text-foreground group-hover:text-primary group-hover:underline group-hover:underline-offset-4">
                          {app.title}
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
                        <TableCell className="text-right">
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-foreground" />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
