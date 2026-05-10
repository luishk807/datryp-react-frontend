import { useMemo } from 'react';
import './index.css';
import moment from 'moment';
import _ from 'lodash';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { convertMoney } from 'utils';
import type { TripState } from 'types/trip';

interface BasicTripInfoProps {
    data: TripState;
    onChangeStep: (step: number) => void;
    isViewMode?: boolean;
}

export const BasicTripInfo = ({
    data,
    onChangeStep,
    isViewMode = false,
}: BasicTripInfoProps) => {
    const tripDate = useMemo(() => {
        const start = moment(data.startDate);
        const end = moment(data.endDate);
        if (!start.isValid() || !end.isValid()) return '—';
        if (start.isSame(end, 'day')) return start.format('MMM D, YYYY');
        return `${start.format('MMM D')} → ${end.format('MMM D, YYYY')}`;
    }, [data]);

    const organizer = useMemo(
        () => (data.organizer ?? []).map((item) => item.label).filter(Boolean).join(', '),
        [data]
    );

    const statusName = _.get(data, 'status.name', 'Draft');
    const friends = data.friends ?? [];

    return (
        <section className="basic-trip-info">
            <div className="trip-header">
                <div className="trip-header-left">
                    <span className="trip-eyebrow">
                        Trip · {_.get(data, 'type.name', 'Custom')}
                    </span>
                    <h2 className="trip-name">{data.name || 'Untitled trip'}</h2>
                </div>
                <button
                    type="button"
                    className="trip-status-badge"
                    onClick={() => onChangeStep(0)}
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
        </section>
    );
};

export default BasicTripInfo;
