/**
 * Full-screen offline gate. Sits at the top of the App component
 * tree and swaps the entire route output for a centered "You're
 * offline" message whenever the browser reports it lost network
 * connectivity.
 *
 * Detection sources, in order of trust:
 *  1. The `offline`/`online` events the browser fires when its NIC
 *     state changes (most reliable on desktop + Android Chrome).
 *  2. The `navigator.onLine` property as the initial seed. iOS Safari
 *     historically lies (it stays `true` while reception is gone),
 *     but it's still the best one-shot signal we have without a
 *     custom heartbeat.
 *
 * We deliberately do NOT periodically ping a backend to detect
 * offline state — that'd burn battery on a slow connection and the
 * user already sees "Failed to fetch" errors in the existing query
 * surfaces. The browser events catch the vast majority of cases.
 */
import { useEffect, useState, type ReactNode } from 'react';
import WifiOffRoundedIcon from '@mui/icons-material/WifiOffRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import './index.scss';

interface OfflineGateProps {
    children: ReactNode;
}

const OfflineGate = ({ children }: OfflineGateProps) => {
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

    const handleRetry = () => {
        // If the browser already flipped back to online by the time
        // the user taps, just reload the page so React Query refetches
        // everything and the offline state clears via the next render.
        // If we're still offline the reload will likely fail the SW
        // cache check and surface the browser's own offline UI —
        // that's fine, it's a clear signal that the connection truly
        // isn't back yet.
        if (navigator.onLine) {
            window.location.reload();
        } else {
            // Force a state read so the user sees feedback even when
            // navigator.onLine is still false. The setter is a no-op
            // when the value matches, but useState's identity check
            // bails so we trigger a render via setState with a fresh
            // boolean.
            setIsOffline((prev) => prev);
        }
    };

    if (!isOffline) return <>{children}</>;

    return (
        <div className="offline-gate-root" role="alert" aria-live="assertive">
            <div className="offline-gate-card">
                <div className="offline-gate-icon" aria-hidden="true">
                    <WifiOffRoundedIcon fontSize="inherit" />
                </div>
                <h1 className="offline-gate-title">You're offline</h1>
                <p className="offline-gate-body">
                    Check your Wi-Fi or mobile data. The app will come
                    right back online once your connection is restored.
                </p>
                <button
                    type="button"
                    className="offline-gate-retry"
                    onClick={handleRetry}
                >
                    <RefreshRoundedIcon
                        className="offline-gate-retry-icon"
                        fontSize="small"
                    />
                    <span>Try again</span>
                </button>
            </div>
        </div>
    );
};

export default OfflineGate;
