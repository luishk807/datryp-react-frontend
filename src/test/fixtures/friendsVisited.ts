/** Wire-shape fixtures for the friends-visited endpoints. The raw interfaces
 *  are private, so the shapes are pinned locally. `friendsVisitedWireFixture`
 *  exercises the per-page `toItem` reshape (rating + review, one populated /
 *  one null); `friendsVisitedAllWireFixture` exercises the three grouped
 *  `toBrief` reshapes for the Atlas overlay. */
export const friendsVisitedWireFixture = {
    count: 2,
    friends: [
        {
            user_id: 'u1',
            name: 'Ada Traveler',
            profile_image_url: 'https://images.example.com/ada.jpg',
            visited_at: '2026-05-01T00:00:00Z',
            rating: 5,
            review_text: 'Unforgettable sunrise hike.',
        },
        {
            user_id: 'u2',
            name: 'Ben Nomad',
            profile_image_url: null,
            visited_at: '2026-04-14T00:00:00Z',
            rating: null,
            review_text: null,
        },
    ],
} as const;

export const friendsVisitedAllWireFixture = {
    countries: [
        {
            country_code: 'JP',
            country_name: 'Japan',
            friends: [
                { user_id: 'u1', name: 'Ada Traveler', profile_image_url: null },
            ],
        },
    ],
    cities: [
        {
            city_slug: 'kyoto-jp',
            city_name: 'Kyoto',
            country_name: 'Japan',
            country_code: 'JP',
            latitude: 35.0116,
            longitude: 135.7681,
            friends: [
                {
                    user_id: 'u2',
                    name: 'Ben Nomad',
                    profile_image_url: 'https://images.example.com/ben.jpg',
                },
            ],
        },
    ],
    places: [
        {
            place_key: 'fushimi-inari',
            place_name: 'Fushimi Inari Taisha',
            place_city: 'Kyoto',
            place_country: 'Japan',
            latitude: 34.9671,
            longitude: 135.7727,
            friends: [
                { user_id: 'u1', name: 'Ada Traveler', profile_image_url: null },
            ],
        },
    ],
} as const;
