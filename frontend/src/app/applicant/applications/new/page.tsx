'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ApplicationForm } from '@/features/applications/application-form';
import { useCreateApplication, useSubmitApplication } from '@/hooks/use-applications';
import { getApiErrorMessage } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ApplicationInput } from '@/types';

export default function NewApplicationPage() {
  const router = useRouter();
  const create = useCreateApplication();
  const submit = useSubmitApplication();
  const [error, setError] = useState<string | null>(null);

  const saveDraft = async (values: ApplicationInput) => {
    setError(null);
    try {
      const app = await create.mutateAsync(values);
      router.push(`/applicant/applications/${app.id}`);
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  };

  const submitForReview = async (values: ApplicationInput) => {
    setError(null);
    try {
      const app = await create.mutateAsync(values);
      await submit.mutateAsync(app.id);
      router.push(`/applicant/applications/${app.id}`);
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/applicant"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to applications
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>New procurement request</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>
          )}
          <ApplicationForm
            onSaveDraft={saveDraft}
            onSubmitForReview={submitForReview}
            submitting={create.isPending || submit.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}
