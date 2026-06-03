/**
 * Maintenance gate. Reads the public maintenance flag and decides what every
 * visitor sees while the site is "under maintenance":
 *
 *  - mode "full"  → a full-bleed maintenance PAGE (logo + headline + message),
 *    replacing the whole app. Admins and a small allowlist of auth/dashboard
 *    routes are EXEMPT so an admin can always log in and flip it back off.
 *  - mode "banner" → the app stays usable behind a sticky `MaintenanceBanner`.
 *
 * Exempt viewers of a "full" maintenance still get the banner (persistent
 * variant) so they're reminded the site is dark for everyone else.
 *
 * Sits inside `ServerGate`: if the backend is unreachable the status query
 * fails, `data` is undefined, and this gate passes through — `ServerGate`
 * owns the down-backend case.
 */
import { useCallback, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import BuildRoundedIcon from '@mui/icons-material/BuildRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { useMaintenanceStatus, maintenanceKeys } from 'api/hooks/useMaintenance';
import { useUser } from 'context/UserContext';
import { LOGO_IMAGE, MAINTENANCE_MODE } from 'constants';
import MaintenanceBanner from './MaintenanceBanner';
import './index.scss';

interface MaintenanceGateProps {
    children: ReactNode;
}

// Routes an admin must still reach while a "full" block is live — otherwise a
// logged-out admin could never sign in to turn maintenance off.
const EXEMPT_PREFIXES = [
    '/login',
    '/signup',
    '/dashboard',
    '/forgot-password',
    '/reset-password',
];

const isExemptPath = (pathname: string): boolean =>
    EXEMPT_PREFIXES.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`),
    );

const DEFAULT_FULL_MESSAGE =
    'We’re making some improvements to DaTryp. We’ll be back up and running shortly — thanks for your patience!';

const formatUntil = (iso: string | null): string | null => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
};

const MaintenanceFull = ({
    message,
    until,
}: {
    message: string | null;
    until: string | null;
}) => {
    const queryClient = useQueryClient();
    const [isChecking, setIsChecking] = useState(false);

    const handleCheck = useCallback(async () => {
        setIsChecking(true);
        await queryClient.invalidateQueries({
            queryKey: maintenanceKeys.status,
        });
        setIsChecking(false);
    }, [queryClient]);

    const eta = formatUntil(until);

    return (
        <div
            className="maintenance-full"
            role="alert"
            aria-live="assertive"
        >
            <header className="maintenance-full-header">
                <img
                    className="maintenance-full-logo"
                    src={LOGO_IMAGE}
                    alt="DaTryp"
                />
            </header>

            <main className="maintenance-full-body">
                <div className="maintenance-full-content">
                    <span className="maintenance-full-eyebrow">
                        <BuildRoundedIcon
                            fontSize="inherit"
                            aria-hidden="true"
                        />
                        Scheduled maintenance
                    </span>
                    <h1 className="maintenance-full-title">
                        We’ll be right back.
                    </h1>
                    <p className="maintenance-full-message">
                        {message?.trim() || DEFAULT_FULL_MESSAGE}
                    </p>
                    {eta && (
                        <p className="maintenance-full-eta">
                            Expected back by <strong>{eta}</strong>.
                        </p>
                    )}
                    <button
                        type="button"
                        className="maintenance-full-retry"
                        onClick={handleCheck}
                        disabled={isChecking}
                    >
                        <RefreshRoundedIcon
                            className="maintenance-full-retry-icon"
                            fontSize="small"
                        />
                        <span>{isChecking ? 'Checking…' : 'Check again'}</span>
                    </button>
                </div>
            </main>
        </div>
    );
};

const MaintenanceGate = ({ children }: MaintenanceGateProps) => {
    const { data } = useMaintenanceStatus();
    const { isAdmin } = useUser();
    const { pathname } = useLocation();

    if (!data?.active) return <>{children}</>;

    const isFull = data.mode === MAINTENANCE_MODE.FULL;
    const exempt = isAdmin || isExemptPath(pathname);

    if (isFull && !exempt) {
        return (
            <MaintenanceFull message={data.message} until={data.until} />
        );
    }

    // Banner mode (everyone), or full mode seen by an exempt viewer — show a
    // persistent reminder in the latter case so they know it's live.
    return (
        <>
            <MaintenanceBanner
                message={data.message}
                until={data.until}
                persistent={isFull}
            />
            {children}
        </>
    );
};

export default MaintenanceGate;
