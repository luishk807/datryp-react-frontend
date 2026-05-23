/**
 * "Upcoming holiday" homepage section — Pro feature.
 *
 * Shows the next major holiday in the user's country of birth, six
 * cities to celebrate it in, and four things-to-do suggestions.
 *
 * Card behavior: clicking a "Places to celebrate it" card navigates the
 * user to that city's detail page (`/city?name=...&country=...&code=...
 * &mode=single`) — matching how `WorldEvent` and `PlacesYouMightLove`
 * place cards behave. The previous "add directly to itinerary on click"
 * flow was removed: it was confusing alongside the rest of the homepage
 * (which previews the destination first), and there's an Add to
 * Itinerary affordance on the city detail page itself anyway.
 *
 * Free users see no section — the query hook is gated on Pro
 * entitlement so the backend never gets called for non-Pro users.
 */
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import { useNavigate } from 'react-router-dom';
import Skeleton from 'components/common/Skeleton';
import PlaceCardSkeleton from 'components/common/PlaceCard/PlaceCardSkeleton';
import PlaceCard from 'components/common/PlaceCard';
import type { HolidayPlace } from 'api/holidaySuggestionsApi';
import { useHolidaySuggestions } from 'api/hooks/useHolidaySuggestions';
import { useUser } from 'context/UserContext';
import { NO_IMAGE } from 'constants';
import './index.scss';

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
    const isPro = Boolean(user && (user.isPaidMember || isAdmin));

    // Hidden completely for signed-out + free-tier users. We deliberately
    // don't render a Pro teaser here — the feature exists for Pro
    // members without advertising itself to everyone else.
    if (!user || !isPro) return null;

    return <UpcomingHolidayActive />;
};

// Pro path lives in its own component so the conditional `useQuery`
// pattern doesn't violate the rules of hooks — `UpcomingHoliday`
// returns early for free users before this is rendered.
const UpcomingHolidayActive = () => {
    const navigate = useNavigate();
    const { data, isLoading, isError } = useHolidaySuggestions();

    const cardKey = (place: HolidayPlace) =>
        `${place.name}--${place.countryCode}`;

    const goToCity = (place: HolidayPlace) => {
        navigate(
            `/city?name=${encodeURIComponent(place.name)}` +
                `&country=${encodeURIComponent(place.country)}` +
                `&code=${encodeURIComponent(place.countryCode)}` +
                `&mode=single`
        );
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
                                onClick={() => goToCity(place)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
};

export default UpcomingHoliday;
