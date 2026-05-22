/**
 * "Biggest upcoming world event" homepage section — Pro feature.
 *
 * Layout (desktop):
 *   ┌─────────────────────────┬───────────────────────────┐
 *   │                         │ UPCOMING EVENT            │
 *   │                         │ Event name (big)          │
 *   │   Big event photo       │ Date range · Host country │
 *   │   (left half)           │ "Hype tagline" (italic)   │
 *   │                         │ Description               │
 *   │                         │ ┌────────┐ ┌────────┐     │
 *   │                         │ │Card 1  │ │Card 2  │     │
 *   │                         │ └────────┘ └────────┘     │
 *   │                         │ ┌────────┐ ┌────────┐     │
 *   │                         │ │Card 3  │ │Card 4  │     │
 *   │                         │ └────────┘ └────────┘     │
 *   └─────────────────────────┴───────────────────────────┘
 *
 * Card click semantics: navigate to the matching city detail page so
 * the user can read about the destination before deciding to add it
 * to a trip. Matches `PlacesYouMightLove`. The detail page's "Start
 * planning" CTA dispatches the city as activity #1 with image saved
 * at both trip and activity level — see `CityDetail.startTrip`.
 *
 * Hidden entirely for:
 *   - Signed-out visitors
 *   - Free users (no Pro entitlement → hook short-circuits)
 *   - Quiet weeks where AI returns no major event (backend 204)
 */
import { useNavigate } from 'react-router-dom';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import Skeleton from 'components/common/Skeleton';
import type { WorldEventPlace } from 'api/worldEventApi';
import { useWorldEvent } from 'api/hooks/useWorldEvent';
import { NO_IMAGE } from 'constants';
import './index.scss';

/** Format an ISO date as "Jun 11". Used inside the date-range chip. */
const formatShort = (iso: string): string => {
    if (!iso) return '';
    const parsed = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return iso;
    return parsed.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    });
};

/** Render the date range — collapses to a single date for one-day events. */
const formatRange = (start: string, end: string): string => {
    const startLabel = formatShort(start);
    const endLabel = formatShort(end);
    if (!startLabel) return endLabel;
    if (!endLabel || startLabel === endLabel) return startLabel;
    return `${startLabel} – ${endLabel}`;
};

const cardKey = (place: WorldEventPlace) =>
    `${place.name}--${place.countryCode}`;

const goToCity = (
    navigate: (to: string) => void,
    place: WorldEventPlace
) => {
    navigate(
        `/city?name=${encodeURIComponent(place.name)}` +
            `&country=${encodeURIComponent(place.country)}` +
            `&code=${encodeURIComponent(place.countryCode)}` +
            `&mode=single`
    );
};

const WorldEvent = () => {
    // Open to everyone — anonymous, free, Pro. The backend payload is
    // globally cached (one OpenAI call per ISO week serves everyone),
    // so this section is a free homepage wow-moment with no per-user
    // cost. Card clicks open the city detail page in all cases.
    return <WorldEventActive />;
};

