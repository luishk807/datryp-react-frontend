/**
 * Drives the "Download itinerary offline" affordance on /trip-detail:
 * tracks whether a trip is saved to IndexedDB, downloads a snapshot on
 * demand (warming the image cache as a best-effort side effect), and
 * removes it. The returned `status` feeds the status chip.
 */
import { useCallback, useEffect, useState } from 'react';
import { OFFLINE_STATUS } from 'constants';
import type { OfflineStatus } from 'types';
import type { ApiItinerary } from 'api/hooks/useItineraries';
import {
    collectTripImageUrls,
    deleteOfflineTrip,
    getOfflineTrip,
    saveOfflineTrip,
} from 'offline/tripOfflineStore';

interface UseOfflineTripResult {
    status: OfflineStatus;
    /** Epoch ms the snapshot was last written; null when not downloaded. */
    savedAt: number | null;
    isSaved: boolean;
    isBusy: boolean;
    /** The persisted snapshot, so /trip-detail can render it when the live
     *  query can't reach the network. Null until loaded / when absent. */
    offlineData: ApiItinerary | null;
    /** False until the initial IndexedDB read settles — lets callers hold
     *  off on a "not found" verdict until the snapshot has had a chance
     *  to hydrate on a cold offline load. */
    isHydrated: boolean;
    /** Snapshot the given itinerary for offline use + warm its images. */
    download: (data: ApiItinerary) => Promise<void>;
    /** Drop the offline snapshot. */
    remove: () => Promise<void>;
}

/**
 * Force the browser (and thus the service worker's image cache) to fetch
 * each image as a real `destination: 'image'` request — which is what the
 * Workbox CacheFirst rule matches. Best-effort: a failed/slow image never
 * blocks the download. Batched so a big trip doesn't open 50 sockets.
 */
const warmImageCache = async (urls: string[]): Promise<void> => {
    if (typeof window === 'undefined' || !('Image' in window)) return;
    const BATCH = 6;
    const PER_IMAGE_TIMEOUT = 8000;
    const preload = (url: string) =>
        new Promise<void>((resolve) => {
            const img = new Image();
            const done = () => resolve();
            const timer = window.setTimeout(done, PER_IMAGE_TIMEOUT);
            img.onload = () => {
                window.clearTimeout(timer);
                done();
            };
            img.onerror = () => {
                window.clearTimeout(timer);
                done();
            };
            img.src = url;
        });
    for (let i = 0; i < urls.length; i += BATCH) {
        await Promise.all(urls.slice(i, i + BATCH).map(preload));
    }
};

export const useOfflineTrip = (tripId: string | null | undefined): UseOfflineTripResult => {
    const [status, setStatus] = useState<OfflineStatus>(OFFLINE_STATUS.NOT_DOWNLOADED);
    const [savedAt, setSavedAt] = useState<number | null>(null);
    const [offlineData, setOfflineData] = useState<ApiItinerary | null>(null);
    const [isHydrated, setIsHydrated] = useState(false);

    // Seed from IndexedDB whenever the trip changes.
    useEffect(() => {
        let cancelled = false;
        setIsHydrated(false);
        if (!tripId) {
            setStatus(OFFLINE_STATUS.NOT_DOWNLOADED);
            setSavedAt(null);
            setOfflineData(null);
            setIsHydrated(true);
            return;
        }
        getOfflineTrip(tripId)
            .then((record) => {
                if (cancelled) return;
                if (record) {
                    setStatus(OFFLINE_STATUS.SAVED);
                    setSavedAt(record.savedAt);
                    setOfflineData(record.data);
                } else {
                    setStatus(OFFLINE_STATUS.NOT_DOWNLOADED);
                    setSavedAt(null);
                    setOfflineData(null);
                }
            })
            .catch(() => {
                if (!cancelled) setStatus(OFFLINE_STATUS.ERROR);
            })
            .finally(() => {
                if (!cancelled) setIsHydrated(true);
            });
        return () => {
            cancelled = true;
        };
    }, [tripId]);

    const download = useCallback(async (data: ApiItinerary) => {
        setStatus(OFFLINE_STATUS.SYNCING);
        try {
            const record = await saveOfflineTrip(data);
            // Warm images after the JSON is safely persisted — the trip is
            // already usable offline (text/structure) even if images lag
            // or fail, which matches the "images best-effort" scope.
            await warmImageCache(collectTripImageUrls(data));
            setSavedAt(record.savedAt);
            setOfflineData(record.data);
            setStatus(OFFLINE_STATUS.SAVED);
        } catch {
            setStatus(OFFLINE_STATUS.ERROR);
        }
    }, []);

    const remove = useCallback(async () => {
        if (!tripId) return;
        try {
            await deleteOfflineTrip(tripId);
        } finally {
            setStatus(OFFLINE_STATUS.NOT_DOWNLOADED);
            setSavedAt(null);
            setOfflineData(null);
        }
    }, [tripId]);

    return {
        status,
        savedAt,
        offlineData,
        isHydrated,
        isSaved: status === OFFLINE_STATUS.SAVED,
        isBusy: status === OFFLINE_STATUS.SYNCING,
        download,
        remove,
    };
};
