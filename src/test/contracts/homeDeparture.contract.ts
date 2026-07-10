import { z } from 'zod';

/**
 * Zod CONTRACTS for the "home base → nearest departure" endpoints:
 *   GET /me/nearest-airport       → { airport: NearestAirportRaw | null }
 *   GET /airports/nearest         → { airport: NearestAirportRaw | null }
 *   GET /me/nearest-train-station → { station: NearestStationRaw | null }
 *
 * Both envelopes carry a nullable body (null = no home base / no data). The
 * airport body has a required `iata_code`; the station `code` is nullable
 * because that dataset hasn't shipped. `.strict()` on every level.
 */
export const NearestAirportWireContract = z
    .object({
        iata_code: z.string(),
        name: z.string(),
        city: z.string(),
        country: z.string(),
        country_code: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        distance_km: z.number(),
    })
    .strict();

export const NearestStationWireContract = z
    .object({
        code: z.string().nullable(),
        name: z.string(),
        city: z.string(),
        country: z.string(),
        country_code: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        distance_km: z.number(),
    })
    .strict();

export const NearestAirportEnvelopeContract = z
    .object({ airport: NearestAirportWireContract.nullable() })
    .strict();

export const NearestStationEnvelopeContract = z
    .object({ station: NearestStationWireContract.nullable() })
    .strict();
