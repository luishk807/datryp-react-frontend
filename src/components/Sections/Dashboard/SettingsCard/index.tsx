import { useState } from 'react';
import { Snackbar, Switch } from '@mui/material';
import classnames from 'classnames';
import './index.scss';
import {
    useFreeEverything,
    useUpdateFreeEverything,
} from 'api/hooks/useAdmin';

/**
 * Admin → Settings. Houses global app-wide configuration toggles.
 *
 * v1: a single "Free everything" switch. When ON (with a future
 * expiry), every authenticated user is treated as a Pro member,
 * regardless of their actual subscription. Useful for testing /
 * demos / live walkthroughs so visitors don't have to subscribe to
 * evaluate Pro features.
 *
 * The switch is auto-expiring by design. Admin picks a duration
 * (1h / 24h / 7d / forever) when enabling, and the toggle clicks
 * itself OFF the moment the timestamp lapses on the next request.
 * "Forever" is implemented as a very-large duration (100 years) so
 * the same code path handles every case and admins still get a
 * visible expiry to remind them they left it on.
 */
const SettingsCard = () => {
    const { data: status, isLoading } = useFreeEverything();
    const update = useUpdateFreeEverything();
    const [duration, setDuration] = useState<number>(24);
    const [toast, setToast] = useState<string | null>(null);

    const handleToggle = async (next: boolean) => {
        try {
            const result = await update.mutateAsync(
                next
                    ? { enabled: true, durationHours: duration }
                    : { enabled: false },
            );
            if (next) {
                const until = result.until
                    ? new Date(result.until).toLocaleString()
                    : 'unknown';
                setToast(`Free-everything ON until ${until}.`);
            } else {
                setToast('Free-everything OFF.');
            }
        } catch (err) {
            setToast(
                err instanceof Error
                    ? err.message
                    : 'Failed to update toggle.',
            );
        }
    };

    return (
        <>
            <section className="dashboard-card">
                <header className="dashboard-card-head">
                    <h2 className="dashboard-card-title">Free everything</h2>
                    <p className="dashboard-card-subtitle">
                        When ON, every authenticated user is treated as
                        Pro until the expiry timestamp. Use for testing
                        and demos so visitors don&rsquo;t have to
                        subscribe. Auto-reverts on expiry — pick a
                        duration before flipping it on.
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
                                  ? 'ACTIVE'
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
                        onChange={(e) => handleToggle(e.target.checked)}
                        inputProps={{
                            'aria-label': 'Toggle free-everything mode',
                        }}
                    />
                </div>

                <div className="settings-card-duration">
                    <label className="settings-card-duration-label">
                        Duration when enabling
                    </label>
                    <div className="settings-card-duration-options">
                        {[
                            { hours: 1, label: '1 hour' },
                            { hours: 24, label: '24 hours' },
                            { hours: 24 * 7, label: '7 days' },
                            { hours: 24 * 30, label: '30 days (max)' },
                        ].map((opt) => (
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
                        Server caps at 30 days. Toggle re-enables with the
                        new duration if you flip OFF then back ON.
                    </p>
                </div>
            </section>

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

export default SettingsCard;
