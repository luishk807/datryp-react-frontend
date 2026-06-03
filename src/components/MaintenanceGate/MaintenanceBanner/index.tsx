import { useCallback, useState } from 'react';
import BuildRoundedIcon from '@mui/icons-material/BuildRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import classnames from 'classnames';
import './index.scss';

export interface MaintenanceBannerProps {
    /** Custom copy from the admin. Falls back to a default line. */
    message: string | null;
    /** ISO expiry, rendered as a "back by …" hint when present. */
    until: string | null;
    /** When true (full-mode shown to an exempt admin), the banner is a
     *  persistent, can't-dismiss reminder that the site is blocked for
     *  everyone else. Plain banner-mode is dismissible. */
    persistent?: boolean;
}

const EXEMPT_NOTE =
    'Visitors see a full-page maintenance screen — you’re exempt as an admin.';

const DEFAULT_MESSAGE =
    'We’re performing some maintenance. A few things may be unavailable for a little while.';

const formatUntil = (iso: string | null): string | null => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
};

/**
 * Sticky top warning bar. Sits above the app header (z-index 1200) so it's
 * visible on every route while the site stays fully usable. Dismissal is
 * remembered per `until` window in sessionStorage — a new maintenance window
 * (or a changed message) re-shows it, but it won't nag within one window.
 */
const MaintenanceBanner = ({
    message,
    until,
    persistent = false,
}: MaintenanceBannerProps) => {
    const dismissKey = `maint-banner-dismissed:${until ?? 'none'}`;
    const [dismissed, setDismissed] = useState(
        () => !persistent && sessionStorage.getItem(dismissKey) === '1',
    );

    const handleDismiss = useCallback(() => {
        sessionStorage.setItem(dismissKey, '1');
        setDismissed(true);
    }, [dismissKey]);

    if (dismissed) return null;

    const eta = formatUntil(until);

    return (
        <div
            className={classnames('maintenance-banner', {
                'is-persistent': persistent,
            })}
            role="status"
            aria-live="polite"
        >
            <BuildRoundedIcon
                className="maintenance-banner-icon"
                fontSize="small"
                aria-hidden="true"
            />
            <p className="maintenance-banner-text">
                {persistent && (
                    <span className="maintenance-banner-tag">
                        Maintenance live
                    </span>
                )}
                <span>{message?.trim() || DEFAULT_MESSAGE}</span>
                {eta && (
                    <span className="maintenance-banner-eta">
                        {' '}
                        Expected back by {eta}.
                    </span>
                )}
                {persistent && (
                    <span className="maintenance-banner-note">
                        {' '}
                        {EXEMPT_NOTE}
                    </span>
                )}
            </p>
            {!persistent && (
                <button
                    type="button"
                    className="maintenance-banner-close"
                    onClick={handleDismiss}
                    aria-label="Dismiss maintenance notice"
                >
                    <CloseRoundedIcon fontSize="small" />
                </button>
            )}
        </div>
    );
};

export default MaintenanceBanner;