// Active path lives in its own component so the conditional useQuery
// pattern doesn't violate the rules of hooks — WorldEvent returns
// early for free users before this is rendered.
const WorldEventActive = () => {
    const navigate = useNavigate();
    const { data, isLoading, isError } = useWorldEvent();

    if (isLoading) {
        // Skeleton mirrors the production split-card so the layout
        // doesn't reflow when real data arrives. Left: shimmering photo
        // placeholder. Right: eyebrow pill (real, since copy is fixed)
        // + title/meta/description shimmers + 2×2 mini place cards.
        return (
            <section className="world-event" aria-live="polite">
                <article className="world-event-card world-event-card-loading">
                    <div className="world-event-photo-wrap">
                        <div className="world-event-loading-photo" />
                    </div>
                    <div className="world-event-body">
                        <div className="world-event-eyebrow">
                            <EmojiEventsRoundedIcon
                                className="world-event-eyebrow-icon"
                                fontSize="small"
                            />
                            <span>Upcoming event</span>
                        </div>
                        <Skeleton width="80%" height={32} radius={8} />
                        <div className="world-event-loading-meta">
                            <Skeleton width={84} height={22} radius={999} />
                            <Skeleton width={120} height={14} radius={4} />
                        </div>
                        <Skeleton width="90%" height={18} radius={6} />
                        <Skeleton width="100%" height={12} radius={4} />
                        <Skeleton width="95%" height={12} radius={4} />
                        <Skeleton width="60%" height={12} radius={4} />
                        <Skeleton
                            width={120}
                            height={12}
                            radius={4}
                            className="world-event-loading-places-label"
                        />
                        <ul className="world-event-places">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <li
                                    key={i}
                                    className="world-event-place world-event-place-loading"
                                >
                                    <Skeleton
                                        width={56}
                                        height={56}
                                        radius={10}
                                    />
                                    <div className="world-event-place-loading-body">
                                        <Skeleton
                                            width="70%"
                                            height={12}
                                            radius={4}
                                        />
                                        <Skeleton
                                            width="45%"
                                            height={10}
                                            radius={4}
                                        />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </article>
            </section>
        );
    }

    // 204 / fetch error / empty payload → render nothing.
    if (isError || !data) return null;

    const { event, places } = data;
    const showHost =
        event.hostCountry &&
        event.hostCountry.toLowerCase() !== 'international';

    return (
        <section className="world-event">
            <article className="world-event-card">
                {/* LEFT — big hero photo of the event */}
                <div className="world-event-photo-wrap">
                    {event.imageUrl ? (
                        <img
                            src={event.imageUrl}
                            alt=""
                            className="world-event-photo"
                            loading="lazy"
                        />
                    ) : (
                        <div className="world-event-photo-fallback" />
                    )}
                    <div className="world-event-photo-scrim" aria-hidden="true" />
                    {event.imageUrl && event.photographerName && (
                        <span className="world-event-attribution">
                            Photo by{' '}
                            {event.photographerUrl ? (
                                <a
                                    href={event.photographerUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {event.photographerName}
                                </a>
                            ) : (
                                event.photographerName
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
                </div>

                {/* RIGHT — event details + 2×2 place grid */}
                <div className="world-event-body">
                    <div className="world-event-eyebrow">
                        <EmojiEventsRoundedIcon
                            className="world-event-eyebrow-icon"
                            fontSize="small"
                        />
                        <span>Upcoming event</span>
                    </div>

                    <h2 className="world-event-name">{event.name}</h2>

                    <div className="world-event-meta">
                        <span className="world-event-meta-chip">
                            {formatRange(event.startDate, event.endDate)}
                        </span>
                        {showHost && (
                            <span className="world-event-meta-host">
                                <PlaceRoundedIcon fontSize="small" />
                                {event.hostCountry}
                            </span>
                        )}
                    </div>

                    {event.hype && (
                        <p className="world-event-hype">“{event.hype}”</p>
                    )}

                    {event.description && (
                        <p className="world-event-description">
                            {event.description}
                        </p>
                    )}

                    <h3 className="world-event-places-label">Top spots to be</h3>
                    <ul className="world-event-places">
                        {places.map((place) => (
                            <li
                                key={cardKey(place)}
                                className="world-event-place"
                            >
                                <button
                                    type="button"
                                    className="world-event-place-btn"
                                    onClick={() => goToCity(navigate, place)}
                                    aria-label={`Open ${place.name}, ${place.country}`}
                                >
                                    <img
                                        src={place.imageUrl ?? NO_IMAGE}
                                        alt=""
                                        loading="lazy"
                                        className="world-event-place-img"
                                    />
                                    <div className="world-event-place-body">
                                        <span className="world-event-place-name">
                                            {place.name}
                                        </span>
                                        <span className="world-event-place-country">
                                            {place.country}
                                        </span>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </article>
        </section>
    );
};

export default WorldEvent;
