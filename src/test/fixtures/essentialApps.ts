/** Wire-shape fixtures for `GET /essential-apps?code=<ISO2>`. The raw
 *  snake_case type isn't exported from the module, so we pin the wire shape
 *  locally here. */
export interface EssentialAppWire {
    name: string;
    note: string | null;
    status: string | null;
}
export interface EssentialAppCategoryWire {
    key: string;
    apps: EssentialAppWire[];
}
export interface EssentialAppsWire {
    country_code: string;
    categories: EssentialAppCategoryWire[];
    source?: string;
    intro?: string | null;
}

export const essentialAppsFixture: EssentialAppsWire = {
    country_code: 'JP',
    categories: [
        {
            key: 'ride_hailing',
            apps: [
                { name: 'GO', note: 'Taxi hailing', status: 'essential' },
                { name: 'Uber', note: 'Limited coverage', status: 'caution' },
                { name: 'DiDi', note: null, status: null },
                { name: 'Legacy', note: null, status: 'unknown-value' },
            ],
        },
        {
            key: 'payments',
            apps: [{ name: 'Suica', note: 'Tap transit + retail', status: 'essential' }],
        },
    ],
    source: 'curated',
    intro: 'Getting around Japan is easy with a couple of key apps.',
};

/** An AI-sourced response with no intro (older/AI cached rows omit it). */
export const essentialAppsAiFixture: EssentialAppsWire = {
    country_code: 'FR',
    categories: [
        {
            key: 'maps',
            apps: [{ name: 'Citymapper', note: null, status: 'essential' }],
        },
    ],
    source: 'ai',
};

/** A legacy response missing both `source` and `intro` → defaults to curated
 *  / null intro. */
export const essentialAppsLegacyFixture: EssentialAppsWire = {
    country_code: 'IT',
    categories: [],
};
