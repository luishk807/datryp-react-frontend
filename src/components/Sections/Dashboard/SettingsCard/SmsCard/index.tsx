import { useState } from 'react';
import { Snackbar, Switch } from '@mui/material';
import classnames from 'classnames';
import { useSmsSetting, useUpdateSmsSetting } from 'api/hooks/useFeatures';

/**
 * Admin → Settings → "SMS notifications". Global kill-switch for the whole SMS
 * feature. When OFF, no text is ever sent and the app hides every SMS option
 * across the frontend (Account preferences, per-trip channel picker, footer
 * policy link). Flip it ON once the Twilio sending number is validated.
 *
 * Plain on/off (no auto-expiry): unlike "Free everything", leaving SMS on is
 * the intended steady state once it's ready, so there's nothing to auto-revert.
 * Shared `.settings-card-*` / `.dashboard-card` layout classes live in the
 * parent SettingsCard stylesheet.
 */
const SmsCard = () => {
    const { data: status, isLoading } = useSmsSetting();
    const update = useUpdateSmsSetting();
    const [toast, setToast] = useState<string | null>(null);

    const onToggle = async (next: boolean) => {
        try {
            const result = await update.mutateAsync(next);
            if (!next) {
                setToast('SMS notifications OFF — texts are paused.');
            } else if (result.effective) {
                setToast('SMS notifications ON.');
            } else {
                // Enabled, but Twilio creds are missing → still won't send.
                setToast(
                    'SMS switched ON, but Twilio is not configured — texts ' +
                        'stay paused until the server creds are set.',
                );
            }
        } catch (err) {
            setToast(
                err instanceof Error ? err.message : 'Failed to update SMS.',
            );
        }
    };

    return (
        <>
            <section className="dashboard-card">
                <header className="dashboard-card-head">
                    <h2 className="dashboard-card-title">SMS notifications</h2>
                    <p className="dashboard-card-subtitle">
                        Master switch for the whole SMS feature. When OFF, no
                        text is sent and every SMS option is hidden across the
                        app. Turn it ON only once the Twilio sending number is
                        validated and registered.
                    </p>
                </header>

                <div className="settings-card-row">
                    <div className="settings-card-state">
                        <span
                            className={classnames(
                                'settings-card-state-pill',
                                {
                                    'is-active': status?.effective,
                                    'is-inactive': !status?.effective,
                                },
                            )}
                        >
                            {isLoading
                                ? '…'
                                : status?.effective
                                  ? 'LIVE'
                                  : 'OFF'}
                        </span>
                        {status && !status.configured && (
                            <span className="settings-card-state-meta">
                                Twilio not configured
                            </span>
                        )}
                        {status?.enabled && !status.configured && (
                            <span className="settings-card-state-meta">
                                switch ON, waiting on server creds
                            </span>
                        )}
                    </div>
                    <Switch
                        checked={Boolean(status?.enabled)}
                        disabled={isLoading || update.isPending}
                        onChange={(e) => onToggle(e.target.checked)}
                        inputProps={{
                            'aria-label': 'Toggle SMS notifications feature',
                        }}
                    />
                </div>

                <p className="settings-card-hint">
                    Texting also requires Twilio creds on the server
                    (account SID, auth token, and a sender number or
                    messaging-service SID). The switch only controls the
                    feature; it can&rsquo;t send without those set.
                </p>
            </section>

            <Snackbar
                open={Boolean(toast)}
                autoHideDuration={5000}
                onClose={() => setToast(null)}
                message={toast ?? ''}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </>
    );
};

export default SmsCard;
