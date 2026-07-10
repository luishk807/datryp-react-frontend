import { z } from 'zod';

/**
 * Zod CONTRACT for `GET /transit/lookup` (OpenAI-backed train/bus resolver).
 * Mirrors the flight-lookup envelope: `{ result: {...} | null }`, null on
 * no-match (silent-fail UX).
 *
 * `.strict()` on both the envelope and the inner result catches backend drift.
 */
export const TransitLookupResultWireContract = z
    .object({
        operator: z.string().nullable(),
        number: z.string().nullable(),
        depart_station: z.string().nullable(),
        arrival_station: z.string().nullable(),
        depart_time: z.string().nullable(),
        arrival_time: z.string().nullable(),
        depart_date: z.string().nullable(),
        arrival_date: z.string().nullable(),
        route_name: z.string().nullable(),
    })
    .strict();

export const TransitLookupWireContract = z
    .object({
        result: TransitLookupResultWireContract.nullable(),
    })
    .strict();
