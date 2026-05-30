/**
 * REST wrappers for the "home base → nearest departure" endpoints on the
 * Python backend:
 *
 *   GET /me/nearest-airport        → { airport: NearestAirport | null }
 *   GET /me/nearest-train-station  → { station: NearestStation | null }
 *
 * Both return `null` (not a 404) when the user hasn't set a home city
 * yet, so the call sites can treat "no home base" and "no station data
 * for this user's region" identically — render nothing, no error.
 *
 * Train-station ingestion is still pending on the backend; the endpoint
 * is wired up here so the call site exists, but it currently always
 * returns `station: null`.
 */
import { getAuthToken } from './authStorage';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface NearestAirport {
    iataCode: string;
    name: string;
    city: string;
    country: string;
    countryCode: string;
    latitude: number;
    longitude: number;
    distanceKm: number;
}

export interface NearestStation {
    /** Backend-specific code (analogous to IATA for airports). Optional
     *  because the train-station dataset hasn't been finalized — when it
     *  ships the field will always be present. */
    code: string | null;
    name: string;
    city: string;
    country: string;
    countryCode: string;
    latitude: number;
    longitude: number;
    distanceKm: number;
}

interface NearestAirportRaw {
    iata_code: string;
    name: string;
    city: string;
    country: string;
    country_code: string;
    latitude: number;
    longitude: number;
    distance_km: number;
}

interface NearestStationRaw {
    code: string | null;
    name: string;
    city: string;
    country: string;
    country_code: string;
    latitude: number;
    longitude: number;
    distance_km: number;
}

const authHeaders = (): Record<string, string> => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const toAirport = (r: NearestAirportRaw): NearestAirport => ({
    iataCode: r.iata_code,
    name: r.name,
    city: r.city,
    country: r.country,
    countryCode: r.country_code,
    latitude: r.latitude,
    longitude: r.longitude,
    distanceKm: r.distance_km,
});

const toStation = (r: NearestStationRaw): NearestStation => ({
    code: r.code,
    name: r.name,
    city: r.city,
    country: r.country,
    countryCode: r.country_code,
    latitude: r.latitude,
    longitude: r.longitude,
    distanceKm: r.distance_km,
});

export const fetchNearestAirport = async (): Promise<NearestAirport | null> => {
    const resp = await fetch(`${API_BASE}/me/nearest-airport`, {
        headers: authHeaders(),
    });
    if (!resp.ok) {
        throw new Error(
            `/me/nearest-airport ${resp.status} ${resp.statusText}`
        );
    }
    const body = (await resp.json()) as { airport: NearestAirportRaw | null };
    return body.airport ? toAirport(body.airport) : null;
};

/** Generic coord-based airport lookup — "what's the airport closest to
 *  these coordinates" without reference to the caller's home. Used by
 *  the "Start fresh trip from a place result" flow so it can seed the
 *  destination's arrival airport without the FE knowing the airport
 *  code up front. Returns null when no airport in the catalog can be
 *  resolved (rare; mainly mid-ocean coords). Auth-gated server-side. */
export const fetchNearestAirportForCoords = async (
    lat: number,
    lng: number,
): Promise<NearestAirport | null> => {
    const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
    });
    const resp = await fetch(
        `${API_BASE}/airports/nearest?${params}`,
        { headers: authHeaders() },
    );
    if (!resp.ok) {
        throw new Error(
            `/airports/nearest ${resp.status} ${resp.statusText}`,
        );
    }
    const body = (await resp.json()) as { airport: NearestAirportRaw | null };
    return body.airport ? toAirport(body.airport) : null;
};

export const fetchNearestTrainStation = async (): Promise<NearestStation | null> => {
    const resp = await fetch(`${API_BASE}/me/nearest-train-station`, {
        headers: authHeaders(),
    });
    if (!resp.ok) {
        throw new Error(
            `/me/nearest-train-station ${resp.status} ${resp.statusText}`
        );
    }
    const body = (await resp.json()) as { station: NearestStationRaw | null };
    return body.station ? toStation(body.station) : null;
};
