/**
 * `/activities/suggest-fields` — backend proxy that asks an LLM to
 * guess sensible cost / time / location values for an activity from
 * its kind + name + place. Mirrors `flightLookupApi`: snake↔camel at
 * the edge, returns `null` on no-suggestions (silent-fail UX) so the
 * caller leaves every field the user / a prior lookup already filled
 * untouched.
 *
 * Called imperatively (fire-and-forget) from the Add-Activity smart-
 * entry resolve handlers — never via React Query — so a suggestion can
 * land a beat after the review step renders without blocking it.
 */
const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface ActivitySuggestion {
    location: string | null;
    city: string | null;
    country: string | null;
    /** Local 24h `HH:mm` */
    startTime: string | null;
    /** Local 24h `HH:mm` */
    endTime: string | null;
    /** Local 24h `HH:mm` */
    checkInTime: string | null;
    /** Local 24h `HH:mm` */
    checkOutTime: string | null;
    /** Local 24h `HH:mm` */
    departTime: string | null;
    /** Local 24h `HH:mm` */
    arrivalTime: string | null;
    /** Bare numeric string, e.g. "65". */
    cost: string | null;
    currency: string | null;
}

export interface SuggestFieldsArgs {
    kind: string;
    name?: string;
    location?: string;
    city?: string;
    country?: string;
    departLocation?: string;
    arrivalLocation?: string;
    provider?: string;
    date?: string;
}

interface ActivitySuggestionRaw {
    location?: string | null;
    city?: string | null;
    country?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    check_in_time?: string | null;
    check_out_time?: string | null;
    depart_time?: string | null;
    arrival_time?: string | null;
    cost?: string | null;
    currency?: string | null;
}

interface SuggestFieldsResponseRaw {
    result: ActivitySuggestionRaw | null;
}

const toSuggestion = (r: ActivitySuggestionRaw): ActivitySuggestion => ({
    location: r.location ?? null,
    city: r.city ?? null,
    country: r.country ?? null,
    startTime: r.start_time ?? null,
    endTime: r.end_time ?? null,
    checkInTime: r.check_in_time ?? null,
    checkOutTime: r.check_out_time ?? null,
    departTime: r.depart_time ?? null,
    arrivalTime: r.arrival_time ?? null,
    cost: r.cost ?? null,
    currency: r.currency ?? null,
});

export const suggestActivityFields = async (
    args: SuggestFieldsArgs,
): Promise<ActivitySuggestion | null> => {
    try {
        const body: Record<string, string> = { kind: args.kind };
        if (args.name) body.name = args.name;
        if (args.location) body.location = args.location;
        if (args.city) body.city = args.city;
        if (args.country) body.country = args.country;
        if (args.departLocation) body.depart_location = args.departLocation;
        if (args.arrivalLocation) body.arrival_location = args.arrivalLocation;
        if (args.provider) body.provider = args.provider;
        if (args.date) body.date = args.date;

        const resp = await fetch(`${API_BASE}/activities/suggest-fields`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        // Any non-OK (incl. backend 503 when the LLM key isn't set) is
        // treated as "no suggestions" — keep the user's typed values.
        if (!resp.ok) return null;
        const json = (await resp.json()) as SuggestFieldsResponseRaw;
        return json.result ? toSuggestion(json.result) : null;
    } catch {
        // Network error → silent no-op, same posture as the lookups.
        return null;
    }
};
