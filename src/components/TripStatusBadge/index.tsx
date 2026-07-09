import { useMemo, useRef, useState } from 'react';
import classnames from 'classnames';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Snackbar,
} from '@mui/material';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import './index.scss';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import ConfirmEmptyDaysModal, {
    type ConfirmEmptyDaysModalHandle,
} from 'components/ConfirmEmptyDaysModal';
import ReadinessChecklist from 'components/ReadinessChecklist';
import { useTripStatuses } from 'api/hooks/useLookups';
import { TRIP_STATUS } from 'constants';
import { findEmptyDays } from 'utils/emptyDays';
import type { TFunction } from 'i18next';
import type { TripReadiness } from 'utils';
import type { Activity, ActivityStatus, TripState, TripStatus } from 'types';

interface TripStatusBadgeProps {
    data: TripState;
    /** Persists the new trip status. Awaited so the dialog can show
     *  "Saving…" until the parent's mutation settles. `confirmAllActivities`
     *  (Planning → Confirmed only) asks the parent to flip every activity to
     *  Confirmed in the SAME save. */
    onStatusChange: (
        status: TripStatus,
        opts?: { confirmAllActivities?: boolean }
    ) => void | Promise<void>;
    isSaving?: boolean;
    /** Hides the button entirely. Used for non-organizers or while
     *  another save is in flight. */
    disabled?: boolean;
    className?: string;
    /** Fires when the user picks "Update trip dates" from the empty-day
     *  confirm modal. Parent should hand off to the trip-edit flow. When
     *  omitted, the modal surfaces an inline hint instead so the user
     *  knows where to look. */
    onEditTripDates?: () => void;
    /** Deterministic readiness (percent + checklist). When supplied on a
     *  Planning trip, the Confirm button shows "N% ready" and the
     *  "some activities aren't confirmed" modal appends the checklist so the
     *  organizer sees what's still missing before they commit. */
    readiness?: TripReadiness;
    /** Past-due mode — the trip is still Planning but its dates have passed.
     *  The Planning→Confirmed promotion is UNCHANGED (the backend then
     *  auto-completes the past-due trip + its activities on the next read), but
     *  the button + dialog copy switch from "Confirm trip" to "Complete trip"
     *  and the "N% ready" suffix is dropped — completing a trip that already
     *  happened isn't about readiness. */
    pastDue?: boolean;
}

/** Cap the names listed in the "some activities aren't confirmed" dialog so a
 *  long itinerary doesn't blow out the dialog height — the rest collapse into
 *  a "+N more" row. */
const UNCONFIRMED_PREVIEW_CAP = 6;

const deriveStatusName = (raw: TripState['status']): string => {
    if (raw && typeof raw === 'object' && raw.name) return raw.name;
    return TRIP_STATUS.PLANNING;
};

const isActivityConfirmed = (status: Activity['status']): boolean => {
    if (status && typeof status === 'object') {
        return (status as ActivityStatus).name === TRIP_STATUS.CONFIRMED;
    }
    return false;
};

const findUnconfirmedActivities = (
    state: TripState,
    t: TFunction
): string[] => {
    const names: string[] = [];
    for (const dest of state.destinations ?? []) {
        for (const day of dest.itinerary ?? []) {
            for (const a of day.activities ?? []) {
                if (!isActivityConfirmed(a.status)) {
                    names.push(
                        a.name?.trim() ||
                            t('tripCard.activityOnDate', { date: day.date })
                    );
                }
            }
        }
    }
    return names;
};

/**
 * "Promote trip" button. Label + target are derived from the current
 * status:
 *
 * - Planning   → "Confirm trip"   (saves as Confirmed; gated by all
 *                                  activities being Confirmed first)
 * - Confirmed  → "Mark complete"  (saves as Completed)
 * - Else       → renders nothing.
 *
 * Clicking the button:
 *   1. Validates (Planning → Confirmed needs every activity Confirmed)
 *   2. On pass, opens a confirm Dialog with action-specific copy
 *   3. On confirm, calls `onStatusChange` and the parent owns the save
 *
 * Validation failures surface inline below the button — the dialog only
 * opens when the action can actually succeed.
 */
