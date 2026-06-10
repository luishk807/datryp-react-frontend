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

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const startOfDayMs = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Local-midnight epoch for a trip date. Parses the leading YYYY-MM-DD
 *  as LOCAL (not `new Date("…")`, which reads a date-only string as UTC
 *  and shifts the day by one in negative-UTC zones — that would skew the
 *  countdown). Falls back to the native parser for odd formats. */
const tripDateMs = (value: string): number | null => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]).getTime();
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : startOfDayMs(d);
};

type TripProgress = {
    label: string;
    /** Drives the pill color — `active` = travelling now, `soon` =
     *  within two weeks, `upcoming` = further out. */
    tone: 'active' | 'soon' | 'upcoming';
};

/** Live status pill text for the card: counts down to an upcoming trip
 *  and counts up through one in progress. Returns null for trips that
 *  have already ended (the COMPLETED badge speaks for those) or with
 *  unusable dates. */
const getTripProgress = (
    start: string,
    end: string,
    statusName: string
): TripProgress | null => {
    if (statusName.toLowerCase() === 'completed') return null;
    const today = startOfDayMs(new Date());
    const s = tripDateMs(start);
    const e = tripDateMs(end);
    if (s === null || e === null) return null;

    if (today < s) {
        const days = Math.round((s - today) / MS_PER_DAY);
        if (days === 0) return { label: 'Starts today', tone: 'soon' };
        if (days === 1) return { label: 'Starts tomorrow', tone: 'soon' };
        return {
            label: `Starts in ${days} days`,
            tone: days <= 14 ? 'soon' : 'upcoming',
        };
    }
    if (today <= e) {
        const total = Math.round((e - s) / MS_PER_DAY) + 1;
        const dayNum = Math.round((today - s) / MS_PER_DAY) + 1;
        return { label: `Day ${dayNum} of ${total}`, tone: 'active' };
    }
    return null;
};

const isSingle = (data: TripBoxData): data is SingleDestination =>
    (data as SingleDestination).country !== undefined;

// How many destinations to show before collapsing the rest into
// "+N more" — keeps 5–8-destination cards from sprawling across two
// lines. Tunable in one place.
const DESTINATIONS_SHOWN = 1;

/** Unique destination country names, in itinerary order. */
const getDestinations = (data: TripBoxData): string[] => {
    if (isSingle(data)) return data.country?.name ? [data.country.name] : [];
    const countries = data.intenaryDates
        .map((d) => d.country?.name)
        .filter(Boolean) as string[];
    return Array.from(new Set(countries));
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
    const destinations = getDestinations(data);
    // Full list for the image alt text (accessibility / SEO); the visible
    // line below truncates with "+N more".
    const destinationLabel =
        destinations.join(' · ') || TRIP_BOX_LABEL.MULTIPLE;
    const shownDestinations = destinations.slice(0, DESTINATIONS_SHOWN);
    const moreDestinations = destinations.length - shownDestinations.length;
    const tripImage = getTripImage(data);
    const isPlaceholder = tripImage === NO_IMAGE;
    const progress = getTripProgress(
        data.startDate,
        data.endDate,
        data.status.name
    );

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
                {/* Live countdown / day-counter pill — top-right, opposite
                    the status badge. Hidden in selectable mode and for
                    ended trips (the COMPLETED badge covers those). */}
                {!selectable && progress && (
                    <span
                        className={classnames(
                            'trip-box-progress',
                            `is-${progress.tone}`
                        )}
                    >
                        {progress.tone === 'active' && (
                            <span
                                className="trip-box-progress-dot"
                                aria-hidden="true"
                            />
                        )}
                        {progress.label}
                    </span>
                )}
            </div>
            <div className="trip-box-content">
                <h3 className="trip-box-name">{data.name}</h3>
                <p className="trip-box-destination" title={destinationLabel}>
                    {shownDestinations.join(' · ') ||
                        TRIP_BOX_LABEL.MULTIPLE}
                    {moreDestinations > 0 && (
                        <span className="trip-box-destination-more">
                            {' '}
                            +{moreDestinations} more
                        </span>
                    )}
                </p>
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
