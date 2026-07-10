import { z } from 'zod';

/**
 * Zod CONTRACT for `GET /flights/lookup` (AeroDataBox proxy). The client is
 * fail-soft: the envelope is `{ result: {...} | null }` where a null result
 * means no-match / key-not-configured and the caller keeps the user's typed
 * value.
 *
 * `.strict()` on both the envelope and the inner result catches backend drift.
 */
export const FlightLookupResultWireContract = z
    .object({
        flight_number: z.string().nullable(),
        depart_airport: z.string().nullable(),
        arrival_airport: z.string().nullable(),
        depart_date: z.string().nullable(),
        depart_time: z.string().nullable(),
        arrival_date: z.string().nullable(),
        arrival_time: z.string().nullable(),
        airline: z.string().nullable(),
    })
    .strict();

export const FlightLookupWireContract = z
    .object({
        result: FlightLookupResultWireContract.nullable(),
    })
    .strict();
