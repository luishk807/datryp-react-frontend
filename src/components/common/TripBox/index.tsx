import { Link } from 'react-router-dom';
import classnames from 'classnames';
import './index.scss';
import { NO_IMAGE } from 'constants';
import { formatDate, isValidDate } from 'utils';
import type {
    MultipleDestinations,
    SingleDestination,
} from 'types';

export type TripBoxData = SingleDestination | MultipleDestinations;

interface TripBoxProps {
    data: TripBoxData;
    to?: string;
}

const TRIP_BOX_LABEL = {
    MULTIPLE: 'Multiple destinations',
} as const;

const formatDateRange = (start: string, end: string) => {
    if (!isValidDate(start) || !isValidDate(end)) return '';
    if (formatDate(start, 'YYYY') === formatDate(end, 'YYYY')) {
        return `${formatDate(start, 'MMM D')} – ${formatDate(end, 'MMM D, YYYY')}`;
    }
    return `${formatDate(start, 'MMM D, YYYY')} – ${formatDate(end, 'MMM D, YYYY')}`;
};

const isSingle = (data: TripBoxData): data is SingleDestination =>
    (data as SingleDestination).country !== undefined;

const getDestinationLabel = (data: TripBoxData) => {
    if (isSingle(data)) return data.country.name;
    const countries = data.intenaryDates
        .map((d) => d.country?.name)
        .filter(Boolean) as string[];
    const unique = Array.from(new Set(countries));
    return unique.join(' · ') || TRIP_BOX_LABEL.MULTIPLE;
};

const getTripImage = (data: TripBoxData) => {
    if (data.image) return data.image;
    const country = isSingle(data)
        ? data.country
        : data.intenaryDates[0]?.country;
    return country?.image || NO_IMAGE;
};

export const TripBox = ({ data, to }: TripBoxProps) => {
    const friendsCount = data.friends?.length ?? 0;
    const friendsLabel = `${friendsCount} friend${friendsCount === 1 ? '' : 's'}`;
    const target = to ?? `/trip-detail?id=${data.id}`;
    const statusKey = data.status.name.toLowerCase();
    const destinationLabel = getDestinationLabel(data);
    const tripImage = getTripImage(data);
    const isPlaceholder = tripImage === NO_IMAGE;

    return (
        <Link to={target} className="trip-box-link">
            <article className="trip-box">
                <div
                    className={classnames('trip-box-image', {
                        'is-placeholder': isPlaceholder,
                    })}
                >
                    <img
                        src={tripImage}
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
