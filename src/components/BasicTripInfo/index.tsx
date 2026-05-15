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
    onStatusChange?: (status: TripStatus) => void;
    onExportExcel?: () => void;
    onSaveTrip?: () => void;
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

    const openStatusModal = () => {
        setDraftStatusId(currentStatus?.id);
        setStatusError(null);
        statusModalRef.current?.openModel();
    };

    const closeStatusModal = () => {
        setStatusError(null);
        statusModalRef.current?.closeModal();
    };

    const handleSaveStatus = () => {
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
        onStatusChange?.(next as TripStatus);
        statusModalRef.current?.closeModal();
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
                        {!isViewMode && (
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
                    {onSaveTrip && (
                        <ButtonCustom
                            type="standard"
                            capitalizeType="uppercase"
                            className="trip-save-btn"
                            label={isSaving ? 'Saving…' : 'Save Trip'}
                            onClick={onSaveTrip}
                            disabled={!isDirty || isSaving}
                        />
                    )}
                    {onDeleteTrip && (
                        <span className="trip-delete-wrapper">
                            <DialogBox
                                buttonLabel={isDeleting ? 'Deleting…' : 'Delete Trip'}
                                buttonType="text"
                                title="Delete this trip?"
                                onConfirm={onDeleteTrip}
                            >
                                This permanently removes the trip and all its
                                activities. Participants will no longer see it
                                in their list. This cannot be undone.
                            </DialogBox>
                        </span>
                    )}
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
                    />
                    <ButtonCustom
                        type="standard"
                        capitalizeType="uppercase"
                        label="Save"
                        onClick={handleSaveStatus}
                    />
                </div>
            </ModalButton>
        </section>
    );
};

export default BasicTripInfo;
