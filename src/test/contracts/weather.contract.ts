import { z } from 'zod';

/**
 * Zod CONTRACT for `GET /weather` (Open-Meteo proxy). Pins the raw wire shape
 * the frontend reshapes into `WeatherLive`. `flavor` is a closed enum that
 * mirrors the backend `WeatherFlavor` (the four buckets live current weather
 * ever resolves to).
 *
 * `.strict()` catches backend drift in CI.
 */
export const WeatherWireContract = z
    .object({
        temperature_c: z.number(),
        apparent_temperature_c: z.number().nullable(),
        high_c: z.number().nullable(),
        low_c: z.number().nullable(),
        wind_kph: z.number().nullable(),
        is_day: z.boolean(),
        weather_code: z.number(),
        condition: z.string(),
        flavor: z.enum(['sunny', 'cloudy', 'rainy', 'cold']),
        observed_at: z.string().nullable(),
    })
    .strict();
