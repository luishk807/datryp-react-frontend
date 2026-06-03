/**
 * `/flights/departures` — AeroDataBox airport-departures proxy on our
 * backend. Given an airport + date (and an optional time-of-day window +
 * airline filter), returns the scheduled departures the "Find my flight"
 * picker lists so the user can pick their flight without typing a number.
 *
 * The upstream provider is RATE-LIMITED, so this is ONE call per explicit
 * search — never auto-fire on keystroke. Cache aggressively at the hook
 * layer (see `useFlightDepartures`, staleTime 1h).
 *
 * Returns `[]` (not an error) on any no-match / 4xx / 5xx — fail-soft, so
 * the picker shows its empty state and the user can fall back to Custom.
 */
const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface FlightDepartureOption {
    flightNumber: string | null;
    airline: string | null;
    airlineIata: string | null;
    departAirport: string | null;
    departDate: string | null;
    departTime: string | null;
    arrivalAirport: string | null;
    arrivalAirportName: string | null;
    arrivalDate: string | null;
    arrivalTime: string | null;
    aircraft: string | null;
}

interface FlightDepartureRaw {
    flight_number: string | null;
    airline: string | null;
    airline_iata: string | null;
    depart_airport: string | null;
    depart_date: string | null;
    depart_time: string | null;
    arrival_airport: string | null;
    arrival_airport_name: string | null;
    arrival_date: string | null;
    arrival_time: string | null;
    aircraft: string | null;
}

interface FlightDeparturesResponseRaw {
    items: FlightDepartureRaw[];
}

const toOption = (r: FlightDepartureRaw): FlightDepartureOption => ({
    flightNumber: r.flight_number,
    airline: r.airline,
    airlineIata: r.airline_iata,
    departAirport: r.depart_airport,
    departDate: r.depart_date,
    departTime: r.depart_time,
    arrivalAirport: r.arrival_airport,
    arrivalAirportName: r.arrival_airport_name,
    arrivalDate: r.arrival_date,
    arrivalTime: r.arrival_time,
    aircraft: r.aircraft,
});

export interface SearchFlightDeparturesArgs {
    airport: string;
    date: string;
    /** HH:mm — start of the ≤12h window. Omit to let the backend default
     *  to "00:00". */
    fromTime?: string;
    /** IATA airline code (2-3 letters) — server-side filter. Omit for all
     *  carriers. */
    airline?: string;
    /** Destination airport IATA — server-side filter that keeps only
     *  flights landing there (e.g. EWR → PTY). Omit for all destinations. */
    arrival?: string;
}

export const searchFlightDepartures = async ({
    airport,
    date,
    fromTime,
    airline,
    arrival,
}: SearchFlightDeparturesArgs): Promise<FlightDepartureOption[]> => {
    const params = new URLSearchParams({
        airport: airport.trim().toUpperCase(),
        date,
    });
    if (fromTime) params.set('from_time', fromTime);
    if (airline?.trim()) params.set('airline', airline.trim().toUpperCase());
    if (arrival?.trim()) params.set('arrival', arrival.trim().toUpperCase());
    // Treat any non-OK response as no-result so the picker fails soft and
    // the user can switch to Custom. Network errors throw — React Query's
    // retry: 0 keeps those from looping against the rate-limited provider.
    const resp = await fetch(`${API_BASE}/flights/departures?${params}`);
    if (!resp.ok) return [];
    const body = (await resp.json()) as FlightDeparturesResponseRaw;
    return (body.items ?? []).map(toOption);
};