export const TripStatusBadge = ({
    data,
    onStatusChange,
    isSaving = false,
    disabled = false,
    className,
    onEditTripDates,
    readiness,
    pastDue = false,
}: TripStatusBadgeProps) => {
    const { t } = useTranslation();
    const { data: tripStatuses = [] } = useTripStatuses();
    const [error, setError] = useState<string | null>(null);
    const [hint, setHint] = useState<string | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    // "Some activities aren't confirmed" prompt — shown when the organizer
    // confirms the trip with activities still in Planning, offering to
    // confirm them all as part of confirming the trip.
    const [confirmAllOpen, setConfirmAllOpen] = useState(false);
    const [unconfirmedNames, setUnconfirmedNames] = useState<string[]>([]);
    // Threaded into the save so the empty-days bridge (which sits between the
    // prompt and the actual promote) knows to confirm-all too.
    const [confirmAllActivities, setConfirmAllActivities] = useState(false);
    const emptyDaysModalRef = useRef<ConfirmEmptyDaysModalHandle>(null);
    // Cached list of empty-day ISO strings for the current "Confirm trip"
    // attempt. Captured at the moment the user clicks promote so the
    // modal body doesn't flicker if the trip changes underneath it.
    const [pendingEmptyDays, setPendingEmptyDays] = useState<string[]>([]);

    const statusName = deriveStatusName(data.status);

    const target = useMemo(() => {
        if (statusName === TRIP_STATUS.PLANNING) {
            return {
                next: tripStatuses.find((s) => s.name === TRIP_STATUS.CONFIRMED),
                label: pastDue
                    ? t('tripCard.completeTrip')
                    : t('tripCard.confirmTrip'),
                Icon: pastDue
                    ? CheckCircleRoundedIcon
                    : CheckCircleOutlineRoundedIcon,
                requiresActivitiesConfirmed: true,
                dialogTitle: pastDue
                    ? t('tripCard.completePastDueDialogTitle')
                    : t('tripCard.confirmDialogTitle'),
                dialogBody: pastDue
                    ? t('tripCard.completePastDueDialogBody')
                    : t('tripCard.confirmDialogBody'),
                confirmLabel: pastDue
                    ? t('tripCard.completeTrip')
                    : t('tripCard.confirmTrip'),
            };
        }
        if (statusName === TRIP_STATUS.CONFIRMED) {
            return {
                next: tripStatuses.find((s) => s.name === TRIP_STATUS.COMPLETED),
                label: t('tripCard.markComplete'),
                Icon: CheckCircleRoundedIcon,
                requiresActivitiesConfirmed: false,
                dialogTitle: t('tripCard.completeDialogTitle'),
                dialogBody: t('tripCard.completeDialogBody'),
                benefits: [
                    t('tripCard.completeBenefits.atlas'),
                    t('tripCard.completeBenefits.visited'),
                    t('tripCard.completeBenefits.reviews'),
                ],
                confirmLabel: t('tripCard.markComplete'),
            };
        }
        return null;
    }, [statusName, tripStatuses, t, pastDue]);

    if (disabled || !target) return null;

    /** Empty-day warning + promote. Shared by the all-confirmed path and the
     *  confirm-all path; `confirmAll` is threaded so the eventual save flips
     *  every activity to Confirmed in one go. When `confirmAll` is true the
     *  prompt already confirmed intent, so it saves directly; otherwise it
     *  opens the standard "Confirm this trip?" dialog. Either path still
     *  diverts to the empty-days warning first. */
    const promote = async (confirmAll: boolean) => {
        setConfirmAllActivities(confirmAll);
        // Planning → Confirmed only: warn when day blocks would disappear
        // from the itinerary view + exports because they have no activities.
        const emptyDays = target.requiresActivitiesConfirmed
            ? findEmptyDays(data)
            : [];
        if (emptyDays.length) {
            setError(null);
            setConfirmAllOpen(false);
            setPendingEmptyDays(emptyDays);
            emptyDaysModalRef.current?.openModel();
            return;
        }
        setError(null);
        if (confirmAll) {
            try {
                await onStatusChange(target.next as TripStatus, {
                    confirmAllActivities: true,
                });
                setConfirmAllOpen(false);
            } catch {
                // Parent toasts the error; keep the prompt open to retry.
            }
            return;
        }
        setConfirmOpen(true);
    };

    const handleClick = () => {
        if (!target.next) {
            setError(t('tripCard.resolveStatusError'));
            return;
        }
        if (target.requiresActivitiesConfirmed) {
            const unconfirmed = findUnconfirmedActivities(data, t);
            if (unconfirmed.length) {
                // Don't block — offer to confirm them all as part of
                // confirming the trip (this button only renders for
                // organizers, so the action is inherently organizer-only).
                setError(null);
                setUnconfirmedNames(unconfirmed);
                setConfirmAllOpen(true);
                return;
            }
        }
        void promote(false);
    };

    /** Primary action of the "some activities aren't confirmed" prompt. */
    const handleConfirmAll = () => {
        void promote(true);
    };

    const handleEmptyDaysConfirm = async () => {
        if (!target?.next) return;
        emptyDaysModalRef.current?.closeModal();
        try {
            await onStatusChange(target.next as TripStatus, {
                confirmAllActivities,
            });
            setConfirmAllActivities(false);
        } catch {
            // Parent surfaces save errors via its own toast.
        }
    };

    const handleEmptyDaysFillIn = () => {
        emptyDaysModalRef.current?.closeModal();
        setConfirmAllActivities(false);
    };

    const handleEmptyDaysEditDates = () => {
        emptyDaysModalRef.current?.closeModal();
        setConfirmAllActivities(false);
        if (onEditTripDates) {
            onEditTripDates();
            return;
        }
        // No handoff wired by the parent — point the user at the Edit
        // Trip button so they can shorten the date range manually.
        setHint(t('tripCard.editDatesHint'));
    };

    const handleConfirm = async () => {
        if (!target.next) return;
        try {
            await onStatusChange(target.next as TripStatus);
            setConfirmOpen(false);
        } catch {
            // Parent surfaces save errors; keep dialog open so the user
            // can retry or close.
        }
    };

    const handleClose = () => {
        if (isSaving) return;
        setConfirmOpen(false);
        setConfirmAllActivities(false);
    };

    const handleConfirmAllClose = () => {
        if (isSaving) return;
        setConfirmAllOpen(false);
    };

    const { label, Icon, dialogTitle, dialogBody, confirmLabel } = target;
    // Only the "Mark complete" target carries the benefits list (what
    // completing unlocks); the `in` guard narrows it without forcing the
    // Planning target to declare an empty one.
    const benefits = "benefits" in target ? target.benefits : undefined;
    // Only the Planning → Confirmed button surfaces readiness; "Mark complete"
    // has no checklist behind it. Past-due "Complete trip" drops it too —
    // a trip that already happened isn't graded on how "ready" it is.
    const showReady =
        statusName === TRIP_STATUS.PLANNING && readiness != null && !pastDue;

    return (
        <span className={classnames('trip-status-badge-wrapper', className)}>
            <ButtonCustom
                type="standard"
                capitalizeType="none"
                className="trip-status-badge"
                onClick={handleClick}
                disabled={isSaving}
            >
                <Icon className="trip-status-badge-icon" />
                <span className="trip-status-badge-text">
                    <span className="trip-status-badge-label">{label}</span>
                    {showReady && (
                        <span className="trip-status-badge-ready">
                            {t('tripCard.percentReady', {
                                pct: readiness.percent,
                            })}
                        </span>
                    )}
                </span>
            </ButtonCustom>
            <Snackbar
                open={!!error}
                autoHideDuration={6000}
                onClose={() => setError(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                sx={{ zIndex: 1500 }}
            >
                <Alert
                    severity="warning"
                    variant="filled"
                    onClose={() => setError(null)}
                    sx={{ maxWidth: 560, width: '100%' }}
                >
                    {error}
                </Alert>
            </Snackbar>
            <Snackbar
                open={!!hint}
                autoHideDuration={4000}
                onClose={() => setHint(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                sx={{ zIndex: 1500 }}
            >
                <Alert
                    severity="info"
                    variant="filled"
                    onClose={() => setHint(null)}
                    sx={{ maxWidth: 560, width: '100%' }}
                >
                    {hint}
                </Alert>
            </Snackbar>

            <ConfirmEmptyDaysModal
                ref={emptyDaysModalRef}
                emptyDates={pendingEmptyDays}
                onConfirm={handleEmptyDaysConfirm}
                onFillIn={handleEmptyDaysFillIn}
                onEditDates={handleEmptyDaysEditDates}
                isSaving={isSaving}
            />

            <Dialog
                open={confirmAllOpen}
                onClose={handleConfirmAllClose}
                maxWidth="xs"
                fullWidth
                className="confirm-all-dialog"
                aria-labelledby="confirm-all-dialog-title"
            >
                <DialogTitle id="confirm-all-dialog-title" className="confirm-all-title">
                    <WarningAmberRoundedIcon className="confirm-all-title-icon" />
                    {pastDue
                        ? t('tripCard.completePastDueTitle')
                        : t('tripCard.someUnconfirmedTitle')}
                </DialogTitle>
                <DialogContent>
                    <p className="confirm-all-intro">
                        {t('tripCard.someUnconfirmedIntro', {
                            count: unconfirmedNames.length,
                        })}
                    </p>
                    <ul className="confirm-all-list">
                        {unconfirmedNames
                            .slice(0, UNCONFIRMED_PREVIEW_CAP)
                            .map((name, i) => (
                                <li key={`${name}-${i}`}>{name}</li>
                            ))}
                        {unconfirmedNames.length > UNCONFIRMED_PREVIEW_CAP && (
                            <li className="confirm-all-list-more">
                                {t('tripCard.moreCount', {
                                    count:
                                        unconfirmedNames.length -
                                        UNCONFIRMED_PREVIEW_CAP,
                                })}
                            </li>
                        )}
                    </ul>
                    <p className="confirm-all-note">
                        {pastDue
                            ? t('tripCard.completePastDueNote')
                            : t('tripCard.someUnconfirmedNote')}
                    </p>
                    {readiness && (
                        <div className="confirm-all-readiness">
                            <p className="confirm-all-readiness-head">
                                {t('tripCard.readinessHead', {
                                    pct: readiness.percent,
                                })}
                            </p>
                            <ReadinessChecklist
                                checks={readiness.checks}
                                freeDays={readiness.freeDays}
                            />
                        </div>
                    )}
                </DialogContent>
                <DialogActions>
                    <ButtonCustom
                        type="line"
                        capitalizeType="uppercase"
                        label={t('tripCard.cancel')}
                        onClick={handleConfirmAllClose}
                        disabled={isSaving}
                    />
                    <ButtonCustom
                        type="standard"
                        capitalizeType="uppercase"
                        label={
                            isSaving
                                ? t('tripCard.saving')
                                : pastDue
                                  ? t('tripCard.completeAll')
                                  : t('tripCard.confirmAll')
                        }
                        onClick={handleConfirmAll}
                        disabled={isSaving}
                    />
                </DialogActions>
            </Dialog>

            <Dialog
                open={confirmOpen}
                onClose={handleClose}
                maxWidth="xs"
                fullWidth
                aria-labelledby="trip-status-confirm-dialog-title"
            >
                <DialogTitle id="trip-status-confirm-dialog-title">{dialogTitle}</DialogTitle>
                <DialogContent>
                    <p>{dialogBody}</p>
                    {benefits && benefits.length > 0 && (
                        <ul className="trip-status-benefits">
                            {benefits.map((b) => (
                                <li key={b}>{b}</li>
                            ))}
                        </ul>
                    )}
                </DialogContent>
                <DialogActions>
                    <ButtonCustom
                        type="line"
                        capitalizeType="uppercase"
                        label={t('tripCard.cancel')}
                        onClick={handleClose}
                        disabled={isSaving}
                    />
                    <ButtonCustom
                        type="standard"
                        capitalizeType="uppercase"
                        label={isSaving ? t('tripCard.saving') : confirmLabel}
                        onClick={handleConfirm}
                        disabled={isSaving}
                    />
                </DialogActions>
            </Dialog>
        </span>
    );
};

export default TripStatusBadge;
