/** Wire-shape fixtures for `/me/preferences` and the catalog endpoints. The
 *  module's raw interfaces are private, so the snake_case shapes are pinned
 *  locally. */
export interface PreferencesWire {
    phone: string | null;
    birth_year: number | null;
    country_of_birth_code: string | null;
    passport_country_code: string | null;
    gender_id: string | null;
    interests: string[];
    traveler_styles: string[];
    dream_destinations: string[];
    onboarding_completed_at: string | null;
    home_city: string | null;
    home_country: string | null;
    home_country_code: string | null;
    home_latitude: number | null;
    home_longitude: number | null;
    travel_companions: string[];
    kids_age_buckets: string[];
    notify_email: boolean;
    notify_sms: boolean;
    share_visited_places: boolean;
}

export const preferencesWireFixture: PreferencesWire = {
    phone: '+15551234567',
    birth_year: 1990,
    country_of_birth_code: 'US',
    passport_country_code: 'US',
    gender_id: 'gender-uuid-1',
    interests: ['food', 'hiking'],
    traveler_styles: ['budget'],
    dream_destinations: ['Japan', 'Peru'],
    onboarding_completed_at: '2026-01-01T00:00:00Z',
    home_city: 'Panama City',
    home_country: 'Panama',
    home_country_code: 'PA',
    home_latitude: 8.98,
    home_longitude: -79.52,
    travel_companions: ['partner'],
    kids_age_buckets: ['5-8'],
    notify_email: true,
    notify_sms: false,
    share_visited_places: true,
};

export const interestsCatalogWireFixture = {
    interests: [
        { slug: 'food', label: 'Food' },
        { slug: 'hiking', label: 'Hiking' },
    ],
} as const;

export const travelerStylesCatalogWireFixture = {
    traveler_styles: [
        { slug: 'budget', label: 'Budget' },
        { slug: 'luxury', label: 'Luxury' },
    ],
} as const;

export const gendersCatalogWireFixture = {
    genders: [
        { id: 'gender-uuid-1', name: 'Woman' },
        { id: 'gender-uuid-2', name: 'Man' },
    ],
} as const;
