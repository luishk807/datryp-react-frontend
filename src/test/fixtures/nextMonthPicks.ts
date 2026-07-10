/** Wire-shape fixtures for `GET /me/next-month-picks`. The raw snake_case type
 *  isn't exported from the module, so we pin the wire shape locally here. */
export interface NextMonthPickItemWire {
    kind: 'place' | 'city' | 'country';
    key: string;
    name: string;
    location: string;
    city: string | null;
    country: string | null;
    country_code: string | null;
    image_url: string | null;
    best_time_to_visit: string;
    saved_at: string;
}

export interface NextMonthPicksWire {
    items: NextMonthPickItemWire[];
    month_label: string;
}

export const nextMonthPicksFixture: NextMonthPicksWire = {
    items: [
        {
            kind: 'place',
            key: 'santorini-gr',
            name: 'Santorini',
            location: 'Cyclades, Greece',
            city: 'Fira',
            country: 'Greece',
            country_code: 'GR',
            image_url: 'https://img.example/santorini.jpg',
            best_time_to_visit: 'May to October',
            saved_at: '2026-06-01T12:00:00Z',
        },
        {
            kind: 'country',
            key: 'JP',
            name: 'Japan',
            location: 'Japan',
            city: null,
            country: null,
            country_code: 'JP',
            image_url: null,
            best_time_to_visit: 'March to May',
            saved_at: '2026-05-20T09:30:00Z',
        },
    ],
    month_label: 'August',
};

export const nextMonthPicksEmptyFixture: NextMonthPicksWire = {
    items: [],
    month_label: 'August',
};
