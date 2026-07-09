import { useState } from 'react';
import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Snackbar,
    Switch,
} from '@mui/material';
import classnames from 'classnames';
import './index.scss';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import {
    useMaintenanceSetting,
    useUpdateMaintenance,
} from 'api/hooks/useMaintenance';
import { MAINTENANCE_MODE } from 'constants';
import type { MaintenanceMode } from 'types';

/**
 * Admin → Settings → "Maintenance mode". Flips the site into maintenance and
 * picks how users are notified:
 *  - "banner": a sticky warning bar; the site stays usable.
 *  - "full":  a full-page block (admins + auth routes stay reachable).
 *
 * Same auto-expiring shape as Free-everything — admin picks a duration and the
 * window clicks itself off when the timestamp lapses. A confirm dialog gates
 * turning it on (it's user-facing) so it's never a one-click accident.
 */
const DURATIONS = [
    { hours: 1, label: '1 hour' },
    { hours: 4, label: '4 hours' },
    { hours: 24, label: '24 hours' },
    { hours: 24 * 7, label: '7 days (max)' },
] as const;

const MESSAGE_MAX = 280;

const MODE_OPTIONS: { value: MaintenanceMode; label: string; hint: string }[] = [
    {
        value: MAINTENANCE_MODE.BANNER,
        label: 'Warning banner',
        hint: 'Site stays usable behind a sticky notice. Best while investigating an issue.',
    },
    {
        value: MAINTENANCE_MODE.FULL,
        label: 'Full-page block',
        hint: 'Replaces the whole app with a maintenance page. Admins stay exempt.',
    },
];

