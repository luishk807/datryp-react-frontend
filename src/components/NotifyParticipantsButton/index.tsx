import { useMemo, useRef, useState } from 'react';
import { Alert, Checkbox, FormControlLabel, Snackbar } from '@mui/material';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import ButtonIcon from 'components/common/FormFields/ButtonIcon';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import { useNotifyActivity } from 'api/hooks/useNotifyActivity';
import { useUser } from 'context/UserContext';
import { BUTTON_VARIANT } from 'constants';
import type { NotifyActivityResult } from 'api/tripAlertsApi';
import type { Friend } from 'types';
import './index.scss';

export interface NotifyParticipantsButtonProps {
    /** Saved trip UUID from the URL — the notify endpoint is scoped to it. */
    tripId: string;
    /** Backend UUID of the activity the alert is about — the notify endpoint
     *  targets it by UUID (the client's numeric `id` is a hash and 422s). */
    activityId: string;
    /** Short label for the activity, surfaced in the confirm modal copy so
     *  the organizer knows exactly which card they're alerting about. */
    activityName?: string;
    /** Trip members (friends + organizers). The current user is filtered out
     *  here — you don't alert yourself about the thing you flagged. */
    participants: Friend[];
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
    participants,
}: NotifyParticipantsButtonProps) => {
    const modalRef = useRef<ModalButtonHandle>(null);
    const { user } = useUser();
    const [message, setMessage] = useState('');
    const [toast, setToast] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);
    const notify = useNotifyActivity();

    // Notifiable people: every member with a backend id, minus the actor.
    // Entries without `userId` (legacy/mock) can't be individually targeted,
    // so they're not listed — they're still covered by the default "everyone"
    // send when nobody is deselected.
    const candidates = useMemo(
        () =>
            participants.filter(
                (p) => p.userId && p.userId !== user?.id
            ) as (Friend & { userId: string })[],
        [participants, user?.id]
    );

    // Selected recipient userIds. Defaults to everyone; resets each time the
    // modal opens so a prior narrowing doesn't leak into the next alert.
    const [selected, setSelected] = useState<Set<string>>(
        () => new Set(candidates.map((c) => c.userId))
    );

    const resetSelection = () =>
        setSelected(new Set(candidates.map((c) => c.userId)));

    const toggle = (userId: string) =>
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });

    const allSelected =
        candidates.length > 0 && selected.size === candidates.length;
    const toggleAll = () =>
        setSelected(
            allSelected ? new Set() : new Set(candidates.map((c) => c.userId))
        );

    const displayName = (c: Friend) => c.name || c.label || 'Participant';

    const handleConfirm = async () => {
        try {
            const result = await notify.mutateAsync({
                tripId,
                activityId,
                message: message.trim() || undefined,
                // Omit when everyone's selected so the server keeps its
                // fan-out path (and still reaches any unlisted members).
                recipientIds: allSelected ? undefined : Array.from(selected),
            });
            setToast({ type: 'success', text: reachSummary(result) });
            setMessage('');
            resetSelection();
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
                onClick={() => {
                    resetSelection();
                    modalRef.current?.openModel();
                }}
            />
            <ModalButton
                ref={modalRef}
                title="Notify participants"
                onClose={() => {
                    setMessage('');
                    resetSelection();
                }}
            >
                <div className="notify-participants-modal">
                    <p className="notify-participants-intro">
                        We&rsquo;ll alert the people you choose
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
                    {candidates.length > 0 ? (
                        <div className="notify-participants-recipients">
                            <div className="notify-participants-recipients-head">
                                <span className="notify-participants-label">
                                    Who to notify
                                </span>
                                <button
                                    type="button"
                                    className="notify-participants-selectall"
                                    onClick={toggleAll}
                                >
                                    {allSelected ? 'Clear all' : 'Select all'}
                                </button>
                            </div>
                            <div className="notify-participants-list">
                                {candidates.map((c) => (
                                    <FormControlLabel
                                        key={c.userId}
                                        className="notify-participants-row"
                                        control={
                                            <Checkbox
                                                size="small"
                                                checked={selected.has(c.userId)}
                                                onChange={() =>
                                                    toggle(c.userId)
                                                }
                                            />
                                        }
                                        label={displayName(c)}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="notify-participants-empty">
                            No other participants to notify yet.
                        </p>
                    )}
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
                            disabled={notify.isPending || selected.size === 0}
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
