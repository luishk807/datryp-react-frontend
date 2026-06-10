import { Link } from 'react-router-dom';
import classnames from 'classnames';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import RouteRoundedIcon from '@mui/icons-material/RouteRounded';
import AvatarStack from 'components/common/AvatarStack';
import { useUser } from 'context/UserContext';
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
    KIND_SINGLE: 'One destination',
    KIND_MULTI: 'Multiple destinations',
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
    const { user } = useUser();
    // Exclude the logged-in user from the trip's friend avatars — you
    // don't need to see yourself on your own trip. The trip `friends`
    // list includes the owner/participant rows, so filter on the backend
    // UUID the adapter stamps onto each (`userId`).
    const friends = (data.friends ?? []).filter(
        (f) => !user?.id || f.userId !== user.id
    );
    const friendsCount = friends.length;
    const friendPeople = friends.map((f) => ({
        id: f.id,
        name: f.name,
        imageUrl: f.profileImageUrl,
    }));
    const target = to ?? `/trip-detail?id=${data.id}`;
    const statusKey = data.status.name.toLowerCase();
    const single = isSingle(data);
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
                {/* Trip-kind chip — single vs multi-destination, sitting just
                    below the country in the card body. */}
                <span
                    className={classnames('trip-box-kind', {
                        'is-single': single,
                        'is-multi': !single,
                    })}
                >
                    {single ? (
                        <PlaceRoundedIcon className="trip-box-kind-icon" />
                    ) : (
                        <RouteRoundedIcon className="trip-box-kind-icon" />
                    )}
                    {single
                        ? TRIP_BOX_LABEL.KIND_SINGLE
                        : TRIP_BOX_LABEL.KIND_MULTI}
                </span>
                <div className="trip-box-meta">
                    <span>{formatDateRange(data.startDate, data.endDate)}</span>
                    {friendsCount > 0 && (
                        <span
                            className="trip-box-friends"
                            title={`${friendsCount} friend${
                                friendsCount === 1 ? '' : 's'
                            } on this trip`}
                        >
                            <AvatarStack
                                people={friendPeople}
                                max={3}
                                size="sm"
                                showOverflow={false}
                            />
                            <span className="trip-box-friends-count">
                                {friendsCount}
                            </span>
                        </span>
                    )}
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
