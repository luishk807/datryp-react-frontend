/** Wire-shape fixture for `GET /me/country-of-birth-event`. The raw interfaces
 *  are private, so the shape is pinned locally. Mirrors the world-event shape
 *  but for the user's country of birth. */
export const countryOfBirthEventWireFixture = {
    event: {
        name: 'Carnaval de Barranquilla',
        start_date: '2027-02-13',
        end_date: '2027-02-16',
        host_country: 'Colombia',
        description: "One of the world's largest carnivals.",
        hype: 'Four days of cumbia, costumes and coastal joy.',
        image_url: 'https://images.example.com/carnaval.jpg',
        photographer_name: 'María Restrepo',
        photographer_url: 'https://example.com/maria',
    },
    places: [
        {
            name: 'Barranquilla',
            country: 'Colombia',
            country_code: 'CO',
            why: 'Ground zero for the carnival parades.',
            image_url: 'https://images.example.com/barranquilla.jpg',
            photographer_name: 'Diego Pérez',
            photographer_url: 'https://example.com/diego',
        },
    ],
} as const;
