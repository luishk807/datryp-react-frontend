import { Link } from 'react-router-dom';
import classnames from 'classnames';
import moment from 'moment';
import './index.css';
import type {
    MultipleDestinations,
    SingleDestination,
} from 'types/trip.types';

export type TripBoxData = SingleDestination | MultipleDestinations;

interface TripBoxProps {
    data: TripBoxData;
    to?: string;
}

const FALLBACK_IMAGE = '/images/sample/iceland.jpg';

const formatDateRange = (start: string, end: string) => {
    const a = moment(start);
    const b = moment(end);
    if (!a.isValid() || !b.isValid()) return '';
    if (a.year() === b.year()) {
        return `${a.format('MMM D')} – ${b.format('MMM D, YYYY')}`;
    }
    return `${a.format('MMM D, YYYY')} – ${b.format('MMM D, YYYY')}`;
};

const isSingle = (data: TripBoxData): data is SingleDestination =>
    (data as SingleDestination).country !== undefined;

const getDestinationLabel = (data: TripBoxData) => {
    if (isSingle(data)) return data.country.name;
    const countries = data.intenaryDates
        .map((d) => d.country?.name)
        .filter(Boolean) as string[];
    const unique = Array.from(new Set(countries));
    return unique.join(' · ') || 'Multiple destinations';
};

const getTripImage = (data: TripBoxData) => {
    if (data.image) return data.image;
    const country = isSingle(data)
        ? data.country
        : data.intenaryDates[0]?.country;
    return country?.image || FALLBACK_IMAGE;
};

export const TripBox = ({ data, to }: TripBoxProps) => {
    const friendsCount = data.friends?.length ?? 0;
    const friendsLabel = `${friendsCount} friend${friendsCount === 1 ? '' : 's'}`;
    const target = to ?? `/trip-detail?id=${data.id}`;
    const statusKey = data.status.name.toLowerCase();
    const destinationLabel = getDestinationLabel(data);

    return (
        <Link to={target} className="trip-box-link">
            <article className="trip-box">
                <div className="trip-box-image">
                    <img
                        src={getTripImage(data)}
                        alt={destinationLabel}
                        loading="lazy"
                    />
                    <span
                        className={classnames(
                            'trip-box-status',
                            `trip-box-status-${statusKey}`
                        )}
                    >
                        {data.status.name}
                    </span>
                </div>
                <div className="trip-box-content">
                    <h3 className="trip-box-name">{data.name}</h3>
                    <p className="trip-box-destination">{destinationLabel}</p>
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
