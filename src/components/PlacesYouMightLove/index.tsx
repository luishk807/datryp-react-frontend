/**
 * "Places you might love" — personalized homepage section.
 *
 * Fetches `/me/place-suggestions` (OpenAI-powered, per-user weekly cache
 * on the backend) and renders 6 destination cards tied to the user's
 * onboarding preferences.
 *
 * Card click semantics: navigate to the matching city detail page so
 * the user can read about the destination before deciding to add it to
 * a trip. Matches the behavior of `TopPlaces` cards — both feeds are
 * discovery surfaces; the actual "Add to itinerary" action lives on
 * the detail page once they've read more.
 *
 * Two render modes:
 *   - "home" (default): reuses the shared `PlaceCard` and the same
 *     3×2 responsive grid as `TopPlaces`.
 *   - "empty-trips": compact 4-card layout used in the empty /trips
 *     state.
 *
 * Hidden entirely for signed-out visitors (the query is gated by
 * `useUser`).
 */
import { useNavigate } from 'react-router-dom';
import classnames from 'classnames';
import PlaceCard from 'components/common/PlaceCard';
import PlaceCardSkeleton from 'components/common/PlaceCard/PlaceCardSkeleton';
import type { PlaceSuggestion } from 'api/placeSuggestionsApi';
import { usePlaceSuggestions } from 'api/hooks/usePlaceSuggestions';
import { useUser } from 'context/UserContext';
import { NO_IMAGE } from 'constants';
import './index.scss';

export type PlacesYouMightLoveVariant = 'home' | 'empty-trips';

export interface PlacesYouMightLoveProps {
    variant?: PlacesYouMightLoveVariant;
    title?: string;
    subtitle?: string;
}

const DEFAULTS: Record<
    PlacesYouMightLoveVariant,
    { title: string; subtitle: string }
> = {
    home: {
        title: 'Places you might love',
        subtitle: 'Picked for you',
    },
    'empty-trips': {
        title: 'No trips yet — try one of these',
        subtitle:
            "Tap any card to read more about the place. We picked these based on what you told us during signup.",
    },
};

const cardKey = (place: PlaceSuggestion) =>
    `${place.name}--${place.countryCode}`;

const goToCity = (
    navigate: (to: string) => void,
    place: PlaceSuggestion
) => {
    navigate(
        `/city?name=${encodeURIComponent(place.name)}` +
            `&country=${encodeURIComponent(place.country)}` +
            `&code=${encodeURIComponent(place.countryCode)}` +
            `&mode=single`
    );
};

const PlacesYouMightLove = ({
    variant = 'home',
    title,
    subtitle,
}: PlacesYouMightLoveProps) => {
    const { user } = useUser();
    const navigate = useNavigate();
    const { data, isLoading, isError } = usePlaceSuggestions();

    if (!user) return null;

    const headerTitle = title ?? DEFAULTS[variant].title;
    const headerSubtitle = subtitle ?? DEFAULTS[variant].subtitle;

    if (isLoading) {
        // Match the real layout's card count per variant so the grid
        // doesn't reshape when results land.
        const skeletonCount = variant === 'empty-trips' ? 4 : 6;
        return (
            <section
                className={classnames('places-you-might-love', `is-${variant}`)}
                aria-live="polite"
            >
                <div className="pyml-header">
                    <h2 className="pyml-title">{headerTitle}</h2>
                    {headerSubtitle && (
                        <span className="pyml-subtitle">{headerSubtitle}</span>
                    )}
                </div>
                {variant === 'home' ? (
                    <div className="pyml-grid-home">
                        <PlaceCardSkeleton count={skeletonCount} />
                    </div>
                ) : (
                    <ul className="pyml-grid">
                        {Array.from({ length: skeletonCount }).map((_, i) => (
                            <li key={i}>
                                <PlaceCardSkeleton />
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        );
    }

    // Suppress the whole section on a backend failure — empty state is
    // friendlier than an error message in the homepage flow.
    if (isError || !data || data.length === 0) return null;

    // Empty-trips shows a tighter 4-card list; homepage uses all 6.
    const visible = variant === 'empty-trips' ? data.slice(0, 4) : data;

    return (
        <section className={classnames('places-you-might-love', `is-${variant}`)}>
            <div className="pyml-header">
                <h2 className="pyml-title">{headerTitle}</h2>
                {headerSubtitle && (
                    <span className="pyml-subtitle">{headerSubtitle}</span>
                )}
            </div>

            {variant === 'home' ? (
                <div className="pyml-grid-home">
                    {visible.map((place) => (
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
                            onClick={() => goToCity(navigate, place)}
                        />
                    ))}
                </div>
            ) : (
                <ul className="pyml-grid">
                    {visible.map((place) => (
                        <li key={cardKey(place)}>
                            <button
                                type="button"
                                className="pyml-card"
                                onClick={() => goToCity(navigate, place)}
                                aria-label={`Open ${place.name}, ${place.country}`}
                            >
                                <img
                                    src={place.imageUrl ?? NO_IMAGE}
                                    alt=""
                                    loading="lazy"
                                    className="pyml-card-img"
                                />
                                <div className="pyml-card-body">
                                    <span className="pyml-card-name">
                                        {place.name}
                                    </span>
                                    <span className="pyml-card-country">
                                        {place.country}
                                    </span>
                                    <p className="pyml-card-why">{place.why}</p>
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
};

export default PlacesYouMightLove;
