import type {
    PlaceDetails,
    PlaceRecommendation,
} from 'types';

/**
 * Wire (snake_case) + FE (camelCase) fixtures for the place-recommendation /
 * place-details boundary. `*Wire` objects are fed to MSW so the real client
 * runs its `to*` reshaping; the `*Expected` / `*Fixture` objects are typed as
 * the FE interface so they can't silently drift.
 *
 * The three detail slices (prose / lists / facts) are composed into the
 * monolithic `/place-details` payload — mirroring `toDetails` on the client —
 * so the two paths can never disagree.
 */

// ---------- recommendations ----------

export const placeItemWire = {
    name: 'Kyoto',
    city: 'Kyoto',
    country: 'Japan',
    country_code: 'JP',
    rating: 4.8,
    best_time_to_visit: 'April',
    description: 'Ancient capital of Japan',
    image_url: 'https://img.example/kyoto.jpg',
    photographer_name: 'Ken',
    photographer_url: 'https://ph.example/ken',
    latitude: 35.01,
    longitude: 135.77,
};

export const placeRecommendationFixture: PlaceRecommendation = {
    name: 'Kyoto',
    city: 'Kyoto',
    country: 'Japan',
    countryCode: 'JP',
    rating: 4.8,
    bestTimeToVisit: 'April',
    description: 'Ancient capital of Japan',
    imageUrl: 'https://img.example/kyoto.jpg',
    photographerName: 'Ken',
    photographerUrl: 'https://ph.example/ken',
    latitude: 35.01,
    longitude: 135.77,
};

export const recommendationsResponseWire = {
    query: 'kyoto',
    cached: false,
    items: [placeItemWire],
    summary: 'A one-line overview of the matches.',
    related_searches: ['osaka', 'nara'],
};

export const placeDirectResponseWire = {
    query: 'Kyoto, Japan',
    cached: true,
    items: [placeItemWire],
};

// ---------- detail slices ----------

export const proseWire = {
    long_description: 'A long description of Kyoto.',
    country_description: 'A description of Japan.',
    budget_description: 'Mid-range budget guidance.',
    city_highlight: 'Temples and gardens.',
    country_highlight: 'Ancient meets modern.',
    weather: 'Mild with four seasons.',
    worst_time_to_visit: 'Peak rainy season.',
    cultural_shock: 'Remove shoes indoors.',
    before_you_go: ['Get a JR pass'],
    hidden_gems: [{ name: 'Secret garden', why: 'Rarely crowded' }],
    neighborhoods: { best: ['Gion'], avoid: ['Far suburbs'] },
};

export const proseExpected: Partial<PlaceDetails> = {
    longDescription: 'A long description of Kyoto.',
    countryDescription: 'A description of Japan.',
    budgetDescription: 'Mid-range budget guidance.',
    cityHighlight: 'Temples and gardens.',
    countryHighlight: 'Ancient meets modern.',
    weather: 'Mild with four seasons.',
    worstTimeToVisit: 'Peak rainy season.',
    culturalShock: 'Remove shoes indoors.',
    beforeYouGo: ['Get a JR pass'],
    hiddenGems: [{ name: 'Secret garden', why: 'Rarely crowded' }],
    neighborhoods: { best: ['Gion'], avoid: ['Far suburbs'] },
};

export const listsWire = {
    foods: [{ name: 'Sushi', why: 'Impeccably fresh' }],
    places_to_visit: [{ name: 'Fushimi Inari', why: 'Torii gates' }],
    things_to_do: [
        {
            name: 'Tea ceremony',
            why: 'A cultural rite',
            image_url: 'https://img.example/tea.jpg',
            photographer_name: 'Ana',
            photographer_url: 'https://ph.example/ana',
        },
    ],
    photo_spots: [{ name: 'Bamboo grove', why: 'Iconic tunnels' }],
    notes_to_know: [{ name: 'Carry cash', why: 'Many places are cash-only' }],
    // image_url intentionally omitted so the `?? null` branch produces null
    // and no snake key leaks through the client's `...n` spread.
    nearby_destinations: [
        {
            name: 'Osaka',
            country: 'Japan',
            kind: 'city',
            why: 'Street food capital',
            lat: 34.69,
            lng: 135.5,
        },
    ],
    local_flavor: {
        fun_level: 4,
        nightlife: 'Lively pockets',
        famous_liquor: 'Sake',
        unique_souvenir: 'Folding fan',
        must_do_before_leaving: [{ name: 'Karaoke', why: 'A local staple' }],
    },
};

