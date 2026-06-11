import { FALLBACK_HERO_IMAGES } from "constants";
import type { HeroImage } from "types";

/** Hosts whose `/hero/*` paths serve the SPA's index.html instead of real
 *  JPGs (stale seed rows). Filtered out so a hero never paints as a broken
 *  image. Mirrors the Home page's guard; drop entries as the backend data
 *  is re-seeded against a real image origin. */
const KNOWN_BROKEN_HERO_HOSTS = ["d111x5lpaimz3o.cloudfront.net"];

export const isUsableHeroUrl = (
    url: string | undefined | null,
): url is string =>
    !!url && !KNOWN_BROKEN_HERO_HOSTS.some((host) => url.includes(host));

/** Deterministic per-month hero pick. Rotates through the usable backend
 *  hero photos (popular destinations) so a surface changes once a month
 *  without flickering on reload — the month indexes a sorted list, so a
 *  stable dataset maps the same photo to a given month. Falls back to the
 *  self-hosted sample set when the backend returns none. */
export const pickMonthlyHeroUrl = (
    heroes: HeroImage[] | undefined,
    date: Date = new Date(),
): string => {
    const usable = (heroes ?? [])
        .map((h) => h.imageUrl)
        .filter(isUsableHeroUrl)
        .sort();
    const pool = usable.length > 0 ? usable : [...FALLBACK_HERO_IMAGES];
    return pool[date.getMonth() % pool.length];
};
