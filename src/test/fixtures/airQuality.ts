/** Wire fixtures for `GET /air-quality`. Raw response shape is private to the
 *  module (it exports only the camelCase `AirQualityLive`), so the snake_case
 *  wire is pinned inline here. */
export const airQualityResponseFixture = {
    aqi: 42,
    category_key: 'good',
    pm2_5: 9.7,
    observed_at: '2026-07-10T14:00:00Z',
} as const;

/** A non-"good" band with a null pm2_5 — exercises the nullable field and a
 *  recognized-band mapping other than the default fallback. */
export const airQualityNullsFixture = {
    aqi: 160,
    category_key: 'unhealthy',
    pm2_5: null,
    observed_at: null,
} as const;
