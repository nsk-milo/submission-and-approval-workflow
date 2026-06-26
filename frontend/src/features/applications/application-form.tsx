'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { CATEGORIES, categoryLabel } from '@/lib/workflow';
import {
  applicationSchema,
  DESCRIPTION_MAX,
  type ApplicationFormValues,
} from './application-schema';
import type { Application, ApplicationInput } from '@/types';

interface Props {
  defaultValues?: Partial<Application>;
  /** Save as / keep DRAFT. */
  onSaveDraft: (values: ApplicationInput) => Promise<void> | void;
  /** Save then submit for review. Optional (hidden when not provided). */
  onSubmitForReview?: (values: ApplicationInput) => Promise<void> | void;
  submitting?: boolean;
}

export function ApplicationForm({
  defaultValues,
  onSaveDraft,
  onSubmitForReview,
  submitting,
}: Props) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      title: defaultValues?.title ?? '',
      category: defaultValues?.category,
      description: defaultValues?.description ?? '',
      amount: defaultValues?.amount ? Number(defaultValues.amount) : undefined,
    },
  });

  const toInput = (values: ApplicationFormValues): ApplicationInput => ({
    title: values.title.trim(),
    category: values.category,
    description: values.description.trim(),
    amount: values.amount,
  });

  const descriptionLength = (watch('description') ?? '').length;

  return (
    <form className="space-y-5" onSubmit={handleSubmit((v) => onSaveDraft(toInput(v)))}>
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" placeholder="e.g. New laptops for design team" {...register('title')} />
        {errors.title && <p className="text-sm text-rose-600">{errors.title.message}</p>}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select id="category" defaultValue="" {...register('category')}>
            <option value="" disabled>
              Select a category
            </option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c)}
              </option>
            ))}
          </Select>
          {errors.category && <p className="text-sm text-rose-600">{errors.category.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount (USD)</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            {...register('amount')}
          />
          {errors.amount && <p className="text-sm text-rose-600">{errors.amount.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="description">Description</Label>
          <span
            className={
              descriptionLength > DESCRIPTION_MAX ? 'text-xs text-rose-600' : 'text-xs text-muted-foreground'
            }
          >
            {descriptionLength}/{DESCRIPTION_MAX}
          </span>
        </div>
        <Textarea
          id="description"
          rows={4}
          placeholder="What is being requested, why it's needed, and any relevant details"
          {...register('description')}
        />
        {errors.description && <p className="text-sm text-rose-600">{errors.description.message}</p>}
      </div>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap">
        <Button type="submit" variant="outline" disabled={submitting}>
          {submitting ? <Spinner /> : <Save className="h-4 w-4" />} Save draft
        </Button>
        {onSubmitForReview && (
          <Button
            type="button"
            disabled={submitting}
            onClick={handleSubmit((v) => onSubmitForReview(toInput(v)))}
          >
            {submitting ? <Spinner /> : <Send className="h-4 w-4" />} Submit for review
          </Button>
        )}
      </div>
    </form>
  );
}
