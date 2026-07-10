/**
 * Wire-shape fixtures for the country-detail endpoints, pinned to match
 * `app/routers/country_details.py`.
 *
 *  - `fullCountryDetailsResponseFixture`    → every nested section + trailing
 *    optional populated (all truthy reshape branches run).
 *  - `minimalCountryDetailsResponseFixture` → required detail fields only;
 *    every trailing optional omitted so the null/empty defaults run.
 *  - `countryProse/Lists/FactsSliceFixture` → one progressive slice each.
 */

const countrySummary = {
    id: 'jp-uuid',
    name: 'Japan',
    code: 'JP',
    local: '日本',
    image: 'https://img/japan.jpg',
    photographer_name: 'Aya',
    photographer_url: 'https://unsplash/aya',
} as const;

const currency = { code: 'JPY', name: 'Japanese Yen', rate_per_usd: 150 } as const;
const safety = {
    score: 92,
    level: 'low',
    summary: 'Very safe, normal precautions.',
} as const;
const travelBasics = {
    preferred_transport: 'train',
    transport_system: 'Shinkansen + local rail',
    payment_method: 'mixed',
    payment_note: 'IC cards everywhere',
    language: 'Japanese',
    vibe: 'orderly',
    audience: 'all travelers',
    age_recommendation: 'all ages',
} as const;
const lodging = {
    recommended_type: 'business hotel',
    airbnb_availability: 'limited',
    airbnb_note: 'Regulated nationally',
    hotel_availability: 'common',
    hotel_note: 'Ryokan for the experience',
    price_range: '$$-$$$',
    booking_tip: 'Reserve early in cherry season',
} as const;
const visa = {
    destination_country_code: 'JP',
    visa_free_countries: ['US', 'CA'],
    visa_on_arrival_countries: [],
    summary: '90 days visa-free for many passports.',
} as const;
const localFlavor = {
    fun_level: 3,
    nightlife: 'Izakayas and karaoke',
    famous_liquor: 'Sake',
    unique_souvenir: 'Kit Kat flavors',
    must_do_before_leaving: [
        { name: 'Onsen soak', why: 'Peak relaxation' },
    ],
} as const;

const namedTips = [
    {
        name: 'Tokyo',
        why: 'Neon metropolis',
        image_url: 'https://img/tokyo.jpg',
        photographer_name: 'Ken',
        photographer_url: 'https://unsplash/ken',
    },
    { name: 'Kyoto', why: 'Old-capital temples' },
] as const;

const nearby = [
    {
        name: 'Seoul',
        country: 'South Korea',
        kind: 'city',
        why: 'Short flight away',
        lat: 37.56,
        lng: 126.97,
        image_url: 'https://img/seoul.jpg',
    },
    {
        name: 'Taipei',
        country: 'Taiwan',
        kind: 'city',
        why: 'Night markets',
        lat: 25.03,
        lng: 121.56,
        // image_url omitted → reshaper coerces to null
    },
] as const;

const airports = [
    {
        iata_code: 'NRT',
        name: 'Narita International',
        distance_km: 60,
        international: true,
    },
] as const;

export const fullCountryDetailsFixture = {
    long_description: 'Japan is an island nation of contrasts.',
    capital_city: 'Tokyo',
    capital_coordinates: { lat: 35.68, lng: 139.69 },
    budget_description: 'Wide range from hostels to luxury.',
    country_highlight: 'Trains, temples, and cuisine.',
    top_cities: namedTips,
    foods: namedTips,
    things_to_do: namedTips,
    photo_spots: namedTips,
    notes_to_know: namedTips,
    best_time_to_visit: 'Spring & autumn',
    worst_time_to_visit: 'Typhoon September',
    weather: 'Temperate with four seasons.',
    currency,
    safety,
    travel_basics: travelBasics,
    lodging,
    nearby_destinations: nearby,
    local_flavor: localFlavor,
    cost_level: 4,
    visa,
    airports,
    tourist_rating: 5,
    popularity: { score: 90, trend: 'rising', summary: 'Weak yen boom' },
    cultural_shock: 'Silence on trains, cash culture.',
    before_you_go: ['Get a JR Pass', 'Carry cash'],
    hidden_gems: [{ name: 'Naoshima', why: 'Art island' }],
} as const;

export const fullCountryDetailsResponseFixture = {
    country: countrySummary,
    cached: true,
    details: fullCountryDetailsFixture,
} as const;

export const minimalCountryDetailsFixture = {
    long_description: '',
    capital_city: '',
    budget_description: '',
    country_highlight: '',
    top_cities: [],
    foods: [],
    things_to_do: [],
    photo_spots: [],
    notes_to_know: [],
    best_time_to_visit: '',
    worst_time_to_visit: '',
    weather: '',
    currency,
    safety,
    travel_basics: travelBasics,
    lodging,
    nearby_destinations: [],
    local_flavor: localFlavor,
    cost_level: 2,
    visa,
} as const;

export const minimalCountryDetailsResponseFixture = {
    country: {
        id: 'xx-uuid',
        name: 'Nowhere',
        code: 'XX',
        local: null,
        image: null,
        photographer_name: null,
        photographer_url: null,
    },
    cached: false,
    details: minimalCountryDetailsFixture,
} as const;

export const countryProseSliceFixture = {
    country: countrySummary,
    cached: true,
    prose: {
        long_description: 'Japan is an island nation of contrasts.',
        capital_city: 'Tokyo',
        capital_coordinates: { lat: 35.68, lng: 139.69 },
        budget_description: 'Wide range.',
        country_highlight: 'Trains and temples.',
        weather: 'Four seasons.',
        best_time_to_visit: 'Spring & autumn',
        worst_time_to_visit: 'Typhoon September',
        cultural_shock: 'Cash culture.',
        before_you_go: ['Get a JR Pass'],
        hidden_gems: [{ name: 'Naoshima', why: null }],
    },
} as const;

export const countryListsSliceFixture = {
    cached: true,
    lists: {
        top_cities: namedTips,
        foods: namedTips,
        things_to_do: namedTips,
        photo_spots: namedTips,
        notes_to_know: namedTips,
        nearby_destinations: nearby,
        local_flavor: localFlavor,
    },
} as const;

export const countryFactsSliceFixture = {
    cached: true,
    facts: {
        currency,
        safety,
        travel_basics: travelBasics,
        lodging,
        cost_level: 4,
        visa,
        airports,
        tourist_rating: 5,
        popularity: { score: 90, trend: 'steady', summary: 'Perennial favorite' },
    },
} as const;
