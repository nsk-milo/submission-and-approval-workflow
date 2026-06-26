'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import {
  useMyApplication,
  useUpdateApplication,
  useSubmitApplication,
} from '@/hooks/use-applications';
import { ApplicationForm } from '@/features/applications/application-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSpinner } from '@/components/ui/spinner';
import { isEditable } from '@/lib/workflow';
import { getApiErrorMessage } from '@/lib/api';
import type { ApplicationInput } from '@/types';

export default function EditApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading } = useMyApplication(id);
  const update = useUpdateApplication(id);
  const submit = useSubmitApplication();
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <PageSpinner />;
  if (!data) return <p className="text-sm text-rose-600">Application not found.</p>;

  // Only DRAFT applications are editable — guard the route.
  if (!isEditable(data.status)) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <p className="text-sm text-muted-foreground">
          This application is no longer a draft and can&apos;t be edited.
        </p>
        <Link href={`/applicant/applications/${id}`} className="text-sm underline">
          Back to application
        </Link>
      </div>
    );
  }

  const saveDraft = async (values: ApplicationInput) => {
    setError(null);
    try {
      await update.mutateAsync(values);
      router.push(`/applicant/applications/${id}`);
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  };

  const submitForReview = async (values: ApplicationInput) => {
    setError(null);
    try {
      await update.mutateAsync(values);
      await submit.mutateAsync(id);
      router.push(`/applicant/applications/${id}`);
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/applicant/applications/${id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to application
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Edit draft</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>
          )}
          <ApplicationForm
            defaultValues={data}
            onSaveDraft={saveDraft}
            onSubmitForReview={submitForReview}
            submitting={update.isPending || submit.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}
