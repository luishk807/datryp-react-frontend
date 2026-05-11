import { useMemo, useState } from 'react';
import './index.css';
import moment from 'moment';
import _ from 'lodash';
import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
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
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import { convertMoney } from 'utils';
import { status as statusOptions } from 'sample';
import type { TripState, TripStatus } from 'types';

interface BasicTripInfoProps {
    data: TripState;
    onChangeStep: (step: number) => void;
    onStatusChange?: (status: TripStatus) => void;
    isViewMode?: boolean;
}

const resolveStatus = (
    raw: TripState['status']
): TripStatus | undefined => {
    if (!raw) return undefined;
    if (typeof raw === 'number') {
        return statusOptions.find((o) => o.id === raw);
    }
    return raw;
};

export const BasicTripInfo = ({
    data,
    onChangeStep,
    onStatusChange,
    isViewMode = false,
}: BasicTripInfoProps) => {
    const currentStatus = useMemo(() => resolveStatus(data.status), [data.status]);

    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [draftStatusId, setDraftStatusId] = useState<number | undefined>(
        currentStatus?.id
    );

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

    const statusName = currentStatus?.name ?? 'Draft';
    const friends = data.friends ?? [];

    const openStatusModal = () => {
        setDraftStatusId(currentStatus?.id);
        setStatusModalOpen(true);
    };

    const closeStatusModal = () => setStatusModalOpen(false);

    const handleSaveStatus = () => {
        const next = statusOptions.find((o) => o.id === draftStatusId);
        if (next) onStatusChange?.(next);
        setStatusModalOpen(false);
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
                <button
                    type="button"
                    className="trip-status-badge"
                    onClick={openStatusModal}
                    disabled={isViewMode}
                >
                    <span className="status-dot" />
                    <span className="status-text">{statusName}</span>
                    {!isViewMode && <EditOutlinedIcon className="status-edit" />}
                </button>
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

            <Dialog open={statusModalOpen} onClose={closeStatusModal} fullWidth maxWidth="xs">
                <DialogTitle>Update trip status</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth sx={{ mt: 1 }}>
                        <InputLabel id="status-select-label">Status</InputLabel>
                        <Select
                            labelId="status-select-label"
                            label="Status"
                            value={draftStatusId ?? ''}
                            onChange={(e: SelectChangeEvent<number | ''>) =>
                                setDraftStatusId(
                                    e.target.value === '' ? undefined : Number(e.target.value)
                                )
                            }
                        >
                            {statusOptions.map((option) => (
                                <MenuItem key={option.id} value={option.id}>
                                    {option.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <ButtonCustom
                        type="standard-small"
                        label="Cancel"
                        onClick={closeStatusModal}
                    />
                    <ButtonCustom
                        type="standard-small"
                        label="Save"
                        onClick={handleSaveStatus}
                        style={{ marginLeft: '12px' }}
                    />
                </DialogActions>
            </Dialog>
        </section>
    );
};

export default BasicTripInfo;
