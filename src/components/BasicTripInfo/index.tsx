import { useMemo, useRef, useState } from 'react';
import './index.scss';
import { formatDate, isSameDay, isValidDate } from 'utils';
import _ from 'lodash';
import IconButton from '@mui/material/IconButton';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import { Tooltip } from '@mui/material';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import ButtonIcon from 'components/common/FormFields/ButtonIcon';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import ErrorAlert from 'components/common/ErrorAlert';
import DropDown from 'components/common/FormFields/DropDown';
import DialogBox from 'components/common/FormFields/DialogBox';
import { convertMoney } from 'utils';
import { useTripStatuses } from 'api/hooks/useLookups';
import { TRIP_STATUS } from 'constants';
import type { Activity, ActivityStatus, TripState, TripStatus } from 'types';

interface BasicTripInfoProps {
    data: TripState;
    onChangeStep: (step: number) => void;
    /** Persists the new trip status. Returning a promise keeps the modal
     *  open with a "Saving…" label until the save round-trips, then it
     *  closes. The parent owns the actual mutation. */
    onStatusChange?: (status: TripStatus) => void | Promise<void>;
    onExportExcel?: () => void;
    onSaveTrip?: () => void;
    /** Flip the page into edit mode (show all activity edit icons, etc.).
     *  When provided AND `isEditMode` is false, the primary button reads
     *  "Edit Trip" and clicking calls this instead of `onSaveTrip`. */
    onEnterEditMode?: () => void;
    /** Whether the parent is currently in edit mode. Drives the primary
     *  button's label + click target ("Edit Trip" vs "Save Trip"). */
    isEditMode?: boolean;
    /** One-click promote Confirmed → Completed. Does its own save (no
     *  separate Save Trip click needed), so we hide Save Trip whenever this
     *  is provided. */
    onMarkCompleted?: () => void;
    onCancel?: () => void;
    onDeleteTrip?: () => void;
    isSaving?: boolean;
    isDeleting?: boolean;
    isDirty?: boolean;
    saveError?: string | null;
    isViewMode?: boolean;
}