const MaintenanceCard = () => {
    const { data: status, isLoading } = useMaintenanceSetting();
    const update = useUpdateMaintenance();

    const [mode, setMode] = useState<MaintenanceMode>(MAINTENANCE_MODE.BANNER);
    const [message, setMessage] = useState('');
    const [duration, setDuration] = useState<number>(1);
    const [toast, setToast] = useState<string | null>(null);
    const [pendingToggle, setPendingToggle] = useState<boolean | null>(null);

    // Seed the editor from the live setting the first time it loads so an
    // admin reopening the page sees the current mode/message, not blanks.
    const [hydrated, setHydrated] = useState(false);
    if (!hydrated && status) {
        setHydrated(true);
        setMode(status.mode);
        if (status.message) setMessage(status.message);
    }

    const requestToggle = (next: boolean) => setPendingToggle(next);
    const cancelToggle = () => setPendingToggle(null);

    const confirmToggle = async () => {
        if (pendingToggle === null) return;
        const next = pendingToggle;
        setPendingToggle(null);
        try {
            const result = await update.mutateAsync(
                next
                    ? {
                          enabled: true,
                          mode,
                          message: message.trim() || null,
                          durationHours: duration,
                      }
                    : { enabled: false },
            );
            if (next) {
                const until = result.until
                    ? new Date(result.until).toLocaleString()
                    : 'unknown';
                setToast(`Maintenance ON (${result.mode}) until ${until}.`);
            } else {
                setToast('Maintenance OFF.');
            }
        } catch (err) {
            setToast(
                err instanceof Error
                    ? err.message
                    : 'Failed to update maintenance.',
            );
        }
    };

    const durationLabel =
        DURATIONS.find((o) => o.hours === duration)?.label ??
        `${duration} hours`;

    return (
        <>
            <section className="dashboard-card">
                <header className="dashboard-card-head">
                    <h2 className="dashboard-card-title">Maintenance mode</h2>
                    <p className="dashboard-card-subtitle">
                        Notify users that the site is under maintenance. Pick a
                        notification style, write an optional message, and set a
                        duration — it auto-reverts when the window lapses.
                    </p>
                </header>

                <div className="settings-card-row">
                    <div className="settings-card-state">
                        <span
                            className={classnames(
                                'settings-card-state-pill',
                                {
                                    'is-active': status?.active,
                                    'is-inactive': !status?.active,
                                },
                            )}
                        >
                            {isLoading
                                ? '…'
                                : status?.active
                                  ? `ON · ${status.mode}`
                                  : 'OFF'}
                        </span>
                        {status?.until && (
                            <span className="settings-card-state-meta">
                                {status.active ? 'until' : 'last set'}{' '}
                                {new Date(status.until).toLocaleString()}
                            </span>
                        )}
                    </div>
                    <Switch
                        checked={Boolean(status?.active)}
                        disabled={isLoading || update.isPending}
                        onChange={(e) => requestToggle(e.target.checked)}
                        inputProps={{
                            'aria-label': 'Toggle maintenance mode',
                        }}
                    />
                </div>

                <div className="maintenance-card-field">
                    <label className="settings-card-duration-label">
                        Notification style
                    </label>
                    <div className="maintenance-card-modes">
                        {MODE_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                className={classnames(
                                    'maintenance-card-mode',
                                    { 'is-selected': mode === opt.value },
                                )}
                                onClick={() => setMode(opt.value)}
                                disabled={update.isPending}
                                aria-pressed={mode === opt.value}
                            >
                                <span className="maintenance-card-mode-label">
                                    {opt.label}
                                </span>
                                <span className="maintenance-card-mode-hint">
                                    {opt.hint}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="maintenance-card-field">
                    <label
                        className="settings-card-duration-label"
                        htmlFor="maintenance-message"
                    >
                        Message (optional)
                    </label>
                    <textarea
                        id="maintenance-message"
                        className="maintenance-card-message"
                        value={message}
                        maxLength={MESSAGE_MAX}
                        rows={2}
                        placeholder="e.g. We’re investigating an issue with trip loading and will be back shortly."
                        onChange={(e) => setMessage(e.target.value)}
                        disabled={update.isPending}
                    />
                    <p className="settings-card-hint">
                        {message.length}/{MESSAGE_MAX}. Leave blank to use the
                        default copy.
                    </p>
                </div>

                <div className="settings-card-duration">
                    <label className="settings-card-duration-label">
                        Duration when enabling
                    </label>
                    <div className="settings-card-duration-options">
                        {DURATIONS.map((opt) => (
                            <button
                                key={opt.hours}
                                type="button"
                                className={classnames(
                                    'settings-card-duration-chip',
                                    { 'is-selected': duration === opt.hours },
                                )}
                                onClick={() => setDuration(opt.hours)}
                                disabled={update.isPending}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    <p className="settings-card-hint">
                        Server caps at 7 days. Re-enable with new settings if
                        you flip OFF then back ON.
                    </p>
                </div>
            </section>

            <Dialog
                open={pendingToggle !== null}
                onClose={cancelToggle}
                maxWidth="xs"
                fullWidth
                aria-labelledby="maintenance-toggle-dialog-title"
            >
                <DialogTitle id="maintenance-toggle-dialog-title">
                    {pendingToggle
                        ? 'Turn on Maintenance mode?'
                        : 'Turn off Maintenance mode?'}
                </DialogTitle>
                <DialogContent>
                    {pendingToggle ? (
                        <DialogContentText component="div">
                            {mode === MAINTENANCE_MODE.FULL ? (
                                <p>
                                    Every non-admin visitor will see a{' '}
                                    <strong>full-page maintenance screen</strong>{' '}
                                    for <strong>{durationLabel}</strong>. The
                                    app is blocked for them until you turn this
                                    off or it expires. Admins and the login
                                    page stay reachable.
                                </p>
                            ) : (
                                <p>
                                    A <strong>warning banner</strong> will show
                                    on every page for{' '}
                                    <strong>{durationLabel}</strong>. The site
                                    stays fully usable — users are just warned.
                                </p>
                            )}
                        </DialogContentText>
                    ) : (
                        <DialogContentText>
                            The maintenance notice clears for all users on
                            their next request (within a few seconds).
                        </DialogContentText>
                    )}
                </DialogContent>
                <DialogActions>
                    <ButtonCustom
                        type="line"
                        capitalizeType="uppercase"
                        label="Cancel"
                        onClick={cancelToggle}
                        disabled={update.isPending}
                    />
                    <ButtonCustom
                        type="standard"
                        capitalizeType="uppercase"
                        label={
                            update.isPending
                                ? 'Saving…'
                                : pendingToggle
                                  ? `Turn ON for ${durationLabel}`
                                  : 'Turn OFF'
                        }
                        onClick={confirmToggle}
                        disabled={update.isPending}
                    />
                </DialogActions>
            </Dialog>

            <Snackbar
                open={Boolean(toast)}
                autoHideDuration={4000}
                onClose={() => setToast(null)}
                message={toast ?? ''}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </>
    );
};

export default MaintenanceCard;
