import { z } from 'zod';

// Shared with the backend DTO (backend/src/applications/dto/create-application.dto.ts).
// Keep the two in sync so client and server enforce the same contract.
export const TITLE_MIN = 5;
export const TITLE_MAX = 120;
export const DESCRIPTION_MIN = 10;
export const DESCRIPTION_MAX = 2000;
export const AMOUNT_MAX = 10_000_000;

/** True when the value has at most two decimal places (money). */
const hasMaxTwoDecimals = (v: number) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-9;

export const applicationSchema = z.object({
  title: z
    .string()
    .trim()
    .min(TITLE_MIN, `Title must be at least ${TITLE_MIN} characters`)
    .max(TITLE_MAX, `Title must be at most ${TITLE_MAX} characters`)
    .regex(/\p{L}/u, 'Title must contain letters, not just numbers or symbols'),

  category: z.enum(['FINANCE', 'PROCUREMENT', 'TRAVEL', 'OPERATIONS'], {
    errorMap: () => ({ message: 'Please select a category' }),
  }),

  description: z
    .string()
    .trim()
    .min(DESCRIPTION_MIN, `Add at least ${DESCRIPTION_MIN} characters so reviewers have enough context`)
    .max(DESCRIPTION_MAX, `Description must be at most ${DESCRIPTION_MAX} characters`),

  amount: z.coerce
    .number({ invalid_type_error: 'Amount is required and must be a number' })
    .positive('Amount must be greater than 0')
    .max(AMOUNT_MAX, `Amount must not exceed ${AMOUNT_MAX.toLocaleString()}`)
    .refine(Number.isFinite, 'Amount must be a valid number')
    .refine(hasMaxTwoDecimals, 'Amount can have at most 2 decimal places'),
});

export type ApplicationFormValues = z.infer<typeof applicationSchema>;
