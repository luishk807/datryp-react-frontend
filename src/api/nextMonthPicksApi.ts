/**
 * `/me/next-month-picks` — homepage box surfacing destinations the user
 * has saved (places / cities / countries) whose `best_time_to_visit`
 * window covers the upcoming month, with already-visited destinations
 * filtered out. Free for everyone — backend compute is zero-cost
 * (no fresh OpenAI calls; reads from existing caches).
 */
import { getAuthToken } from './authStorage';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

/** Discriminator for the destination link.
 *  - "place"   → go-direct `/place?q=<name>&city=<city>&country=<country>`
 *  - "city"    → `/city?name=<name>&country=<country>&code=<code>&mode=single`
 *  - "country" → `/country?code=<code>`
 */
export type NextMonthPickKind = 'place' | 'city' | 'country';

export interface NextMonthPickItem {
    kind: NextMonthPickKind;
    /** Stable identifier — place_key / city_slug / country code. */
    key: string;
    name: string;
    /** Human "where" string already formatted on the backend. */
    location: string;
    /** Place-only raw city + country for a go-direct `/place` link. Null for
     *  city/country kinds and legacy cached rows. */
    city: string | null;
    country: string | null;
    countryCode: string | null;
    imageUrl: string | null;
    /** Original best-time-to-visit string ("May to October"). Rendered
     *  verbatim on the card as the rationale. */
    bestTimeToVisit: string;
    /** ISO-8601 datetime of when the user saved this destination. */
    savedAt: string;
}

export interface NextMonthPicksResult {
    items: NextMonthPickItem[];
    /** "January" / "February" / ... — the upcoming month, ready to render
     *  in the box title without a duplicated calendar lookup on the FE. */
    monthLabel: string;
}

interface NextMonthPickItemRaw {
    kind: NextMonthPickKind;
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

interface NextMonthPicksRaw {
    items: NextMonthPickItemRaw[];
    month_label: string;
}

const authHeaders = (): Record<string, string> => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const toItem = (r: NextMonthPickItemRaw): NextMonthPickItem => ({
    kind: r.kind,
    key: r.key,
    name: r.name,
    location: r.location,
    city: r.city,
    country: r.country,
    countryCode: r.country_code,
    imageUrl: r.image_url,
    bestTimeToVisit: r.best_time_to_visit,
    savedAt: r.saved_at,
});

export const fetchNextMonthPicks =
    async (): Promise<NextMonthPicksResult> => {
        const resp = await fetch(`${API_BASE}/me/next-month-picks`, {
            headers: authHeaders(),
        });
        if (!resp.ok) {
            let detail: string | undefined;
            try {
                const body = await resp.json();
                if (typeof body?.detail === 'string') detail = body.detail;
            } catch {
                /* ignore */
            }
            throw new Error(
                `/me/next-month-picks ${resp.status}${
                    detail ? ` — ${detail}` : ''
                }`
            );
        }
        const body = (await resp.json()) as NextMonthPicksRaw;
        return {
            items: body.items.map(toItem),
            monthLabel: body.month_label,
        };
    };
