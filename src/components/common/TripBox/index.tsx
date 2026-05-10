import { Link } from 'react-router-dom';
import classnames from 'classnames';
import moment from 'moment';
import './index.css';
import type { UserTripSummary } from 'sample/userTrips';

interface TripBoxProps {
    data: UserTripSummary;
    to?: string;
}

const formatDateRange = (start: string, end: string) => {
    const a = moment(start);
    const b = moment(end);
    if (!a.isValid() || !b.isValid()) return '';
    if (a.year() === b.year()) {
        return `${a.format('MMM D')} – ${b.format('MMM D, YYYY')}`;
    }
    return `${a.format('MMM D, YYYY')} – ${b.format('MMM D, YYYY')}`;
};

export const TripBox = ({ data, to }: TripBoxProps) => {
    const friendsLabel = `${data.friendsCount} friend${
        data.friendsCount === 1 ? '' : 's'
    }`;
    const target = to ?? `/trip-detail?id=${data.id}`;

    return (
        <Link to={target} className="trip-box-link">
            <article className="trip-box">
                <div className="trip-box-image">
                    <img src={data.image} alt={data.destination} loading="lazy" />
                    <span
                        className={classnames(
                            'trip-box-status',
                            `trip-box-status-${data.status}`
                        )}
                    >
                        {data.status}
                    </span>
                </div>
                <div className="trip-box-content">
                    <h3 className="trip-box-name">{data.name}</h3>
                    <p className="trip-box-destination">{data.destination}</p>
                    <div className="trip-box-meta">
                        <span>{formatDateRange(data.startDate, data.endDate)}</span>
                        <span className="trip-box-friends">{friendsLabel}</span>
                    </div>
                </div>
            </article>
        </Link>
    );
};

export default TripBox;
