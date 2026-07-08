/** ISO 3166-1 alpha-2 code → localized country name via the platform's
 *  `Intl.DisplayNames`. Falls back to the raw (upper-cased) code when the
 *  API is unavailable or the code is unknown. The formatter is non-trivial
 *  to construct, so we cache one per locale. */
const formatterCache = new Map<string, Intl.DisplayNames | null>();

const formatterFor = (locale: string): Intl.DisplayNames | null => {
    if (formatterCache.has(locale)) return formatterCache.get(locale) ?? null;
    let dn: Intl.DisplayNames | null;
    try {
        dn = new Intl.DisplayNames([locale], { type: 'region' });
    } catch {
        dn = null;
    }
    formatterCache.set(locale, dn);
    return dn;
};

export const countryName = (code?: string | null, locale = 'en'): string => {
    const cc = (code ?? '').trim().toUpperCase();
    if (cc.length !== 2) return (code ?? '').trim();
    try {
        return formatterFor(locale)?.of(cc) ?? cc;
    } catch {
        return cc;
    }
};
