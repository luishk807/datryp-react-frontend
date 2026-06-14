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
import { useTranslation } from 'react-i18next';
import classnames from 'classnames';
import PlaceCard from 'components/common/PlaceCard';
import PlaceCardSkeleton from 'components/common/PlaceCard/PlaceCardSkeleton';
import type { PlaceSuggestion } from 'api/placeSuggestionsApi';
import { usePlaceSuggestions } from 'api/hooks/usePlaceSuggestions';
import { usePlaceImage } from 'api/hooks/usePlaceImage';
import { useUser } from 'context/UserContext';
import { NO_IMAGE } from 'constants';
import './index.scss';

export type PlacesYouMightLoveVariant = 'home' | 'empty-trips';

export interface PlacesYouMightLoveProps {
    variant?: PlacesYouMightLoveVariant;
    title?: string;
    subtitle?: string;
}

const DEFAULT_KEYS: Record<
    PlacesYouMightLoveVariant,
    { title: string; subtitle: string }
> = {
    home: {
        title: 'homeCards.placesYouMightLove.home.title',
        subtitle: 'homeCards.placesYouMightLove.home.subtitle',
    },
    'empty-trips': {
        title: 'homeCards.placesYouMightLove.emptyTrips.title',
        subtitle: 'homeCards.placesYouMightLove.emptyTrips.subtitle',
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

/** One suggestion card. Pulled into its own component so it can resolve an
 *  image fallback per place: the AI suggestion sometimes lands without an
 *  `imageUrl` (e.g. the Unsplash enrichment was rate-limited at generate
 *  time, especially on a freshly-generated non-English set), which would
 *  otherwise paint the NO_IMAGE placeholder. `usePlaceImage` resolves a
 *  photo by name through the backend's multi-provider, server-cached
 *  `/places/image`, gated so it only fires when the suggestion has none. */
const PymlCard = ({
    place,
    variant,
    onClick,
}: {
    place: PlaceSuggestion;
    variant: PlacesYouMightLoveVariant;
    onClick: () => void;
}) => {
    const { t } = useTranslation();
    const { data: fallback } = usePlaceImage(place.name, null, place.country, {
        enabled: !place.imageUrl,
    });
    const image = place.imageUrl ?? fallback?.imageUrl ?? NO_IMAGE;

    if (variant === 'home') {
        return (
            <PlaceCard
                place={{
                    id: cardKey(place),
                    name: place.name,
                    country: place.country,
                    image,
                    tagline: place.why,
                    photographerName: place.photographerName,
                    photographerUrl: place.photographerUrl,
                }}
                onClick={onClick}
            />
        );
    }
    return (
        <li>
            <button
                type="button"
                className="pyml-card"
                onClick={onClick}
                aria-label={t('homeCards.common.openPlaceAria', {
                    name: place.name,
                    country: place.country,
                })}
            >
                <img
                    src={image}
                    alt=""
                    loading="lazy"
                    className="pyml-card-img"
                />
                <div className="pyml-card-body">
                    <span className="pyml-card-name">{place.name}</span>
                    <span className="pyml-card-country">{place.country}</span>
                    <p className="pyml-card-why">{place.why}</p>
                </div>
            </button>
        </li>
    );
};

const PlacesYouMightLove = ({
    variant = 'home',
    title,
    subtitle,
}: PlacesYouMightLoveProps) => {
    const { t } = useTranslation();
    const { user } = useUser();
    const navigate = useNavigate();
    const { data, isLoading, isError } = usePlaceSuggestions();

    if (!user) return null;

    const headerTitle = title ?? t(DEFAULT_KEYS[variant].title);
    const headerSubtitle = subtitle ?? t(DEFAULT_KEYS[variant].subtitle);

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
                        <PymlCard
                            key={cardKey(place)}
                            place={place}
                            variant={variant}
                            onClick={() => goToCity(navigate, place)}
                        />
                    ))}
                </div>
            ) : (
                <ul className="pyml-grid">
                    {visible.map((place) => (
                        <PymlCard
                            key={cardKey(place)}
                            place={place}
                            variant={variant}
                            onClick={() => goToCity(navigate, place)}
                        />
                    ))}
                </ul>
            )}
        </section>
    );
};

export default PlacesYouMightLove;
