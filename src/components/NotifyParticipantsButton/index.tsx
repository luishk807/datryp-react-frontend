import { useRef, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import ButtonIcon from 'components/common/FormFields/ButtonIcon';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import { useNotifyActivity } from 'api/hooks/useNotifyActivity';
import { BUTTON_VARIANT } from 'constants';
import type { NotifyActivityResult } from 'api/tripAlertsApi';
import './index.scss';

export interface NotifyParticipantsButtonProps {
    /** Saved trip UUID from the URL — the notify endpoint is scoped to it. */
    tripId: string;
    /** Activity the alert is about. Numeric on the client; serialized to
     *  the path as-is. */
    activityId: number;
    /** Short label for the activity, surfaced in the confirm modal copy so
     *  the organizer knows exactly which card they're alerting about. */
    activityName?: string;
}

const MESSAGE_MAX = 280;

/** Builds the success-toast copy from the reach summary. Always leads with
 *  the headcount; appends per-channel counts only when non-zero so the
 *  common "everyone's in-app" case stays short. */
const reachSummary = (r: NotifyActivityResult): string => {
    const parts: string[] = [];
    if (r.emails > 0) parts.push(`${r.emails} emails`);
    if (r.sms > 0) parts.push(`${r.sms} texts`);
    const tail = parts.length > 0 ? ` · ${parts.join(' · ')}` : '';
    return `Alerted ${r.recipients} ${r.recipients === 1 ? 'person' : 'people'}${tail}`;
};

/**
 * Organizer-only per-activity alert. Bundles the trigger button, a confirm
 * modal with an optional note, and the result toast. Rendering is gated by
 * the caller (it only mounts this for organizers on a live trip), so this
 * component doesn't re-derive permissions.
 */
const NotifyParticipantsButton = ({
    tripId,
    activityId,
    activityName,
}: NotifyParticipantsButtonProps) => {
    const modalRef = useRef<ModalButtonHandle>(null);
    const [message, setMessage] = useState('');
    const [toast, setToast] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);
    const notify = useNotifyActivity();

    const handleConfirm = async () => {
        try {
            const result = await notify.mutateAsync({
                tripId,
                activityId: String(activityId),
                message: message.trim() || undefined,
            });
            setToast({ type: 'success', text: reachSummary(result) });
            setMessage('');
            modalRef.current?.closeModal();
        } catch (err) {
            setToast({
                type: 'error',
                text:
                    err instanceof Error
                        ? err.message
                        : 'Could not notify participants.',
            });
        }
    };

    return (
        <>
            <ButtonIcon
                type={BUTTON_VARIANT.TEXT}
                Icon={CampaignRoundedIcon}
                iconPosition="start"
                iconProps={{ fontSize: 'small' }}
                title="Notify participants"
                ariaLabel="Notify participants about this activity"
                className="notify-participants-trigger"
                onClick={() => modalRef.current?.openModel()}
            />
            <ModalButton
                ref={modalRef}
                title="Notify participants"
                onClose={() => setMessage('')}
            >
                <div className="notify-participants-modal">
                    <p className="notify-participants-intro">
                        We&rsquo;ll alert the other participants
                        {activityName ? (
                            <>
                                {' about '}
                                <strong>{activityName}</strong>
                            </>
                        ) : (
                            ' about this activity'
                        )}{' '}
                        across in-app, email and text — based on each
                        person&rsquo;s notification settings.
                    </p>
                    <label className="notify-participants-field">
                        <span className="notify-participants-label">
                            Add a note (optional)
                        </span>
                        <textarea
                            className="notify-participants-textarea"
                            value={message}
                            maxLength={MESSAGE_MAX}
                            rows={3}
                            placeholder="e.g. Meet at the lobby 15 min early"
                            onChange={(e) => setMessage(e.target.value)}
                        />
                        <span className="notify-participants-count">
                            {message.length}/{MESSAGE_MAX}
                        </span>
                    </label>
                    <div className="notify-participants-actions">
                        <ButtonCustom
                            type={BUTTON_VARIANT.LINE}
                            label="Cancel"
                            onClick={() => modalRef.current?.closeModal()}
                            disabled={notify.isPending}
                        />
                        <ButtonCustom
                            type={BUTTON_VARIANT.STANDARD}
                            label={
                                notify.isPending ? 'Sending…' : 'Send alert'
                            }
                            onClick={handleConfirm}
                            disabled={notify.isPending}
                        />
                    </div>
                </div>
            </ModalButton>
            <Snackbar
                open={Boolean(toast)}
                autoHideDuration={4500}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                onClose={() => setToast(null)}
            >
                {toast ? (
                    <Alert
                        severity={toast.type}
                        variant="filled"
                        onClose={() => setToast(null)}
                        className="notify-participants-alert"
                    >
                        {toast.text}
                    </Alert>
                ) : undefined}
            </Snackbar>
        </>
    );
};

export default NotifyParticipantsButton;
