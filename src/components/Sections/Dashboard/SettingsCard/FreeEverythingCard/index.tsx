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
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import {
    useFreeEverything,
    useUpdateFreeEverything,
} from 'api/hooks/useAdmin';

/**
 * Admin → Settings → "Free everything". Global override that treats every
 * authenticated user as Pro until an auto-expiring timestamp. Shared layout
 * classes (`.settings-card-*`) live in the parent SettingsCard stylesheet.
 *
 * The switch is auto-expiring by design: admin picks a duration when enabling
 * and the toggle clicks itself OFF once the timestamp lapses on the next
 * request. Both directions go through a confirm dialog before touching the
 * global flag.
 */
const FreeEverythingCard = () => {
    const { data: status, isLoading } = useFreeEverything();
    const update = useUpdateFreeEverything();
    const [duration, setDuration] = useState<number>(24);
    const [toast, setToast] = useState<string | null>(null);
    const [pendingToggle, setPendingToggle] = useState<boolean | null>(null);

    const requestToggle = (next: boolean) => setPendingToggle(next);
    const cancelToggle = () => setPendingToggle(null);

    const confirmToggle = async () => {
        if (pendingToggle === null) return;
        const next = pendingToggle;
        setPendingToggle(null);
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

    const durationLabel = (() => {
        const opt = [
            { hours: 1, label: '1 hour' },
            { hours: 24, label: '24 hours' },
            { hours: 24 * 7, label: '7 days' },
            { hours: 24 * 30, label: '30 days' },
        ].find((o) => o.hours === duration);
        return opt?.label ?? `${duration} hours`;
    })();

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
                        onChange={(e) => requestToggle(e.target.checked)}
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

            <Dialog
                open={pendingToggle !== null}
                onClose={cancelToggle}
                maxWidth="xs"
                fullWidth
                aria-labelledby="free-everything-toggle-dialog-title"
            >
                <DialogTitle id="free-everything-toggle-dialog-title">
                    {pendingToggle
                        ? 'Turn on Free Everything?'
                        : 'Turn off Free Everything?'}
                </DialogTitle>
                <DialogContent>
                    {pendingToggle ? (
                        <DialogContentText component="div">
                            <p>
                                This grants <strong>every authenticated user</strong>{' '}
                                full Pro access for{' '}
                                <strong>{durationLabel}</strong> — including
                                AI trip building, lightbulb suggestions,
                                seasonal picks, monthly best place,
                                holiday suggestions, and unlimited trip
                                creation.
                            </p>
                            <p>
                                Billable AI calls (OpenAI tokens) will be
                                made on behalf of free users while this is
                                on. The toggle auto-reverts on expiry, but
                                you can flip it off sooner from here.
                            </p>
                        </DialogContentText>
                    ) : (
                        <DialogContentText>
                            Every authenticated user will revert to their
                            actual subscription tier on their next
                            request. In-flight requests already serving
                            Pro content will finish normally; subsequent
                            requests follow the new state.
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

export default FreeEverythingCard;
