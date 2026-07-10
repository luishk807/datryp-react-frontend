import { z } from 'zod';

/**
 * Zod CONTRACT for `GET /flights/departures` (AeroDataBox proxy). Pins the
 * snake_case wire shape the FE reshapes into `FlightDepartureOption`s. Every
 * field is nullable — upstream frequently omits pieces of a scheduled leg.
 *
 * `.strict()` catches backend drift (extra / missing / mistyped field) in CI.
 */
export const FlightDepartureContract = z
    .object({
        flight_number: z.string().nullable(),
        airline: z.string().nullable(),
        airline_iata: z.string().nullable(),
        depart_airport: z.string().nullable(),
        depart_date: z.string().nullable(),
        depart_time: z.string().nullable(),
        arrival_airport: z.string().nullable(),
        arrival_airport_name: z.string().nullable(),
        arrival_date: z.string().nullable(),
        arrival_time: z.string().nullable(),
        aircraft: z.string().nullable(),
    })
    .strict();

export const FlightDeparturesContract = z
    .object({
        items: z.array(FlightDepartureContract),
    })
    .strict();
