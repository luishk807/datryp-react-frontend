/**
 * "Upcoming holiday" homepage section — Pro feature.
 *
 * Shows the next major holiday in the user's country of birth, six
 * cities to celebrate it in, and four things-to-do suggestions. Place
 * cards reuse the same trip-mutation helpers + `AddToItineraryModal`
 * as `PlacesYouMightLove`, so:
 *   - Clicking a card adds it as an activity to the itinerary (not just
 *     navigates to a city detail page).
 *   - The hero image is saved on BOTH the trip-level thumbnail and the
 *     activity image.
 *   - Conflict resolution (Add to current / Start fresh) flows through
 *     the shared modal.
 *
 * Free users see a Pro teaser card instead — the query hook is gated on
 * entitlement so the backend never gets called for non-Pro users.
 */
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Snackbar } from '@mui/material';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import Skeleton from 'components/common/Skeleton';
import PlaceCardSkeleton from 'components/common/PlaceCard/PlaceCardSkeleton';
import AddToItineraryModal from 'components/AddToItineraryModal';
import type { ModalButtonHandle } from 'components/ModalButton';
import PlaceCard from 'components/common/PlaceCard';
import type { HolidayPlace } from 'api/holidaySuggestionsApi';
import { useHolidaySuggestions } from 'api/hooks/useHolidaySuggestions';
import { useUser } from 'context/UserContext';
import {
    useTripDispatch,
    useTripState,
} from 'context/TripContext';
import {
    dispatchAddToCurrentTrip,
    dispatchStartFreshTrip,
    findMatchingDestinationIndex,
    lookupCountry,
    tripHasContent,
    type AddablePlace,
} from 'utils/addPlaceToItinerary';
import { NO_IMAGE, TRIP_BASIC } from 'constants';
import type { Country } from 'types';
import './index.scss';

interface PendingAdd {
    place: HolidayPlace;
    country: Country;
    matchingDestinationIndex: number;
}

const toAddable = (place: HolidayPlace): AddablePlace => ({
    name: place.name,
    city: place.name,
    country: place.country,
    description: place.why,
    imageUrl: place.imageUrl,
});

interface HolidayDateParts {
    /** Short weekday — "Mon". */
    weekday: string;
    /** 1-2 digit day. */
    day: string;
    /** Short month — "Jun". */
    month: string;
    /** Four-digit year — only rendered when not the current calendar year. */
    year: string;
    /** Human-friendly "in 32 days" / "today" / "tomorrow" / null for past. */
    countdown: string | null;
}

const parseHolidayDate = (iso: string): HolidayDateParts | null => {
    if (!iso) return null;
    const parsed = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return null;

    const weekday = parsed.toLocaleDateString(undefined, { weekday: 'short' });
    const day = parsed.toLocaleDateString(undefined, { day: 'numeric' });
    const month = parsed.toLocaleDateString(undefined, { month: 'short' });
    const year = parsed.toLocaleDateString(undefined, { year: 'numeric' });

    // Day-precision countdown — strip time-of-day from both sides so a
    // holiday "today" reads as today regardless of the hour the user
    // loads the page.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(parsed);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.round(
        (target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
    );

    let countdown: string | null;
    if (diffDays < 0) {
        countdown = null;
    } else if (diffDays === 0) {
        countdown = 'Today';
    } else if (diffDays === 1) {
        countdown = 'Tomorrow';
    } else if (diffDays < 14) {
        countdown = `in ${diffDays} days`;
    } else if (diffDays < 60) {
        const weeks = Math.round(diffDays / 7);
        countdown = `in ${weeks} weeks`;
    } else {
        const months = Math.round(diffDays / 30);
        countdown = `in ${months} months`;
    }

    return { weekday, day, month, year, countdown };
};

const UpcomingHoliday = () => {
    const { user, isAdmin } = useUser();
    const navigate = useNavigate();
    const trip = useTripState();
    const dispatch = useTripDispatch();
    const modalRef = useRef<ModalButtonHandle>(null);
    const [toast, setToast] = useState<string | null>(null);
    const [resolving, setResolving] = useState<string | null>(null);
    const [pending, setPending] = useState<PendingAdd | null>(null);

    const isPro = Boolean(user && (user.isPaidMember || isAdmin));

    // Hidden completely for signed-out + free-tier users. We deliberately
    // don't render a Pro teaser here — the feature exists for Pro
    // members without advertising itself to everyone else.
    if (!user || !isPro) return null;

    return <UpcomingHolidayActive
        modalRef={modalRef}
        navigate={navigate}
        trip={trip}
        dispatch={dispatch}
        toast={toast}
        setToast={setToast}
        resolving={resolving}
        setResolving={setResolving}
        pending={pending}
        setPending={setPending}
    />;
};

