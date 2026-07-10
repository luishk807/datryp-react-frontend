import { z } from 'zod';

/**
 * Zod CONTRACT for `POST /budgets/suggest` (app/routers/budgets.py). The
 * estimator is fail-soft: a null `result` means the model couldn't estimate,
 * so the wire envelope is `{ result: {...} | null }`.
 *
 * `.strict()` on both the envelope and the inner result catches backend drift.
 */
export const BudgetSuggestWireContract = z
    .object({
        result: z
            .object({
                suggested_total: z.number().nullable(),
                currency: z.string(),
                daily: z.number().nullable(),
                note: z.string().nullable(),
            })
            .strict()
            .nullable(),
    })
    .strict();
