import { Link } from 'react-router-dom';
import classnames from 'classnames';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
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
    /** When true, the card switches to selection mode: a checkbox
     *  appears in the top-left of the photo, click toggles selection
     *  instead of navigating, and `selected` styling applies. */
    selectable?: boolean;
    /** Visual selection state — only meaningful when `selectable`. */
    selected?: boolean;
    /** Fires on click while in selectable mode. Required for the
     *  card to be interactive in selection mode. */
    onToggleSelect?: () => void;
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

export const TripBox = ({
    data,
    to,
    selectable = false,
    selected = false,
    onToggleSelect,
}: TripBoxProps) => {
    const friendsCount = data.friends?.length ?? 0;
    const friendsLabel = `${friendsCount} friend${friendsCount === 1 ? '' : 's'}`;
    const target = to ?? `/trip-detail?id=${data.id}`;
    const statusKey = data.status.name.toLowerCase();
    const destinationLabel = getDestinationLabel(data);
    const tripImage = getTripImage(data);
    const isPlaceholder = tripImage === NO_IMAGE;

    // Body shared by both interaction modes — only the wrapper element
    // changes (`<Link>` for navigation vs `<button>` for selection).
    const inner = (
        <article
            className={classnames('trip-box', {
                'is-selectable': selectable,
                'is-selected': selectable && selected,
            })}
        >
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
                {/* Status badge hides in selectable mode — the action
                    the user is taking (delete) doesn't care about the
                    trip's status, and dropping it gives the checkbox
                    visual room to breathe. */}
                {!selectable && (
                    <span
                        className={classnames(
                            'trip-box-status',
                            `trip-box-status-${statusKey}`
                        )}
                    >
                        {data.status.name}
                    </span>
                )}
                {selectable && (
                    <span
                        className={classnames('trip-box-check', {
                            'is-checked': selected,
                        })}
                        aria-hidden="true"
                    >
                        {selected && <CheckRoundedIcon fontSize="small" />}
                    </span>
                )}
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
    );

    if (selectable) {
        return (
            <button
                type="button"
                className="trip-box-link is-select-trigger"
                onClick={onToggleSelect}
                aria-pressed={selected}
                aria-label={`${selected ? 'Unselect' : 'Select'} trip ${data.name}`}
            >
                {inner}
            </button>
        );
    }

    return (
        <Link to={target} className="trip-box-link">
            {inner}
        </Link>
    );
};

export default TripBox;
