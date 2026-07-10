/** Wire fixtures for `GET /weather`. Raw response shape is private to the
 *  module (it exports only the camelCase `WeatherLive`), so the snake_case
 *  wire is pinned inline here. */
export const weatherResponseFixture = {
    temperature_c: 21.4,
    apparent_temperature_c: 20.1,
    high_c: 24,
    low_c: 15.5,
    wind_kph: 12.3,
    is_day: true,
    weather_code: 2,
    condition: 'Partly cloudy',
    flavor: 'cloudy',
    observed_at: '2026-07-10T14:00:00Z',
} as const;

/** All the nullable fields exercised as null, plus a different flavor. */
export const weatherNullsFixture = {
    temperature_c: 5,
    apparent_temperature_c: null,
    high_c: null,
    low_c: null,
    wind_kph: null,
    is_day: false,
    weather_code: 0,
    condition: 'Clear sky',
    flavor: 'cold',
    observed_at: null,
} as const;
