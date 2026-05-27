/**
 * `/flights/lookup` — AeroDataBox proxy on our backend. Given a flight
 * number + departure date, returns a normalized payload the flight
 * segment form can use to auto-populate airports + times. Backend
 * holds the RapidAPI key, so this client just speaks plain JSON.
 *
 * Returns `null` (not an error) on no-match, bad-shape, or backend
 * 503 (key not configured). Callers should treat null as "leave the
 * user's typed value alone" — silent failure was the chosen UX.
 */
const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface FlightLookupResult {
    flightNumber: string | null;
    departAirport: string | null;
    arrivalAirport: string | null;
    departDate: string | null;
    departTime: string | null;
    arrivalDate: string | null;
    arrivalTime: string | null;
    airline: string | null;
}

interface FlightLookupRaw {
    flight_number: string | null;
    depart_airport: string | null;
    arrival_airport: string | null;
    depart_date: string | null;
    depart_time: string | null;
    arrival_date: string | null;
    arrival_time: string | null;
    airline: string | null;
}

interface FlightLookupResponseRaw {
    result: FlightLookupRaw | null;
}

const toResult = (r: FlightLookupRaw): FlightLookupResult => ({
    flightNumber: r.flight_number,
    departAirport: r.depart_airport,
    arrivalAirport: r.arrival_airport,
    departDate: r.depart_date,
    departTime: r.depart_time,
    arrivalDate: r.arrival_date,
    arrivalTime: r.arrival_time,
    airline: r.airline,
});

export const lookupFlight = async (
    number: string,
    date: string,
): Promise<FlightLookupResult | null> => {
    const cleanedNumber = number.trim();
    if (!cleanedNumber || !date) return null;
    const resp = await fetch(
        `${API_BASE}/flights/lookup` +
            `?number=${encodeURIComponent(cleanedNumber)}` +
            `&date=${encodeURIComponent(date)}`,
    );
    // Treat backend 503 (no API key) and 4xx/5xx alike as no-result —
    // the form should keep the user's typed value untouched. Network
    // errors will throw and React Query's retry handles transient
    // blips, but we don't want errors bubbling into the UI.
    if (!resp.ok) return null;
    const body = (await resp.json()) as FlightLookupResponseRaw;
    return body.result ? toResult(body.result) : null;
};
