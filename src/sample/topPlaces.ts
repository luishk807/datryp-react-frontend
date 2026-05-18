export interface TopPlace {
    /** Stable key for React's render list. Numeric for the legacy seed
     *  data, string slug (`name--code`) for live monthly cities. */
    id: number | string;
    name: string;
    country: string;
    countryCode: string;
    image: string;
    tagline: string;
}

export const topPlaces: TopPlace[] = [
    {
        id: 1,
        name: 'Reykjavik',
        country: 'Iceland',
        countryCode: 'IS',
        image: '/images/sample/iceland.jpg',
        tagline: 'Volcanic landscapes and northern lights.',
    },
    {
        id: 2,
        name: 'Hanoi',
        country: 'Vietnam',
        countryCode: 'VN',
        image: '/images/sample/vietnam.jpg',
        tagline: 'Ancient temples and vibrant street food.',
    },
    {
        id: 3,
        name: 'Beijing',
        country: 'China',
        countryCode: 'CN',
        image: '/images/sample/china1.jpg',
        tagline: 'Great Wall and imperial heritage.',
    },
    {
        id: 4,
        name: 'Shanghai',
        country: 'China',
        countryCode: 'CN',
        image: '/images/sample/china2.jpg',
        tagline: 'A skyline where east meets west.',
    },
    {
        id: 5,
        name: 'Halong Bay',
        country: 'Vietnam',
        countryCode: 'VN',
        image: '/images/sample/vietnam.jpg',
        tagline: 'Emerald waters and limestone karsts.',
    },
    {
        id: 6,
        name: 'Tibet',
        country: 'China',
        countryCode: 'CN',
        image: '/images/sample/china1.jpg',
        tagline: 'Highland monasteries above the clouds.',
    },
];