export const listsExpected: Partial<PlaceDetails> = {
    foods: [{ name: 'Sushi', why: 'Impeccably fresh' }],
    placesToVisit: [{ name: 'Fushimi Inari', why: 'Torii gates' }],
    thingsToDo: [
        {
            name: 'Tea ceremony',
            why: 'A cultural rite',
            imageUrl: 'https://img.example/tea.jpg',
            photographerName: 'Ana',
            photographerUrl: 'https://ph.example/ana',
        },
    ],
    photoSpots: [{ name: 'Bamboo grove', why: 'Iconic tunnels' }],
    notesToKnow: [{ name: 'Carry cash', why: 'Many places are cash-only' }],
    nearbyDestinations: [
        {
            name: 'Osaka',
            country: 'Japan',
            kind: 'city',
            why: 'Street food capital',
            lat: 34.69,
            lng: 135.5,
            imageUrl: null,
        },
    ],
    localFlavor: {
        funLevel: 4,
        nightlife: 'Lively pockets',
        famousLiquor: 'Sake',
        uniqueSouvenir: 'Folding fan',
        mustDoBeforeLeaving: [{ name: 'Karaoke', why: 'A local staple' }],
    },
};

export const factsWire = {
    currency: { code: 'JPY', name: 'Japanese Yen', rate_per_usd: 150 },
    safety: { score: 90, level: 'low', summary: 'Very safe' },
    coordinates: { lat: 35.01, lng: 135.77 },
    travel_basics: {
        preferred_transport: 'Train',
        transport_system: 'JR + subway',
        payment_method: 'card',
        payment_note: 'IC cards everywhere',
        language: 'Japanese',
        vibe: 'Serene',
        audience: 'All travelers',
        age_recommendation: 'Any age',
    },
    lodging: {
        recommended_type: 'Ryokan',
        airbnb_availability: 'limited',
        airbnb_note: 'Some listings',
        hotel_availability: 'common',
        hotel_note: 'Plentiful',
        price_range: '$$',
        booking_tip: 'Book early in spring',
    },
    cost_level: 3,
    visa: {
        destination_country_code: 'JP',
        visa_free_countries: ['US', 'CA'],
        visa_on_arrival_countries: [],
        summary: 'Visa-free for 90 days',
    },
    airports: [
        {
            iata_code: 'KIX',
            name: 'Kansai International',
            distance_km: 100,
            international: true,
        },
    ],
    popularity: { score: 80, trend: 'rising', summary: 'Trending up' },
    walkability: { rating: 4, note: 'Very walkable core' },
    great_for: ['culture', 'food'],
};

export const factsExpected: Partial<PlaceDetails> = {
    currency: { code: 'JPY', name: 'Japanese Yen', ratePerUsd: 150 },
    safety: { score: 90, level: 'low', summary: 'Very safe' },
    coordinates: { lat: 35.01, lng: 135.77 },
    travelBasics: {
        preferredTransport: 'Train',
        transportSystem: 'JR + subway',
        paymentMethod: 'card',
        paymentNote: 'IC cards everywhere',
        language: 'Japanese',
        vibe: 'Serene',
        audience: 'All travelers',
        ageRecommendation: 'Any age',
    },
    lodging: {
        recommendedType: 'Ryokan',
        airbnbAvailability: 'limited',
        airbnbNote: 'Some listings',
        hotelAvailability: 'common',
        hotelNote: 'Plentiful',
        priceRange: '$$',
        bookingTip: 'Book early in spring',
    },
    costLevel: 3,
    visa: {
        destinationCountryCode: 'JP',
        visaFreeCountries: ['US', 'CA'],
        visaOnArrivalCountries: [],
        summary: 'Visa-free for 90 days',
    },
    airports: [
        {
            iataCode: 'KIX',
            name: 'Kansai International',
            distanceKm: 100,
            international: true,
        },
    ],
    popularity: { score: 80, trend: 'rising', summary: 'Trending up' },
    walkability: { rating: 4, note: 'Very walkable core' },
    greatFor: ['culture', 'food'],
};

// ---------- composed monolith (mirrors `toDetails`) ----------

export const placeDetailsWire = {
    ...proseWire,
    ...listsWire,
    ...factsWire,
};

export const placeDetailsExpected: PlaceDetails = {
    ...(proseExpected as PlaceDetails),
    ...listsExpected,
    ...factsExpected,
};

export const placeDetailsResponseWire = {
    query: 'Kyoto, Japan',
    index: 0,
    cached: true,
    details: placeDetailsWire,
};
