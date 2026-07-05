/**
 * Fetch layer for the curated "essential apps" per country (ride-hailing,
 * payments, maps, food, connectivity, messaging). Backend is purely static
 * (app/data/country_apps.py) and public — no auth. A 204 means the country
 * isn't curated; we map it to `null` so the section hides.
 */
const API_BASE = import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export type EssentialAppStatus = 'essential' | 'caution' | null;

interface EssentialAppRaw {
    name: string;
    note: string | null;
    status: string | null;
}
interface EssentialAppCategoryRaw {
    key: string;
    apps: EssentialAppRaw[];
}
interface EssentialAppsResponseRaw {
    country_code: string;
    categories: EssentialAppCategoryRaw[];
    /** "curated" (hand-verified) or "ai" (auto-generated fallback). */
    source?: string;
}

export interface EssentialApp {
    name: string;
    note: string | null;
    status: EssentialAppStatus;
}
export interface EssentialAppCategory {
    key: string;
    apps: EssentialApp[];
}
export interface EssentialAppsResult {
    countryCode: string;
    categories: EssentialAppCategory[];
    /** Where the data came from: `curated` = hand-verified (shown plainly);
     *  `ai` = auto-generated (shown with an "auto-suggested — verify" notice
     *  so the user never treats it as verified fact). */
    source: 'curated' | 'ai';
}

const toApp = (raw: EssentialAppRaw): EssentialApp => ({
    name: raw.name,
    note: raw.note ?? null,
    status:
        raw.status === 'essential' || raw.status === 'caution'
            ? raw.status
            : null,
});

export const fetchEssentialApps = async (
    code: string
): Promise<EssentialAppsResult | null> => {
    const resp = await fetch(
        `${API_BASE}/essential-apps?code=${encodeURIComponent(code)}`
    );
    if (resp.status === 204) return null;
    if (!resp.ok) {
        let detail = `Request failed (${resp.status})`;
        try {
            const body = (await resp.json()) as { detail?: string };
            if (body?.detail) detail = body.detail;
        } catch {
            /* non-JSON error body — keep the status-code message */
        }
        throw new Error(detail);
    }
    const body = (await resp.json()) as EssentialAppsResponseRaw;
    return {
        countryCode: body.country_code,
        categories: body.categories.map((cat) => ({
            key: cat.key,
            apps: cat.apps.map(toApp),
        })),
        source: body.source === 'ai' ? 'ai' : 'curated',
    };
};
