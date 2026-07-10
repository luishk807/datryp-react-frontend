import type { MeResponse, TokenResponse } from 'api/authApi';

/** A complete, well-formed `/auth/me` payload (typed as the FE's MeResponse so
 *  the fixture can't silently drift from the interface). Reused by contract
 *  and hook/context tests. */
export const meFixture: MeResponse = {
    id: 'user-123',
    email: 'traveler@example.com',
    name: 'Test Traveler',
    role: 'user',
    subscription_plan: 'free',
    subscription_status: 'none',
    effective_trip_cap: 3,
    is_paid_member: false,
    trial_ends_at: null,
    current_period_end: null,
    subscription_cancel_at_period_end: false,
    phone: null,
    birth_year: 1990,
    country_of_birth_code: 'US',
    passport_country_code: 'US',
    gender_id: null,
    interests: ['food', 'hiking'],
    traveler_styles: ['budget'],
    dream_destinations: ['Japan'],
    onboarding_completed_at: '2026-01-01T00:00:00Z',
    profile_image_url: null,
    home_city: 'Panama City',
    home_country: 'Panama',
    home_country_code: 'PA',
    home_latitude: 8.98,
    home_longitude: -79.52,
    travel_companions: [],
    kids_age_buckets: [],
    notify_email: true,
    notify_sms: false,
    email_verified: true,
    detected_country_code: 'US',
    free_everything_active: false,
    free_everything_until: null,
};

export const tokenFixture: TokenResponse = {
    access_token: 'jwt-access-token',
    token_type: 'bearer',
    expires_in: 3600,
};
