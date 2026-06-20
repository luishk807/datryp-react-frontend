/**
 * Per-trip notification picker (opened from the ⋮ menu on /trip-detail).
 * Lets the current user choose how THEY are notified about this trip —
 * account default / email / sms / both / none — overriding their account
 * preference. SMS options are Pro-gated. In-app alerts always show, so
 * "None" only silences email + SMS.
 */
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import classnames from 'classnames';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import {
    useSetTripNotificationPref,
    useTripNotificationPref,
} from 'api/hooks/useTripNotificationPref';
import { useSmsEnabled } from 'api/hooks/useFeatures';
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
    /** i18n key under `tripDetail.notifPrefs.options` for the label. */
    labelKey: string;
    /** i18n key under `tripDetail.notifPrefs.options` for the hint. */
    hintKey?: string;
    pro?: boolean;
}

const OPTIONS: ChannelOption[] = [
    {
        value: null,
        labelKey: 'defaultLabel',
        hintKey: 'defaultHint',
    },
    { value: NOTIFY_CHANNEL.EMAIL, labelKey: 'emailLabel' },
    { value: NOTIFY_CHANNEL.SMS, labelKey: 'smsLabel', pro: true },
    { value: NOTIFY_CHANNEL.BOTH, labelKey: 'bothLabel', pro: true },
    {
        value: NOTIFY_CHANNEL.NONE,
        labelKey: 'noneLabel',
        hintKey: 'noneHint',
    },
];

const TripNotificationPrefModal = forwardRef<
    ModalButtonHandle,
    TripNotificationPrefModalProps
>(({ tripId, isPro }, ref) => {
    const { t } = useTranslation();
    const modalRef = useRef<ModalButtonHandle>(null);
    useImperativeHandle(ref, () => ({
        openModel: () => modalRef.current?.openModel(),
        closeModal: () => modalRef.current?.closeModal(),
    }));

    const { data, isLoading } = useTripNotificationPref(tripId);
    const setPref = useSetTripNotificationPref(tripId);
    const current = data?.channel ?? null;

    // Hide the SMS / Email-&-SMS channels entirely when the SMS feature is off
    // (admin kill-switch or Twilio not configured). The "None" hint also drops
    // its SMS mention so the copy stays accurate.
    const smsEnabled = useSmsEnabled();
    const options = smsEnabled
        ? OPTIONS
        : OPTIONS.filter(
              (o) =>
                  o.value !== NOTIFY_CHANNEL.SMS &&
                  o.value !== NOTIFY_CHANNEL.BOTH,
          ).map((o) =>
              o.value === NOTIFY_CHANNEL.NONE
                  ? {
                        ...o,
                        hintKey: 'noneHintEmailOnly',
                    }
                  : o,
          );

    return (
        <ModalButton
            ref={modalRef}
            title={t('tripDetail.notifPrefs.title')}
            buttonProps={null}
            containerClassName="modal-full-mobile"
        >
            <div className="trip-notif-pref">
                <p className="trip-notif-pref-intro">
                    {t('tripDetail.notifPrefs.intro')}
                </p>
                <div className="trip-notif-pref-options">
                    {options.map((opt) => {
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
                                        {t(
                                            `tripDetail.notifPrefs.options.${opt.labelKey}`,
                                        )}
                                        {locked && (
                                            <span className="trip-notif-pref-pro">
                                                {t('tripDetail.notifPrefs.pro')}
                                            </span>
                                        )}
                                    </span>
                                    {opt.hintKey && (
                                        <span className="trip-notif-pref-option-hint">
                                            {t(
                                                `tripDetail.notifPrefs.options.${opt.hintKey}`,
                                            )}
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
                        {t('tripDetail.notifPrefs.saveError')}
                    </p>
                )}
            </div>
        </ModalButton>
    );
});

TripNotificationPrefModal.displayName = 'TripNotificationPrefModal';

export default TripNotificationPrefModal;
