/**
 * Deterministic place-key slug shared with the Python backend.
 *
 * Same algorithm as `slugify_place` in `app/services/reviews.py`:
 * each piece is lowercased, non-alphanumerics collapsed to `-`, edges
 * trimmed, then joined by `--`.
 *
 * IMPORTANT: The two must stay in sync — the create-review endpoint
 * recomputes the slug from the submitted name/city/country and rejects
 * mismatches.
 */
const slugifyPart = (part: string): string =>
    part
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

export const getPlaceKey = (name: string, city: string, country: string): string =>
    `${slugifyPart(name)}--${slugifyPart(city)}--${slugifyPart(country)}`;
