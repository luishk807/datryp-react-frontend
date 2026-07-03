/** Two-letter ISO 3166-1 alpha-2 country code → Unicode flag emoji.
 *  Falls back to a globe when the code is missing/malformed. Mirrors the
 *  private helper SearchBar carries; shared here for the mobile home
 *  trip modules (Continue planning + Upcoming trips) which both flag a
 *  trip's destination country. */
export const countryCodeToFlag = (code?: string | null): string => {
    const c = (code ?? '').trim().toUpperCase();
    if (c.length !== 2) return '🌐';
    const base = 0x1f1e6 - 65; // regional-indicator 'A' offset from ASCII 'A'
    return String.fromCodePoint(c.charCodeAt(0) + base, c.charCodeAt(1) + base);
};
