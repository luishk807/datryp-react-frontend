/**
 * Fetch layer for the personalized official travel advisory — the advisory
 * level a destination carries according to the TRAVELER'S OWN government
 * (residence country). `GET /travel-advisory?destination=&source=` is a public
 * curated-snapshot lookup; a 204 (same country, unsupported residence, or no
 * curated level) maps to null so the widget hides. Best-effort: any error also
 * maps to null.
 */
const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface TravelAdvisory {
    destinationCode: string;
    sourceCode: string;
    /** Issuing government, e.g. "U.S. Department of State". */
    sourceName: string;
    /** Official advisory page to verify the current level. */
    url: string;
    /** 1-4 where 1 is safest. */
    level: number;
    /** Source-specific wording, e.g. "Exercise Increased Caution". */
    label: string;
    /** When the snapshot was last reviewed. */
    updated: string;
}

interface TravelAdvisoryRaw {
    destination_code: string;
    source_code: string;
    source_name: string;
    url: string;
    level: number;
    label: string;
    updated: string;
}

export const fetchTravelAdvisory = async (
    destination: string,
    source: string,
): Promise<TravelAdvisory | null> => {
    try {
        const params = new URLSearchParams({ destination, source });
        const resp = await fetch(`${API_BASE}/travel-advisory?${params}`);
        if (!resp.ok) return null; // 204 / error → hide
        const b = (await resp.json()) as TravelAdvisoryRaw;
        return {
            destinationCode: b.destination_code,
            sourceCode: b.source_code,
            sourceName: b.source_name,
            url: b.url,
            level: b.level,
            label: b.label,
            updated: b.updated,
        };
    } catch {
        return null;
    }
};
