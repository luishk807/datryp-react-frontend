/** Wire-shape fixtures for `GET /country-facts`. The module's raw response
 *  interface is private, so the shape is pinned locally. `fullFactsWireFixture`
 *  exercises every nested section; `minimalFactsWireFixture` carries only the
 *  always-present fields so the reshaper's null/default branches are covered. */
export const fullFactsWireFixture = {
    country_code: 'JP',
    emergency: { general: '110', police: '110', ambulance: '119' },
    power: { plugs: ['A', 'B'], voltage: 100, frequency: 50 },
    timezone: 'Asia/Tokyo',
    timezone_multi: false,
    religion: {
        main: 'Shinto & Buddhism',
        emoji: '⛩️',
        note: 'very secular in practice',
        customs: ['Remove shoes indoors'],
    },
    tipping: {
        summary: 'Not expected — service is included',
        categories: { restaurants: 'No', taxi: 'No' },
    },
    water: { status: 'safe', note: 'Tap water is safe to drink' },
    wifi: {
        rating: 5,
        summary: 'Fast and widely available',
        mobile: '5G widely available',
    },
    great_for: ['food', 'culture'],
    safety_tips: ['Very low crime — normal precautions'],
    scams: ['Overpriced taxis near tourist spots'],
    currency_tips: {
        cards: 'Widely accepted in cities',
        cash: 'Still handy for small shops',
        atm: '7-Eleven ATMs take foreign cards',
        apple_pay: 'Common via Suica',
        cards_rating: 4,
        cash_rating: 3,
    },
    avg_costs: {
        budget: '80',
        midrange: '200',
        luxury: '500',
        meal: '12',
        coffee: '4',
        transit: '2',
        beer: '5',
    },
    health: {
        vaccinations: 'Routine vaccines',
        mosquitoes: 'Low risk',
        malaria: 'None',
    },
    accessibility: {
        wheelchair: 'Good in cities',
        transit: 'Most stations have elevators',
        sidewalks: 'Well maintained',
        signage: 'English signage common',
    },
    festivals: [
        { name: 'Cherry Blossom', when: 'Late March–April' },
        { name: 'Obon', when: 'August' },
    ],
    etiquette: ["Don't tip", 'Bow when greeting'],
    source: 'curated',
} as const;

export const minimalFactsWireFixture = {
    country_code: 'XY',
    emergency: { general: '112' },
    power: null,
    timezone: null,
    timezone_multi: true,
} as const;