// Pro path lives in its own component so the conditional `useQuery`
// pattern doesn't violate the rules of hooks — `UpcomingHoliday`
// returns early for free users before this is rendered.
interface ActiveProps {
    modalRef: React.RefObject<ModalButtonHandle>;
    navigate: ReturnType<typeof useNavigate>;
    trip: ReturnType<typeof useTripState>;
    dispatch: ReturnType<typeof useTripDispatch>;
    toast: string | null;
    setToast: (t: string | null) => void;
    resolving: string | null;
    setResolving: (s: string | null) => void;
    pending: PendingAdd | null;
    setPending: (p: PendingAdd | null) => void;
}

const UpcomingHolidayActive = ({
    modalRef,
    navigate,
    trip,
    dispatch,
    toast,
    setToast,
    resolving,
    setResolving,
    pending,
    setPending,
}: ActiveProps) => {
    const { data, isLoading, isError } = useHolidaySuggestions();

    const cardKey = (place: HolidayPlace) =>
        `${place.name}--${place.countryCode}`;

    const handleCardClick = async (place: HolidayPlace) => {
        const key = cardKey(place);
        if (resolving === key) return;
        setResolving(key);
        try {
            const country = await lookupCountry(place.country);
            if (!country) {
                setToast(
                    `Couldn't match ${place.country} in our country catalog.`
                );
                return;
            }
            const addable = toAddable(place);
            const matchingDestinationIndex = findMatchingDestinationIndex(
                trip,
                place.country
            );
            const onGoingTrip = tripHasContent(trip);

            if (!onGoingTrip) {
                dispatchStartFreshTrip(addable, country, dispatch);
                setToast(`Started a new trip with ${place.name}`);
                navigate(TRIP_BASIC.SINGLE.route);
                return;
            }
            setPending({ place, country, matchingDestinationIndex });
            modalRef.current?.openModel();
        } finally {
            setResolving(null);
        }
    };

    const closePendingModal = () => {
        modalRef.current?.closeModal();
        setPending(null);
    };

    const handleAddToCurrent = () => {
        if (!pending) return;
        const { place, country, matchingDestinationIndex } = pending;
        const { route } = dispatchAddToCurrentTrip(
            toAddable(place),
            country,
            trip,
            matchingDestinationIndex,
            dispatch
        );
        const target =
            matchingDestinationIndex !== -1 ? place.name : country.name;
        setToast(`Added ${target} to ${trip.name ?? 'your trip'}`);
        closePendingModal();
        navigate(route);
    };

    const handleStartFresh = () => {
        if (!pending) return;
        const { place, country } = pending;
        dispatchStartFreshTrip(toAddable(place), country, dispatch);
        setToast(`Started a new trip with ${place.name}`);
        closePendingModal();
        navigate(TRIP_BASIC.SINGLE.route);
    };

    if (isLoading) {
        // Skeleton mirrors the production shape so the grid doesn't jump
        // when real data arrives. Hero card shows the gradient bg (no
        // photo placeholder yet — Unsplash hasn't resolved), title +
        // description bars stand in for text, plus the date card on the
        // right. Below: activities + place grid placeholders.
        return (
            <section className="upcoming-holiday" aria-live="polite">
                <header className="upcoming-holiday-hero">
                    <div className="upcoming-holiday-hero-bg" aria-hidden="true" />
                    <div className="upcoming-holiday-eyebrow">
                        <EventRoundedIcon
                            className="upcoming-holiday-eyebrow-icon"
                            fontSize="small"
                        />
                        <span>Upcoming holiday</span>
                    </div>

                    <div className="upcoming-holiday-hero-grid">
                        <div className="upcoming-holiday-hero-text">
                            <Skeleton width="70%" height={32} radius={8} />
                            <Skeleton width="35%" height={14} radius={4} />
                            <Skeleton width="100%" height={14} radius={4} />
                            <Skeleton width="92%" height={14} radius={4} />
                            <Skeleton width="80%" height={14} radius={4} />
                        </div>
                        <div className="upcoming-holiday-meta">
                            <div className="upcoming-holiday-date-card">
                                <Skeleton width={36} height={10} radius={3} />
                                <Skeleton width={50} height={28} radius={6} />
                                <Skeleton width={42} height={10} radius={3} />
                            </div>
                            <Skeleton width={72} height={20} radius={999} />
                        </div>
                    </div>
                </header>

                <div className="upcoming-holiday-activities">
                    <h3 className="upcoming-holiday-section-label">
                        Things to do
                    </h3>
                    <ul className="upcoming-holiday-activity-list">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <li
                                key={i}
                                className="upcoming-holiday-activity"
                            >
                                <Skeleton width="55%" height={14} radius={4} />
                                <Skeleton width="100%" height={12} radius={4} />
                                <Skeleton width="80%" height={12} radius={4} />
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="upcoming-holiday-places">
                    <h3 className="upcoming-holiday-section-label">
                        Places to celebrate it
                    </h3>
                    <div className="upcoming-holiday-grid">
                        <PlaceCardSkeleton count={6} />
                    </div>
                </div>
            </section>
        );
    }

    if (isError || !data) return null;

    const { holiday, places, activities } = data;
    const isMultiTrip = trip.type?.id === TRIP_BASIC.MULTIPLE.id;
    const matchingCountryName =
        pending && pending.matchingDestinationIndex !== -1
            ? trip.destinations[pending.matchingDestinationIndex]?.country
                  .name ?? null
            : null;

    const dateParts = parseHolidayDate(holiday.date);
    const currentYear = new Date().getFullYear().toString();
    const showCountry =
        holiday.country &&
        holiday.country.toLowerCase() !== 'international';

    return (
        <section className="upcoming-holiday">
            <header
                className={
                    holiday.imageUrl
                        ? 'upcoming-holiday-hero has-photo'
                        : 'upcoming-holiday-hero'
                }
            >
                {holiday.imageUrl ? (
                    <>
                        <img
                            src={holiday.imageUrl}
                            alt=""
                            className="upcoming-holiday-hero-photo"
                            loading="lazy"
                            aria-hidden="true"
                        />
                        <div
                            className="upcoming-holiday-hero-scrim"
                            aria-hidden="true"
                        />
                    </>
                ) : (
                    <div
                        className="upcoming-holiday-hero-bg"
                        aria-hidden="true"
                    />
                )}
                <div className="upcoming-holiday-eyebrow">
                    <EventRoundedIcon
                        className="upcoming-holiday-eyebrow-icon"
                        fontSize="small"
                    />
                    <span>Upcoming holiday</span>
                </div>

                <div className="upcoming-holiday-hero-grid">
                    <div className="upcoming-holiday-hero-text">
                        <h2 className="upcoming-holiday-name">
                            {holiday.name}
                        </h2>
                        {showCountry && (
                            <span className="upcoming-holiday-country">
                                <PlaceRoundedIcon fontSize="small" />
                                {holiday.country}
                            </span>
                        )}
                        {holiday.description && (
                            <p className="upcoming-holiday-description">
                                {holiday.description}
                            </p>
                        )}
                    </div>

                    {dateParts && (
                        <div className="upcoming-holiday-meta">
                            <div className="upcoming-holiday-date-card">
                                <span className="upcoming-holiday-date-weekday">
                                    {dateParts.weekday}
                                </span>
                                <span className="upcoming-holiday-date-day">
                                    {dateParts.day}
                                </span>
                                <span className="upcoming-holiday-date-month">
                                    {dateParts.month}
                                    {dateParts.year !== currentYear
                                        ? ` ${dateParts.year}`
                                        : ''}
                                </span>
                            </div>
                            {dateParts.countdown && (
                                <span className="upcoming-holiday-countdown">
                                    {dateParts.countdown}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {holiday.imageUrl && holiday.photographerName && (
                    <span className="upcoming-holiday-attribution">
                        Photo by{' '}
                        {holiday.photographerUrl ? (
                            <a
                                href={holiday.photographerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {holiday.photographerName}
                            </a>
                        ) : (
                            holiday.photographerName
                        )}{' '}
                        on{' '}
                        <a
                            href="https://unsplash.com"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Unsplash
                        </a>
                    </span>
                )}
            </header>

            {activities.length > 0 && (
                <div className="upcoming-holiday-activities">
                    <h3 className="upcoming-holiday-section-label">
                        Things to do
                    </h3>
                    <ul className="upcoming-holiday-activity-list">
                        {activities.map((a) => (
                            <li
                                key={a.title}
                                className="upcoming-holiday-activity"
                            >
                                <span className="upcoming-holiday-activity-title">
                                    {a.title}
                                </span>
                                <span className="upcoming-holiday-activity-description">
                                    {a.description}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {places.length > 0 && (
                <div className="upcoming-holiday-places">
                    <h3 className="upcoming-holiday-section-label">
                        Places to celebrate it
                    </h3>
                    <div className="upcoming-holiday-grid">
                        {places.map((place) => (
                            <PlaceCard
                                key={cardKey(place)}
                                place={{
                                    id: cardKey(place),
                                    name: place.name,
                                    country: place.country,
                                    image: place.imageUrl ?? NO_IMAGE,
                                    tagline: place.why,
                                    photographerName: place.photographerName,
                                    photographerUrl: place.photographerUrl,
                                }}
                                onClick={() => void handleCardClick(place)}
                            />
                        ))}
                    </div>
                </div>
            )}

            <AddToItineraryModal
                ref={modalRef}
                place={
                    pending
                        ? {
                              name: pending.place.name,
                              country: pending.place.country,
                          }
                        : { name: '', country: '' }
                }
                tripName={trip.name}
                matchingDestinationCountryName={matchingCountryName}
                isMultiTrip={isMultiTrip}
                onAddToCurrent={handleAddToCurrent}
                onStartFresh={handleStartFresh}
            />

            <Snackbar
                open={Boolean(toast)}
                onClose={() => setToast(null)}
                autoHideDuration={2200}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                message={toast}
            />
        </section>
    );
};

export default UpcomingHoliday;
