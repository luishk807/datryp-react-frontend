/**
 * Wire-shape fixtures for the city-detail endpoints. The module's raw response
 * interfaces are private, so the shapes are pinned here to match
 * `app/routers/city_details.py`.
 *
 *  - `fullCityDetailsResponseFixture`  → every nested section + trailing
 *    optional field populated, so the reshaper's "truthy" branches all run.
 *  - `minimalCityDetailsResponseFixture` → only the always-present detail
 *    fields; every trailing optional omitted so the null/empty defaults run.
 *  - `cityProse/Lists/FactsSliceFixture` → one progressive slice each.
 */

const citySummary = {
    name: 'Kyoto',
    country: 'Japan',
    country_code: 'JP',
    country_id: 'jp-uuid',
    image_url: 'https://img/kyoto.jpg',
    photographer_name: 'Aya',
    photographer_url: 'https://unsplash/aya',
} as const;

const currency = { code: 'JPY', name: 'Japanese Yen', rate_per_usd: 150 } as const;
const safety = {
    score: 92,
    level: 'low',
    summary: 'Very safe, normal precautions.',
} as const;
const coordinates = { lat: 35.01, lng: 135.77 } as const;
const travelBasics = {
    preferred_transport: 'train',
    transport_system: 'JR + subway',
    payment_method: 'mixed',
    payment_note: 'IC cards everywhere',
    language: 'Japanese',
    vibe: 'traditional',
    audience: 'all travelers',
    age_recommendation: 'all ages',
} as const;
const lodging = {
    recommended_type: 'ryokan',
    airbnb_availability: 'limited',
    airbnb_note: 'Regulated inside the city',
    hotel_availability: 'common',
    hotel_note: 'Book Gion early',
    price_range: '$$-$$$',
    booking_tip: 'Reserve 2 months ahead',
} as const;
const visa = {
    destination_country_code: 'JP',
    visa_free_countries: ['US', 'CA'],
    visa_on_arrival_countries: [],
    summary: '90 days visa-free for many passports.',
} as const;
const localFlavor = {
    fun_level: 3,
    nightlife: 'Low-key izakayas',
    famous_liquor: 'Sake',
    unique_souvenir: 'Yatsuhashi sweets',
    must_do_before_leaving: [
        { name: 'Tea ceremony', why: 'Quintessential Kyoto' },
    ],
} as const;

const namedTips = [
    {
        name: 'Fushimi Inari',
        why: 'Endless torii gates',
        image_url: 'https://img/inari.jpg',
        photographer_name: 'Ken',
        photographer_url: 'https://unsplash/ken',
    },
    { name: 'Kinkaku-ji', why: 'Golden pavilion' },
] as const;

const nearby = [
    {
        name: 'Osaka',
        country: 'Japan',
        kind: 'city',
        why: 'Street food capital',
        lat: 34.69,
        lng: 135.5,
        image_url: 'https://img/osaka.jpg',
    },
    {
        name: 'Nara',
        country: 'Japan',
        kind: 'city',
        why: 'Bowing deer',
        lat: 34.68,
        lng: 135.8,
        // image_url omitted → reshaper coerces to null
    },
] as const;

const airports = [
    {
        iata_code: 'KIX',
        name: 'Kansai International',
        distance_km: 100,
        international: true,
    },
] as const;

/** Fully-populated detail body — exercises every truthy reshape branch. */
export const fullCityDetailsFixture = {
    long_description: 'Kyoto is the cultural heart of Japan.',
    country_description: 'Japan blends tradition and technology.',
    budget_description: 'Mid-range friendly.',
    city_highlight: 'Temples and geisha districts.',
    country_highlight: 'Bullet trains and onsen.',
    top_places: namedTips,
    foods: namedTips,
    things_to_do: namedTips,
    photo_spots: namedTips,
    notes_to_know: namedTips,
    best_time_to_visit: 'April & November',
    worst_time_to_visit: 'Rainy June',
    weather: 'Four distinct seasons.',
    currency,
    safety,
    coordinates,
    travel_basics: travelBasics,
    lodging,
    nearby_destinations: nearby,
    local_flavor: localFlavor,
    cost_level: 4,
    visa,
    airports,
    tourist_rating: 5,
    popularity: { score: 88, trend: 'rising', summary: 'Post-pandemic surge' },
    walkability: { rating: 4, note: 'Very walkable downtown' },
    cultural_shock: 'Quiet trains, cash still common.',
    before_you_go: ['Get an IC card', 'Book temples'],
    hidden_gems: [{ name: 'Philosopher’s Path', why: 'Cherry-lined canal' }],
    neighborhoods: { best: ['Gion', 'Arashiyama'], avoid: [] },
    great_for: ['culture', 'food'],
} as const;

export const fullCityDetailsResponseFixture = {
    city: citySummary,
    cached: true,
    details: fullCityDetailsFixture,
} as const;

/** Minimal detail body — required fields only; every optional omitted. */
export const minimalCityDetailsFixture = {
    long_description: '',
    country_description: '',
    budget_description: '',
    city_highlight: '',
    country_highlight: '',
    top_places: [],
    foods: [],
    things_to_do: [],
    photo_spots: [],
    notes_to_know: [],
    best_time_to_visit: '',
    worst_time_to_visit: '',
    weather: '',
    currency,
    safety,
    coordinates,
    travel_basics: travelBasics,
    lodging,
    nearby_destinations: [],
    local_flavor: localFlavor,
    cost_level: 2,
    visa,
} as const;

export const minimalCityDetailsResponseFixture = {
    city: {
        name: 'Nowhere',
        country: 'Void',
        country_code: 'XX',
        country_id: null,
        image_url: null,
        photographer_name: null,
        photographer_url: null,
    },
    cached: false,
    details: minimalCityDetailsFixture,
} as const;

export const cityProseSliceFixture = {
    city: citySummary,
    cached: true,
    prose: {
        long_description: 'Kyoto is the cultural heart of Japan.',
        country_description: 'Japan blends tradition and technology.',
        budget_description: 'Mid-range friendly.',
        city_highlight: 'Temples and geisha districts.',
        country_highlight: 'Bullet trains and onsen.',
        weather: 'Four distinct seasons.',
        best_time_to_visit: 'April & November',
        worst_time_to_visit: 'Rainy June',
        cultural_shock: 'Quiet trains.',
        before_you_go: ['Get an IC card'],
        hidden_gems: [{ name: 'Philosopher’s Path', why: null }],
        neighborhoods: { best: ['Gion'], avoid: ['Kabukicho-style clip joints'] },
    },
} as const;

export const cityListsSliceFixture = {
    cached: true,
    lists: {
        top_places: namedTips,
        foods: namedTips,
        things_to_do: namedTips,
        photo_spots: namedTips,
        notes_to_know: namedTips,
        nearby_destinations: nearby,
        local_flavor: localFlavor,
    },
} as const;

export const cityFactsSliceFixture = {
    cached: true,
    facts: {
        currency,
        safety,
        coordinates,
        travel_basics: travelBasics,
        lodging,
        cost_level: 4,
        visa,
        airports,
        tourist_rating: 5,
        popularity: { score: 88, trend: 'steady', summary: 'Consistently loved' },
        walkability: { rating: 4, note: 'Very walkable' },
        great_for: ['culture', 'food'],
    },
} as const;
