/**
 * App-wide offline indicator. Sits at the top of the App tree. Previously
 * this REPLACED the whole app with a full-screen "You're offline" wall —
 * which made a saved itinerary unreachable abroad, the exact moment it's
 * needed most. It now renders the route through and overlays a slim,
 * non-blocking banner so offline-capable pages (notably /trip-detail,
 * which reads a downloaded snapshot from IndexedDB) stay usable. Pages
 * that genuinely need the network still surface their own error states.
 */
import { useEffect, useState, type ReactNode } from 'react';
import WifiOffRoundedIcon from '@mui/icons-material/WifiOffRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useIsOffline } from 'hooks/useIsOffline';
import './index.scss';

interface OfflineGateProps {
    children: ReactNode;
}

const OfflineGate = ({ children }: OfflineGateProps) => {
    const isOffline = useIsOffline();
    const [dismissed, setDismissed] = useState(false);

    // Clear the dismissal when the connection returns so the banner shows
    // again the next time it drops.
    useEffect(() => {
        if (!isOffline) setDismissed(false);
    }, [isOffline]);

    const showBanner = isOffline && !dismissed;

    return (
        <>
            {children}
            {showBanner && (
                <div className="offline-banner" role="status" aria-live="polite">
                    <WifiOffRoundedIcon
                        className="offline-banner-icon"
                        fontSize="small"
                    />
                    <span className="offline-banner-text">
                        You&rsquo;re offline — showing your saved trips. Some
                        live features are paused until you reconnect.
                    </span>
                    <button
                        type="button"
                        className="offline-banner-dismiss"
                        aria-label="Dismiss offline notice"
                        onClick={() => setDismissed(true)}
                    >
                        <CloseRoundedIcon fontSize="small" />
                    </button>
                </div>
            )}
        </>
    );
};

export default OfflineGate;
