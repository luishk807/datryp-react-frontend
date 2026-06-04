/**
 * IndexedDB store for trips the user has explicitly downloaded for
 * offline use. This is the data half of the offline-itinerary feature —
 * the service worker (see vite.config.ts) caches the app *shell* and
 * images, while the itinerary JSON lives here.
 *
 * Why IndexedDB and not the Workbox cache: itinerary data is fetched via
 * a GraphQL POST, which the service worker can't cache. So a deliberate
 * "Download for offline" snapshot is written here, keyed by trip id, and
 * `/trip-detail` reads it back when the live query can't reach the network.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ApiItinerary } from 'api/hooks/useItineraries';

const DB_NAME = 'datryp-offline';
const DB_VERSION = 1;
const TRIPS_STORE = 'trips';

/**
 * Bump when the persisted `ApiItinerary` shape changes in a way that an
 * older snapshot can't satisfy. `getOfflineTrip` drops records written
 * under a different schema version so we never render a half-populated
 * stale trip after a deploy.
 */
export const OFFLINE_SCHEMA_VERSION = 1;

export interface OfflineTripRecord {
    tripId: string;
    /** Epoch ms the snapshot was written. Drives the "Saved <when>" label. */
    savedAt: number;
    schemaVersion: number;
    data: ApiItinerary;
}

interface OfflineDB extends DBSchema {
    [TRIPS_STORE]: {
        key: string;
        value: OfflineTripRecord;
    };
}

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null;

const getDb = () => {
    if (!dbPromise) {
        dbPromise = openDB<OfflineDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(TRIPS_STORE)) {
                    db.createObjectStore(TRIPS_STORE, { keyPath: 'tripId' });
                }
            },
        });
    }
    return dbPromise;
};

/** Persist (or replace) a trip snapshot. */
export const saveOfflineTrip = async (data: ApiItinerary): Promise<OfflineTripRecord> => {
    const record: OfflineTripRecord = {
        tripId: data.id,
        savedAt: Date.now(),
        schemaVersion: OFFLINE_SCHEMA_VERSION,
        data,
    };
    const db = await getDb();
    await db.put(TRIPS_STORE, record);
    return record;
};

/**
 * Read a downloaded trip. Returns null when absent or when the stored
 * record was written under an older schema version (the caller should
 * treat that as "not downloaded" and offer a re-download).
 */
export const getOfflineTrip = async (
    tripId: string
): Promise<OfflineTripRecord | null> => {
    const db = await getDb();
    const record = await db.get(TRIPS_STORE, tripId);
    if (!record) return null;
    if (record.schemaVersion !== OFFLINE_SCHEMA_VERSION) {
        await db.delete(TRIPS_STORE, tripId).catch(() => {});
        return null;
    }
    return record;
};

/** Remove a downloaded trip. */
export const deleteOfflineTrip = async (tripId: string): Promise<void> => {
    const db = await getDb();
    await db.delete(TRIPS_STORE, tripId);
};

/** All downloaded trips (for a future "Manage offline trips" surface). */
export const listOfflineTrips = async (): Promise<OfflineTripRecord[]> => {
    const db = await getDb();
    return db.getAll(TRIPS_STORE);
};

/**
 * Collect every image URL referenced by a trip so the caller can warm the
 * service-worker image cache before going offline. De-duplicated; only
 * http(s) URLs (skips data: and blob:).
 */
export const collectTripImageUrls = (data: ApiItinerary): string[] => {
    const urls = new Set<string>();
    const add = (u: string | null | undefined) => {
        if (u && /^https?:\/\//i.test(u)) urls.add(u);
    };
    add(data.image);
    add(data.country?.image);
    for (const day of data.intenaryDates ?? []) {
        add(day.country?.image);
        for (const activity of day.activities ?? []) {
            add(activity.image);
        }
    }
    return [...urls];
};
