import { useMemo, useState } from 'react';
import classnames from 'classnames';
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
import './index.scss';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import { useTripStatuses } from 'api/hooks/useLookups';
import { TRIP_STATUS } from 'constants';
import type { Activity, ActivityStatus, TripState, TripStatus } from 'types';

interface TripStatusBadgeProps {
    data: TripState;
    /** Persists the new trip status. Awaited so the dialog can show
     *  "Saving…" until the parent's mutation settles. */
    onStatusChange: (status: TripStatus) => void | Promise<void>;
    isSaving?: boolean;
    /** Hides the button entirely. Used for non-organizers or while
     *  another save is in flight. */
    disabled?: boolean;
    className?: string;
}

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

const findUnconfirmedActivities = (state: TripState): string[] => {
    const names: string[] = [];
    for (const dest of state.destinations ?? []) {
        for (const day of dest.itinerary ?? []) {
            for (const a of day.activities ?? []) {
                if (!isActivityConfirmed(a.status)) {
                    names.push(a.name?.trim() || `Activity on ${day.date}`);
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
}: TripStatusBadgeProps) => {
    const { data: tripStatuses = [] } = useTripStatuses();
    const [error, setError] = useState<string | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const statusName = deriveStatusName(data.status);

    const target = useMemo(() => {
        if (statusName === TRIP_STATUS.PLANNING) {
            return {
                next: tripStatuses.find((s) => s.name === TRIP_STATUS.CONFIRMED),
                label: 'Confirm trip',
                Icon: CheckCircleOutlineRoundedIcon,
                requiresActivitiesConfirmed: true,
                dialogTitle: 'Confirm this trip?',
                dialogBody:
                    "Confirming locks the itinerary — you won't be able to add or edit places afterward. Participants will be notified if the bell is on.",
                confirmLabel: 'Confirm trip',
            };
        }
        if (statusName === TRIP_STATUS.CONFIRMED) {
            return {
                next: tripStatuses.find((s) => s.name === TRIP_STATUS.COMPLETED),
                label: 'Mark complete',
                Icon: CheckCircleRoundedIcon,
                requiresActivitiesConfirmed: false,
                dialogTitle: 'Mark this trip as completed?',
                dialogBody:
                    "Once completed the trip is read-only. It stays in your list as a record of where you've been.",
                confirmLabel: 'Mark complete',
            };
        }
        return null;
    }, [statusName, tripStatuses]);

    if (disabled || !target) return null;

    const handleClick = () => {
        if (!target.next) {
            setError(
                "Couldn't resolve the next trip status. Try again shortly."
            );
            return;
        }
        if (target.requiresActivitiesConfirmed) {
            const unconfirmed = findUnconfirmedActivities(data);
            if (unconfirmed.length) {
                const preview = unconfirmed.slice(0, 3).join(', ');
                const extra =
                    unconfirmed.length > 3
                        ? ` and ${unconfirmed.length - 3} more`
                        : '';
                setError(
                    `Confirm every activity first (${preview}${extra}). ` +
                        `Toggle each place to "Confirmed" before promoting the trip.`
                );
                return;
            }
        }
        setError(null);
        setConfirmOpen(true);
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
    };

    const { label, Icon, dialogTitle, dialogBody, confirmLabel } = target;

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
                <span className="trip-status-badge-label">{label}</span>
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

            <Dialog
                open={confirmOpen}
                onClose={handleClose}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>{dialogTitle}</DialogTitle>
                <DialogContent>
                    <p>{dialogBody}</p>
                </DialogContent>
                <DialogActions>
                    <ButtonCustom
                        type="line"
                        capitalizeType="uppercase"
                        label="Cancel"
                        onClick={handleClose}
                        disabled={isSaving}
                    />
                    <ButtonCustom
                        type="standard"
                        capitalizeType="uppercase"
                        label={isSaving ? 'Saving…' : confirmLabel}
                        onClick={handleConfirm}
                        disabled={isSaving}
                    />
                </DialogActions>
            </Dialog>
        </span>
    );
};

export default TripStatusBadge;
