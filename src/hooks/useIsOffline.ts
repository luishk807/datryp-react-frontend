/**
 * Reactive online/offline status. Seeds from `navigator.onLine` and tracks
 * the browser's `online`/`offline` events. Shared by OfflineGate (the
 * app-wide banner) and /trip-detail (offline messaging + disabling live-
 * only actions) so the detection logic lives in one place.
 *
 * Caveat (same as the old OfflineGate): iOS Safari can report `onLine:true`
 * while reception is gone. We accept that — the events catch the common
 * cases and the failing live queries surface the rest.
 */
import { useEffect, useState } from 'react';

export const useIsOffline = (): boolean => {
    const [isOffline, setIsOffline] = useState(
        typeof navigator !== 'undefined' && navigator.onLine === false
    );

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOffline;
};
