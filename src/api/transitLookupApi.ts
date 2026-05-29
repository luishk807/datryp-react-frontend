/**
 * `/transit/lookup` — backend proxy that calls OpenAI to resolve
 * a train / bus number into station + scheduled-time data. Mirrors
 * `flightLookupApi`: returns `null` on no-match (silent-fail UX),
 * frontend keeps whatever the user typed.
 */
const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export type TransitKind = 'train' | 'bus';

export interface TransitLookupResult {
    operator: string | null;
    number: string | null;
    departStation: string | null;
    arrivalStation: string | null;
    /** Local 24h `HH:mm` */
    departTime: string | null;
    /** Local 24h `HH:mm` */
    arrivalTime: string | null;
    departDate: string | null;
    arrivalDate: string | null;
    routeName: string | null;
}

interface TransitLookupRaw {
    operator: string | null;
    number: string | null;
    depart_station: string | null;
    arrival_station: string | null;
    depart_time: string | null;
    arrival_time: string | null;
    depart_date: string | null;
    arrival_date: string | null;
    route_name: string | null;
}

interface TransitLookupResponseRaw {
    result: TransitLookupRaw | null;
}

const fromRaw = (r: TransitLookupRaw): TransitLookupResult => ({
    operator: r.operator,
    number: r.number,
    departStation: r.depart_station,
    arrivalStation: r.arrival_station,
    departTime: r.depart_time,
    arrivalTime: r.arrival_time,
    departDate: r.depart_date,
    arrivalDate: r.arrival_date,
    routeName: r.route_name,
});

export const lookupTransit = async (
    operator: string,
    number: string,
    kind: TransitKind,
    country?: string,
    departDate?: string,
): Promise<TransitLookupResult | null> => {
    const params = new URLSearchParams({ operator, number, kind });
    if (country) params.set('country', country);
    if (departDate) params.set('depart_date', departDate);
    const res = await fetch(`${API_BASE}/transit/lookup?${params}`);
    if (!res.ok) return null;
    const json = (await res.json()) as TransitLookupResponseRaw;
    if (!json.result) return null;
    return fromRaw(json.result);
};
