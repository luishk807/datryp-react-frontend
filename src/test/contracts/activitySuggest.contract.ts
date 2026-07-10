import { z } from 'zod';

/**
 * Zod CONTRACT for `POST /activities/suggest-fields` — the LLM field-guessing
 * proxy for the Add-Activity smart-entry flow. The backend replies with an
 * envelope `{ result: {...} | null }`; every field on `result` is optional +
 * nullable because the model fills only what it's confident about and
 * `toSuggestion` defaults the rest to null. `.strict()` catches a field the
 * reshaper hasn't been taught yet.
 */
export const ActivitySuggestionWireContract = z
    .object({
        name: z.string().nullable().optional(),
        location: z.string().nullable().optional(),
        city: z.string().nullable().optional(),
        country: z.string().nullable().optional(),
        start_time: z.string().nullable().optional(),
        end_time: z.string().nullable().optional(),
        check_in_time: z.string().nullable().optional(),
        check_out_time: z.string().nullable().optional(),
        depart_time: z.string().nullable().optional(),
        arrival_time: z.string().nullable().optional(),
        cost: z.string().nullable().optional(),
        currency: z.string().nullable().optional(),
    })
    .strict();

export const SuggestFieldsResponseWireContract = z
    .object({
        result: ActivitySuggestionWireContract.nullable(),
    })
    .strict();
