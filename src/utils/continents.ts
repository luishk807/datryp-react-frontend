/**
 * Static ISO 3166-1 alpha-2 → continent mapping for the Travel Atlas
 * per-continent completion stat ("South America 3/12 · 25%"). Membership
 * lists double as the per-continent country totals (the array length), so
 * there's a single source of truth. No backend / no network — clicking a
 * country on the map resolves its continent locally.
 *
 * A few trans-continental countries are assigned to one side by convention
 * (Russia→Europe, Turkey/Georgia/Armenia/Azerbaijan/Kazakhstan→Asia,
 * Cyprus→Europe). This is a motivational stat, not a geopolitical ruling —
 * the assignment just has to be stable and reasonable.
 */

export type ContinentKey =
    | 'africa'
    | 'asia'
    | 'europe'
    | 'north_america'
    | 'central_america'
    | 'south_america'
    | 'oceania';

export const CONTINENT_LABEL: Record<ContinentKey, string> = {
    africa: 'Africa',
    asia: 'Asia',
    europe: 'Europe',
    north_america: 'North America',
    central_america: 'Central America',
    south_america: 'South America',
    oceania: 'Oceania',
};

// Sovereign-state ISO alpha-2 codes per continent. Length = the continent's
// country total used as the stat's denominator.
export const CONTINENT_COUNTRIES: Record<ContinentKey, string[]> = {
    africa: [
        'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CV', 'CM', 'CF', 'TD', 'KM',
        'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'SZ', 'ET', 'GA', 'GM',
        'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR',
        'MU', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RW', 'ST', 'SN', 'SC', 'SL',
        'SO', 'ZA', 'SS', 'SD', 'TZ', 'TG', 'TN', 'UG', 'ZM', 'ZW',
    ],
    asia: [
        'AF', 'AM', 'AZ', 'BH', 'BD', 'BT', 'BN', 'KH', 'CN', 'GE', 'IN',
        'ID', 'IR', 'IQ', 'IL', 'JP', 'JO', 'KZ', 'KW', 'KG', 'LA', 'LB',
        'MY', 'MV', 'MN', 'MM', 'NP', 'KP', 'OM', 'PK', 'PS', 'PH', 'QA',
        'SA', 'SG', 'KR', 'LK', 'SY', 'TW', 'TJ', 'TH', 'TL', 'TR', 'TM',
        'AE', 'UZ', 'VN', 'YE',
    ],
    europe: [
        'AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK',
        'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IS', 'IE', 'IT', 'LV', 'LI',
        'LT', 'LU', 'MT', 'MD', 'MC', 'ME', 'NL', 'MK', 'NO', 'PL', 'PT',
        'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SE', 'CH', 'UA', 'GB',
        'VA',
    ],
    north_america: [
        'AG', 'BS', 'BB', 'CA', 'CU', 'DM', 'DO', 'GD', 'HT', 'JM', 'MX',
        'KN', 'LC', 'VC', 'TT', 'US',
    ],
    central_america: ['BZ', 'CR', 'SV', 'GT', 'HN', 'NI', 'PA'],
    south_america: [
        'AR', 'BO', 'BR', 'CL', 'CO', 'EC', 'GY', 'PY', 'PE', 'SR', 'UY',
        'VE',
    ],
    oceania: [
        'AU', 'FJ', 'KI', 'MH', 'FM', 'NR', 'NZ', 'PW', 'PG', 'WS', 'SB',
        'TO', 'TV', 'VU',
    ],
};

export const CONTINENT_TOTAL: Record<ContinentKey, number> = {
    africa: CONTINENT_COUNTRIES.africa.length,
    asia: CONTINENT_COUNTRIES.asia.length,
    europe: CONTINENT_COUNTRIES.europe.length,
    north_america: CONTINENT_COUNTRIES.north_america.length,
    central_america: CONTINENT_COUNTRIES.central_america.length,
    south_america: CONTINENT_COUNTRIES.south_america.length,
    oceania: CONTINENT_COUNTRIES.oceania.length,
};

// Reverse lookup built once at module load.
const CODE_TO_CONTINENT: Record<string, ContinentKey> = (() => {
    const out: Record<string, ContinentKey> = {};
    (Object.keys(CONTINENT_COUNTRIES) as ContinentKey[]).forEach((key) => {
        for (const code of CONTINENT_COUNTRIES[key]) out[code] = key;
    });
    return out;
})();

/** Resolve an ISO alpha-2 code to its continent, or null if unknown. */
export const continentForCode = (
    code: string | null | undefined
): ContinentKey | null => {
    if (!code) return null;
    return CODE_TO_CONTINENT[code.toUpperCase()] ?? null;
};

/** Membership set for a continent (uppercased codes). */
export const continentMembers = (key: ContinentKey): Set<string> =>
    new Set(CONTINENT_COUNTRIES[key]);
