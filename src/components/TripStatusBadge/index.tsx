import { useMemo, useRef, useState } from 'react';
import classnames from 'classnames';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import './index.scss';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import ErrorAlert from 'components/common/ErrorAlert';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import { useTripStatuses } from 'api/hooks/useLookups';
import { TRIP_STATUS } from 'constants';
import type { Activity, ActivityStatus, TripState, TripStatus } from 'types';

interface TripStatusBadgeProps {
    data: TripState;
    /** Persists the new trip status. Returning a promise keeps the modal
     *  open with a "Saving…" label until the save round-trips, then it
     *  closes. The parent owns the actual mutation. */
    onStatusChange: (status: TripStatus) => void | Promise<void>;
    isSaving?: boolean;
    /** Hides the pencil affordance and turns the pill into a static label. */
    disabled?: boolean;
    className?: string;
}

// Canonical lifecycle order — Planning → Confirmed → Completed → Cancelled.
// The backend lookup returns rows alphabetically (Cancelled / Completed /
// Confirmed / Planning), which reads backwards in the modal.
const STATUS_ORDER: Record<string, number> = {
    [TRIP_STATUS.PLANNING]: 0,
    [TRIP_STATUS.CONFIRMED]: 1,
    [TRIP_STATUS.COMPLETED]: 2,
    [TRIP_STATUS.CANCELLED]: 3,
};

const resolveStatus = (
    raw: TripState['status'],
    options: Array<{ id: string | number; name: string }>
): TripStatus | undefined => {
    if (!raw) return undefined;
    if (typeof raw === 'number' || typeof raw === 'string') {
        const match = options.find((o) => o.id === raw);
        return match as TripStatus | undefined;
    }
    // Pre-seeded sample uses numeric ids; backend options use UUIDs.
    // Reconcile by name so the current selection survives that gap.
    const byName = options.find((o) => o.name === raw.name);
    if (byName) return byName as TripStatus;
    return raw;
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

export const TripStatusBadge = ({
    data,
    onStatusChange,
    isSaving = false,
    disabled = false,
    className,
}: TripStatusBadgeProps) => {
    const { data: tripStatuses = [] } = useTripStatuses();
    const modalRef = useRef<ModalButtonHandle>(null);

    const statusOptions = useMemo(
        () =>
            tripStatuses
                .map((s) => ({ id: s.id as string | number, name: s.name }))
                .sort(
                    (a, b) =>
                        (STATUS_ORDER[a.name] ?? 99) -
                        (STATUS_ORDER[b.name] ?? 99)
                ),
        [tripStatuses]
    );

    const currentStatus = useMemo(
        () => resolveStatus(data.status, statusOptions),
        [data.status, statusOptions]
    );

    const statusName = currentStatus?.name ?? TRIP_STATUS.PLANNING;
    const [draftStatusId, setDraftStatusId] = useState<string | number | undefined>(
        currentStatus?.id
    );
    const [statusError, setStatusError] = useState<string | null>(null);

    const openModal = () => {
        if (disabled) return;
        setDraftStatusId(currentStatus?.id);
        setStatusError(null);
        modalRef.current?.openModel();
    };

    const closeModal = () => {
        setStatusError(null);
        modalRef.current?.closeModal();
    };

    const handleSave = async () => {
        const next = statusOptions.find((o) => o.id === draftStatusId);
        if (!next) {
            modalRef.current?.closeModal();
            return;
        }
        // Trip can only promote to Confirmed when every activity is also Confirmed.
        if (next.name === TRIP_STATUS.CONFIRMED) {
            const unconfirmed = findUnconfirmedActivities(data);
            if (unconfirmed.length) {
                const preview = unconfirmed.slice(0, 3).join(', ');
                const extra =
                    unconfirmed.length > 3
                        ? ` and ${unconfirmed.length - 3} more`
                        : '';
                setStatusError(
                    `Confirm every activity first (${preview}${extra}). ` +
                        `Toggle each place to "Confirmed" before promoting the trip.`
                );
                return;
            }
        }
        setStatusError(null);
        try {
            await onStatusChange(next as TripStatus);
            modalRef.current?.closeModal();
        } catch {
            // Parent surfaced the error elsewhere; leave the modal open.
        }
    };

    return (
        <>
            <ButtonCustom
                type="none"
                capitalizeType="none"
                className={classnames('trip-status-badge', className)}
                onClick={openModal}
                disabled={disabled}
            >
                <span className="status-dot" />
                <span className="status-text">{statusName}</span>
                {!disabled && <EditOutlinedIcon className="status-edit" />}
            </ButtonCustom>

            <ModalButton ref={modalRef} title="Update trip status">
                <div
                    className="trip-status-radio-group"
                    role="radiogroup"
                    aria-label="Trip status"
                >
                    {statusOptions.map((opt) => {
                        const selected = opt.id === draftStatusId;
                        return (
                            <button
                                key={String(opt.id)}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                className={classnames(
                                    'trip-status-radio',
                                    `is-${opt.name.toLowerCase()}`,
                                    { selected }
                                )}
                                onClick={() => {
                                    setDraftStatusId(opt.id);
                                    setStatusError(null);
                                }}
                            >
                                <span className="trip-status-radio-dot" />
                                <span className="trip-status-radio-label">
                                    {opt.name}
                                </span>
                            </button>
                        );
                    })}
                </div>
                <ErrorAlert>{statusError}</ErrorAlert>
                <div className="trip-status-actions">
                    <ButtonCustom
                        type="line"
                        capitalizeType="uppercase"
                        label="Cancel"
                        onClick={closeModal}
                        disabled={isSaving}
                    />
                    <ButtonCustom
                        type="standard"
                        capitalizeType="uppercase"
                        label={isSaving ? 'Saving…' : 'Save'}
                        onClick={handleSave}
                        disabled={isSaving}
                    />
                </div>
            </ModalButton>
        </>
    );
};

export default TripStatusBadge;
