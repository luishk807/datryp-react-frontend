import { useMemo, useRef, useState } from 'react';
import './index.scss';
import moment from 'moment';
import _ from 'lodash';
import {
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    type SelectChangeEvent,
} from '@mui/material';
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
import { convertMoney } from 'utils';
import { useTripStatuses } from 'api/hooks/useLookups';
import type { Activity, ActivityStatus, TripState, TripStatus } from 'types';

interface BasicTripInfoProps {
    data: TripState;
    onChangeStep: (step: number) => void;
    onStatusChange?: (status: TripStatus) => void;
    onExportExcel?: () => void;
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
        return (status as ActivityStatus).name === 'Confirmed';
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
        const start = moment(data.startDate);
        const end = moment(data.endDate);
        if (!start.isValid() || !end.isValid()) return '—';
        if (start.isSame(end, 'day')) return start.format('MMM D, YYYY');
        return `${start.format('MMM D')} → ${end.format('MMM D, YYYY')}`;
    }, [data]);

    const organizer = useMemo(
        () =>
            (data.organizer ?? [])
                .map((item) => item.label)
                .filter(Boolean)
                .join(', '),
        [data]
    );

    const statusName = currentStatus?.name ?? 'Planning';
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
        if (next.name === 'Confirmed') {
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
                <FormControl fullWidth sx={{ mt: 1 }}>
                    <InputLabel id="status-select-label">Status</InputLabel>
                    <Select
                        labelId="status-select-label"
                        label="Status"
                        value={draftStatusId ?? ''}
                        onChange={(e: SelectChangeEvent<string | number | ''>) => {
                            const v = e.target.value;
                            setDraftStatusId(v === '' ? undefined : v);
                            setStatusError(null);
                        }}
                    >
                        {statusOptions.map((option) => (
                            <MenuItem
                                key={String(option.id)}
                                value={option.id as string | number}
                            >
                                {option.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                {statusError && (
                    <p
                        role="alert"
                        style={{
                            color: '#b3261e',
                            background: '#fdecea',
                            border: '1px solid #f5c2bd',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            padding: '10px 12px',
                            borderRadius: '6px',
                            margin: '14px 0 0',
                        }}
                    >
                        {statusError}
                    </p>
                )}
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
