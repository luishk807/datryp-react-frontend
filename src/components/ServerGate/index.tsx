/**
 * Full-screen "Site Currently Unavailable" gate. Sits just below
 * `OfflineGate` in the App tree and swaps the entire route output for a
 * friendly downtime page whenever the DaTryp backend is unreachable.
 *
 * How it differs from OfflineGate:
 *  - OfflineGate handles the BROWSER losing its connection (no network at
 *    all) via the `online`/`offline` events.
 *  - ServerGate handles the case where the browser is online but OUR backend
 *    is down — every request fails with a network-level error. That signal
 *    flows through `api/serverStatus` (fed by `pythonGqlClient` + the auth
 *    fetch wrapper), so we don't poll on a timer; we only probe `/health`
 *    once on mount and again when the user taps "Try again".
 *
 * The store auto-clears to "reachable" the moment any request succeeds, so a
 * brief backend blip recovers on its own without the user doing anything.
 */
import {
    useCallback,
    useEffect,
    useState,
    useSyncExternalStore,
    type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import CloudOffRoundedIcon from '@mui/icons-material/CloudOffRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import {
    checkServerHealth,
    getServerStatus,
    subscribeServerStatus,
} from 'api/serverStatus';
import { useIsOffline } from 'hooks/useIsOffline';
import './index.scss';

interface ServerGateProps {
    children: ReactNode;
}

const ServerGate = ({ children }: ServerGateProps) => {
    const queryClient = useQueryClient();
    const status = useSyncExternalStore(
        subscribeServerStatus,
        getServerStatus
    );
    const isOffline = useIsOffline();
    const [isRetrying, setIsRetrying] = useState(false);

    // One boot-time probe so a backend that's already down at first paint
    // trips the gate even before any page query resolves. Cheap GET /health.
    useEffect(() => {
        void checkServerHealth();
    }, []);

    // When the browser comes back online, re-probe so a stale "unreachable"
    // status (set by a failed probe while offline) clears promptly instead
    // of briefly flashing the server-down wall before queries refetch.
    useEffect(() => {
        if (!isOffline) void checkServerHealth();
    }, [isOffline]);

    const handleRetry = useCallback(async () => {
        setIsRetrying(true);
        const ok = await checkServerHealth();
        if (ok) {
            // Server's back — refetch everything that failed while it was
            // down so the user lands on a populated page, not empty shells.
            await queryClient.invalidateQueries();
        }
        setIsRetrying(false);
    }, [queryClient]);

    // When the browser itself is offline, defer to OfflineGate's banner and
    // render the route through — a "Site Unavailable" wall here would just
    // re-block the saved itinerary. This wall is only for the online-but-
    // backend-down case.
    if (status === 'reachable' || isOffline) return <>{children}</>;

    return (
        <div
            className="server-gate-root"
            role="alert"
            aria-live="assertive"
        >
            <div className="server-gate-card">
                <div className="server-gate-icon" aria-hidden="true">
                    <CloudOffRoundedIcon fontSize="inherit" />
                </div>
                <h1 className="server-gate-title">Site Currently Unavailable</h1>
                <p className="server-gate-body">
                    We can't reach our servers right now. This is usually
                    temporary — give it a moment and try again.
                </p>
                <button
                    type="button"
                    className="server-gate-retry"
                    onClick={handleRetry}
                    disabled={isRetrying}
                >
                    <RefreshRoundedIcon
                        className="server-gate-retry-icon"
                        fontSize="small"
                    />
                    <span>{isRetrying ? 'Checking…' : 'Try again'}</span>
                </button>
            </div>
        </div>
    );
};

export default ServerGate;
