import { z } from 'zod';

/**
 * Zod CONTRACT for `GET /airports/search` (app/routers/airports.py). Pins the
 * raw wire shape the frontend reshapes into `AirportOption`: an `items` array
 * of snake_case airport rows.
 *
 * `.strict()` on both the envelope and each row catches backend drift (a
 * renamed/removed/added field) in CI instead of surfacing as `undefined` in
 * the autocomplete.
 */
export const AirportOptionWireContract = z
    .object({
        iata_code: z.string(),
        name: z.string(),
        city: z.string(),
        country_code: z.string(),
        country: z.string(),
    })
    .strict();

export const AirportsSearchWireContract = z
    .object({
        items: z.array(AirportOptionWireContract),
    })
    .strict();
