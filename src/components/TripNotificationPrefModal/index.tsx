/**
 * Per-trip notification picker (opened from the ⋮ menu on /trip-detail).
 * Lets the current user choose how THEY are notified about this trip —
 * account default / email / sms / both / none — overriding their account
 * preference. SMS options are Pro-gated. In-app alerts always show, so
 * "None" only silences email + SMS.
 */
import { forwardRef, useImperativeHandle, useRef } from 'react';
import classnames from 'classnames';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import {
    useSetTripNotificationPref,
    useTripNotificationPref,
} from 'api/hooks/useTripNotificationPref';
import { NOTIFY_CHANNEL } from 'constants';
import type { NotifyChannel } from 'types';
import './index.scss';

export interface TripNotificationPrefModalProps {
    tripId: string;
    /** SMS channels are a Pro perk — disabled for free users. */
    isPro: boolean;
}

interface ChannelOption {
    value: NotifyChannel | null;
    label: string;
    hint?: string;
    pro?: boolean;
}

const OPTIONS: ChannelOption[] = [
    {
        value: null,
        label: 'Use account default',
        hint: 'Follow your account notification settings.',
    },
    { value: NOTIFY_CHANNEL.EMAIL, label: 'Email only' },
    { value: NOTIFY_CHANNEL.SMS, label: 'SMS only', pro: true },
    { value: NOTIFY_CHANNEL.BOTH, label: 'Email & SMS', pro: true },
    {
        value: NOTIFY_CHANNEL.NONE,
        label: 'None',
        hint: 'Silence email + SMS for this trip (in-app alerts still show).',
    },
];

const TripNotificationPrefModal = forwardRef<
    ModalButtonHandle,
    TripNotificationPrefModalProps
>(({ tripId, isPro }, ref) => {
    const modalRef = useRef<ModalButtonHandle>(null);
    useImperativeHandle(ref, () => ({
        openModel: () => modalRef.current?.openModel(),
        closeModal: () => modalRef.current?.closeModal(),
    }));

    const { data, isLoading } = useTripNotificationPref(tripId);
    const setPref = useSetTripNotificationPref(tripId);
    const current = data?.channel ?? null;

    return (
        <ModalButton
            ref={modalRef}
            title="Notifications for this trip"
            buttonProps={null}
        >
            <div className="trip-notif-pref">
                <p className="trip-notif-pref-intro">
                    Choose how you&rsquo;re notified about this trip. This
                    overrides your account notification settings.
                </p>
                <div className="trip-notif-pref-options">
                    {OPTIONS.map((opt) => {
                        const locked = Boolean(opt.pro) && !isPro;
                        const selected = current === opt.value;
                        return (
                            <button
                                key={String(opt.value)}
                                type="button"
                                className={classnames('trip-notif-pref-option', {
                                    'is-selected': selected,
                                })}
                                disabled={
                                    locked || setPref.isPending || isLoading
                                }
                                onClick={() => setPref.mutate(opt.value)}
                            >
                                <span className="trip-notif-pref-option-text">
                                    <span className="trip-notif-pref-option-label">
                                        {opt.label}
                                        {locked && (
                                            <span className="trip-notif-pref-pro">
                                                Pro
                                            </span>
                                        )}
                                    </span>
                                    {opt.hint && (
                                        <span className="trip-notif-pref-option-hint">
                                            {opt.hint}
                                        </span>
                                    )}
                                </span>
                                {selected && (
                                    <CheckCircleRoundedIcon
                                        className="trip-notif-pref-check"
                                        fontSize="small"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
                {setPref.isError && (
                    <p className="trip-notif-pref-error" role="alert">
                        Couldn&rsquo;t save — try again.
                    </p>
                )}
            </div>
        </ModalButton>
    );
});

TripNotificationPrefModal.displayName = 'TripNotificationPrefModal';

export default TripNotificationPrefModal;
