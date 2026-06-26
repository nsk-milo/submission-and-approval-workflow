'use client';

import { useState } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { useReviewAction } from '@/hooks/use-reviewer';
import { getApiErrorMessage } from '@/lib/api';

type ActionType = 'approve' | 'reject' | 'return';

const MODAL_COPY: Record<Exclude<ActionType, 'approve'>, { title: string; description: string }> = {
  reject: {
    title: 'Reject application',
    description: 'Provide a reason for rejecting this procurement request. A comment is required.',
  },
  return: {
    title: 'Return for changes',
    description: 'Explain what the applicant needs to change. A comment is required.',
  },
};

export function ReviewActions({ id }: { id: string }) {
  const review = useReviewAction(id);
  const [modal, setModal] = useState<Exclude<ActionType, 'approve'> | null>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const run = (action: ActionType, value?: string) => {
    setError(null);
    review.mutate(
      { action, comment: value },
      {
        onSuccess: () => {
          setModal(null);
          setComment('');
        },
        onError: (e) => setError(getApiErrorMessage(e)),
      },
    );
  };

  const submitModal = () => {
    if (!comment.trim()) {
      setError('A comment is required.');
      return;
    }
    if (modal) run(modal, comment);
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
        <Button variant="success" disabled={review.isPending} onClick={() => run('approve')}>
          {review.isPending && review.variables?.action === 'approve' ? (
            <Spinner />
          ) : (
            <Check className="h-4 w-4" />
          )}{' '}
          Approve
        </Button>
        <Button variant="outline" disabled={review.isPending} onClick={() => setModal('return')}>
          <RotateCcw className="h-4 w-4" /> Return for changes
        </Button>
        <Button variant="destructive" disabled={review.isPending} onClick={() => setModal('reject')}>
          <X className="h-4 w-4" /> Reject
        </Button>
      </div>

      {error && !modal && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      <Dialog
        open={modal !== null}
        onClose={() => {
          setModal(null);
          setComment('');
          setError(null);
        }}
        title={modal ? MODAL_COPY[modal].title : ''}
        description={modal ? MODAL_COPY[modal].description : ''}
      >
        <Textarea
          rows={4}
          autoFocus
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add your comment…"
        />
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        <div className="mt-4 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setModal(null);
              setComment('');
              setError(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant={modal === 'reject' ? 'destructive' : 'default'}
            disabled={review.isPending}
            onClick={submitModal}
          >
            {review.isPending && <Spinner />} Confirm
          </Button>
        </div>
      </Dialog>
    </>
  );
}