const resolveStatus = (
    raw: TripState['status'],
    options: Array<{ id: string | number; name: string }>
): TripStatus | undefined => {
    if (!raw) return undefined;
    if (typeof raw === 'number' || typeof raw === 'string') {
        const match = options.find((o) => o.id === raw);
        return match as TripStatus | undefined;
    }
    // `raw` is an object. The pre-seeded sample option uses a numeric id while
    // the modal's options come from the backend (UUID). Reconcile by name so
    // the dropdown shows the correct current selection even across that gap.
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

/** Return names of activities that aren't Confirmed. */
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

export const BasicTripInfo = ({
    data,
    onChangeStep,
    onStatusChange,
    onExportExcel,
    onSaveTrip,
    onEnterEditMode,
    isEditMode = false,
    onMarkCompleted,
    onCancel,
    onDeleteTrip,
    isSaving = false,
    isDeleting = false,
    isDirty = false,
    saveError = null,
    isViewMode = false,
}: BasicTripInfoProps) => {
    const { data: tripStatuses = [] } = useTripStatuses();

    const statusOptions = useMemo(
        () =>
            tripStatuses.map((s) => ({
                id: s.id as string | number,
                name: s.name,
            })),
        [tripStatuses]
    );

    const currentStatus = useMemo(
        () => resolveStatus(data.status, statusOptions),
        [data.status, statusOptions]
    );

    const statusModalRef = useRef<ModalButtonHandle>(null);
    const [draftStatusId, setDraftStatusId] = useState<string | number | undefined>(
        currentStatus?.id
    );
    const [statusError, setStatusError] = useState<string | null>(null);

    const tripDate = useMemo(() => {
        if (!isValidDate(data.startDate) || !isValidDate(data.endDate)) return '—';
        if (isSameDay(data.startDate, data.endDate)) return formatDate(data.startDate, 'MMM D, YYYY');
        return `${formatDate(data.startDate, 'MMM D')} → ${formatDate(data.endDate, 'MMM D, YYYY')}`;
    }, [data]);

    const organizer = useMemo(
        () =>
            (data.organizer ?? [])
                .map((item) => item.label)
                .filter(Boolean)
                .join(', '),
        [data]
    );

    const statusName = currentStatus?.name ?? TRIP_STATUS.PLANNING;
    const friends = data.friends ?? [];

    // Mark Completed is a one-click promote that owns its own save (the parent
    // resolves the Completed UUID and calls saveItinerary directly). When this
    // prop is provided we hide Save Trip — there's nothing to save at the
    // activity level once the trip is Confirmed (activities are locked) and
    // the only legitimate change is the status promotion this button performs.
    const showMarkCompleted =
        statusName === TRIP_STATUS.CONFIRMED && !!onMarkCompleted;

    // The right-side pill is the entry point into the status modal — only the
    // Planning state needs it (to promote to Confirmed). Once Confirmed/Completed/
    // Cancelled, the inline status next to the title is the canonical display.
    const showStatusPill = statusName === TRIP_STATUS.PLANNING;

    const openStatusModal = () => {
        setDraftStatusId(currentStatus?.id);
        setStatusError(null);
        statusModalRef.current?.openModel();
    };

    const closeStatusModal = () => {
        setStatusError(null);
        statusModalRef.current?.closeModal();
    };

    const handleSaveStatus = async () => {
        const next = statusOptions.find((o) => o.id === draftStatusId);
        if (!next) {
            statusModalRef.current?.closeModal();
            return;
        }
        // Trip can only be marked Confirmed when every activity is also Confirmed.
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
        // Await so the modal stays open until the save round-trips. The
        // parent surfaces any error via the `saveError` prop, which renders
        // outside the modal — we only close on success here.
        try {
            await onStatusChange?.(next as TripStatus);
            statusModalRef.current?.closeModal();
        } catch {
            // Parent handled the error display; leave the modal open so the
            // user can retry or cancel.
        }
    };

    return (
        <section className="basic-trip-info">
            <div className="trip-header">
                <div className="trip-header-left">
                    <span className="trip-eyebrow">
                        Trip · {_.get(data, 'type.name', 'Custom')}
                    </span>
                    <div className="trip-name-row">
                        <h2 className="trip-name">{data.name || 'Untitled trip'}</h2>
                        {statusName === TRIP_STATUS.CONFIRMED && (
                            <Tooltip
                                title="Trip confirmed — places are locked in. Click Mark Completed when the trip is done."
                                arrow
                            >
                                <span
                                    className="trip-status-inline trip-status-inline-confirmed"
                                    aria-label={`Trip status: ${statusName}`}
                                >
                                    <CheckCircleOutlineRoundedIcon className="trip-status-inline-icon" />
                                </span>
                            </Tooltip>
                        )}
                        {statusName === TRIP_STATUS.COMPLETED && (
                            <Tooltip title="Completed" arrow>
                                <span
                                    className="trip-status-inline trip-status-inline-completed"
                                    aria-label={`Trip status: ${statusName}`}
                                >
                                    <CheckCircleRoundedIcon className="trip-status-inline-icon" />
                                </span>
                            </Tooltip>
                        )}
                        {statusName === TRIP_STATUS.CANCELLED && (
                            <span
                                className="trip-status-inline trip-status-inline-cancelled"
                                aria-label={`Trip status: ${statusName}`}
                            >
                                ({statusName})
                            </span>
                        )}
                        {!isViewMode && statusName === TRIP_STATUS.PLANNING && (
                            <IconButton
                                size="small"
                                aria-label="Edit trip"
                                className="trip-name-edit"
                                onClick={() => onChangeStep(0)}
                            >
                                <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                        )}
                    </div>
                </div>
                <div className="trip-header-right">
                    {onExportExcel && (
                        <ButtonIcon
                            type="standard"
                            className="trip-export-btn"
                            Icon={FileDownloadOutlinedIcon}
                            iconProps={{ fontSize: 'small' }}
                            iconPosition="start"
                            title="Excel"
                            ariaLabel="Download as Excel"
                            onClick={onExportExcel}
                        />
                    )}
                    {onCancel && (
                        <ButtonCustom
                            type="line"
                            capitalizeType="uppercase"
                            className="trip-cancel-btn"
                            label="Cancel"
                            onClick={onCancel}
                            disabled={isSaving}
                        />
                    )}
                    {/* Trip-detail page wires onEnterEditMode to "navigate to
                     *  the stepper editor" — same behavior as the trip-name
                     *  pencil icon, just a more discoverable big-button CTA.
                     *  The new-trip stepper passes onSaveTrip instead, which
                     *  is the classic save-this-form button. */}
                    {onEnterEditMode && !isEditMode && (
                        <ButtonCustom
                            type="standard"
                            capitalizeType="uppercase"
                            className="trip-save-btn"
                            label="Edit Trip"
                            onClick={onEnterEditMode}
                            disabled={isSaving}
                        />
                    )}
                    {onSaveTrip && (isEditMode || !onEnterEditMode) && (
                        <ButtonCustom
                            type="standard"
                            capitalizeType="uppercase"
                            className="trip-save-btn"
                            label={isSaving ? 'Saving…' : 'Save Trip'}
                            onClick={onSaveTrip}
                            disabled={!isDirty || isSaving}
                        />
                    )}
                    {showMarkCompleted && (
                        <span className="trip-mark-complete-wrapper">
                            <DialogBox
                                buttonLabel={isSaving ? 'Saving…' : 'Mark Completed'}
                                buttonType="line"
                                title="Mark this trip as completed?"
                                onConfirm={onMarkCompleted}
                            >
                                This marks the trip as completed and locks it
                                from further changes. The itinerary stays
                                visible in your list, but you won't be able
                                to edit places or budgets afterward.
                            </DialogBox>
                        </span>
                    )}
                    {onDeleteTrip && (
                        <span className="trip-delete-wrapper">
                            <DialogBox
                                buttonLabel={isDeleting ? 'Deleting…' : 'Delete Trip'}
                                buttonType="line"
                                title="Delete this trip?"
                                onConfirm={onDeleteTrip}
                            >
                                This permanently removes the trip and all its
                                activities. Participants will no longer see it
                                in their list. This cannot be undone.
                            </DialogBox>
                        </span>
                    )}
                    {showStatusPill && (
                        <ButtonCustom
                            type="none"
                            capitalizeType="none"
                            className="trip-status-badge"
                            onClick={openStatusModal}
                            disabled={isViewMode}
                        >
                            <span className="status-dot" />
                            <span className="status-text">{statusName}</span>
                            {!isViewMode && <EditOutlinedIcon className="status-edit" />}
                        </ButtonCustom>
                    )}
                </div>
            </div>

            {saveError && (
                <ErrorAlert className="trip-save-error">{saveError}</ErrorAlert>
            )}

            <div className="trip-stats">
                <div className="trip-stat">
                    <PersonOutlineIcon className="stat-icon" />
                    <div className="stat-text">
                        <span className="stat-label">Organizer</span>
                        <span className="stat-value">{organizer || '—'}</span>
                    </div>
                </div>
                <div className="trip-stat">
                    <EventOutlinedIcon className="stat-icon" />
                    <div className="stat-text">
                        <span className="stat-label">When</span>
                        <span className="stat-value">{tripDate}</span>
                    </div>
                </div>
                <div className="trip-stat">
                    <PaymentsOutlinedIcon className="stat-icon" />
                    <div className="stat-text">
                        <span className="stat-label">Budget</span>
                        <span className="stat-value">{convertMoney(data.budget)}</span>
                    </div>
                </div>
            </div>

            {friends.length > 0 && (
                <div className="trip-friends">
                    <div className="trip-friends-header">
                        <GroupOutlinedIcon className="stat-icon" />
                        <span className="stat-label">Who's going</span>
                    </div>
                    <div className="friend-chips">
                        {friends.map((f, idx) => (
                            <span className="friend-chip" key={idx}>
                                {f.label}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <ModalButton ref={statusModalRef} title="Update trip status">
                <div className="trip-status-dropdown">
                    <DropDown
                        label="Status"
                        options={statusOptions}
                        value={draftStatusId ?? null}
                        onChange={(opt) => {
                            setDraftStatusId(opt?.id);
                            setStatusError(null);
                        }}
                    />
                </div>
                <ErrorAlert>{statusError}</ErrorAlert>
                <div className="trip-status-actions">
                    <ButtonCustom
                        type="line"
                        capitalizeType="uppercase"
                        label="Cancel"
                        onClick={closeStatusModal}
                        disabled={isSaving}
                    />
                    <ButtonCustom
                        type="standard"
                        capitalizeType="uppercase"
                        label={isSaving ? 'Saving…' : 'Save'}
                        onClick={handleSaveStatus}
                        disabled={isSaving}
                    />
                </div>
            </ModalButton>
        </section>
    );
};

export default BasicTripInfo;
