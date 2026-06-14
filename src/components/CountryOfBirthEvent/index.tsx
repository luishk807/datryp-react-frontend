/**
 * "Coming up in {your country of birth}" homepage section.
 *
 * Mirrors `WorldEvent`'s layout 1:1 — same split card, same Top Spots
 * grid, same Unsplash attribution treatment. The only differences are
 * the data source (`useCountryOfBirthEvent` instead of `useWorldEvent`)
 * and the eyebrow copy ("Coming up in <country>" instead of "Upcoming
 * event"). We deliberately reuse the `.world-event-*` SCSS classes
 * rather than copy 300 lines of styles — both sections render the
 * same shape and the visual treatment should stay in lockstep.
 *
 * Hidden entirely for:
 *   - Signed-out visitors (hook is gated on `user.countryOfBirthCode`)
 *   - Users without a `country_of_birth_code` set on their profile
 *   - Quiet windows where AI returns no major event for that country
 *     (backend 204)
 */
import { useNavigate } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import Skeleton from 'components/common/Skeleton';
import type { CountryOfBirthEventPlace } from 'api/countryOfBirthEventApi';
import { useCountryOfBirthEvent } from 'api/hooks/useCountryOfBirthEvent';
import { isUsableHeroUrl } from 'utils/heroImages';
import PlaceThumb from 'components/common/PlaceThumb';
import 'components/WorldEvent/index.scss';

const formatShort = (iso: string): string => {
    if (!iso) return '';
    const parsed = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return iso;
    return parsed.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    });
};

const formatRange = (start: string, end: string): string => {
    const startLabel = formatShort(start);
    const endLabel = formatShort(end);
    if (!startLabel) return endLabel;
    if (!endLabel || startLabel === endLabel) return startLabel;
    return `${startLabel} – ${endLabel}`;
};

const cardKey = (place: CountryOfBirthEventPlace) =>
    `${place.name}--${place.countryCode}`;

const goToCity = (
    navigate: (to: string) => void,
    place: CountryOfBirthEventPlace,
) => {
    navigate(
        `/city?name=${encodeURIComponent(place.name)}` +
            `&country=${encodeURIComponent(place.country)}` +
            `&code=${encodeURIComponent(place.countryCode)}` +
            `&mode=single`,
    );
};

const CountryOfBirthEvent = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { data, isLoading, isError } = useCountryOfBirthEvent();

    // The hook short-circuits when the user has no country_of_birth_code
    // set (`enabled: Boolean(user?.countryOfBirthCode)`). In that case
    // `isLoading` stays false and `data` is undefined — render nothing.
    if (!isLoading && (isError || !data)) return null;

    if (isLoading) {
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
                            <span>
                                {t('homeCards.countryOfBirthEvent.eyebrow', {
                                    country: t(
                                        'homeCards.countryOfBirthEvent.yourCountry',
                                    ),
                                })}
                            </span>
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

    if (!data) return null;
    const { event, places } = data;
    // Some events come back without their own photo — rather than paint a blank
    // gradient, fall back to the first usable photo from the host-country's
    // "best places" list so the card always shows a relevant image.
    const heroImage = isUsableHeroUrl(event.imageUrl)
        ? event.imageUrl
        : places.find((p) => isUsableHeroUrl(p.imageUrl))?.imageUrl ?? null;
    // Last-resort hero: resolve a photo by the first place's name when neither
    // the event nor any place carries an image_url.
    const heroFallbackPlace = !heroImage
        ? places.find((p) => p.name)
        : undefined;

    return (
        <section className="world-event">
            <article className="world-event-card">
                <div className="world-event-photo-wrap">
                    {heroImage ? (
                        <img
                            src={heroImage}
                            alt=""
                            className="world-event-photo"
                            loading="lazy"
                        />
                    ) : heroFallbackPlace ? (
                        <PlaceThumb
                            name={heroFallbackPlace.name}
                            country={heroFallbackPlace.country}
                            className="world-event-photo"
                        />
                    ) : (
                        <div className="world-event-photo-fallback" />
                    )}
                    <div
                        className="world-event-photo-scrim"
                        aria-hidden="true"
                    />
                    {event.imageUrl && event.photographerName && (
                        <span className="world-event-attribution">
                            <Trans
                                i18nKey="home.attribution"
                                values={{ name: event.photographerName }}
                                components={{
                                    author: event.photographerUrl ? (
                                        <a
                                            href={event.photographerUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        />
                                    ) : (
                                        <span />
                                    ),
                                    unsplash: (
                                        <a
                                            href="https://unsplash.com"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        />
                                    ),
                                }}
                            />
                        </span>
                    )}
                </div>
                <div className="world-event-body">
                    <div className="world-event-eyebrow">
                        <EmojiEventsRoundedIcon
                            className="world-event-eyebrow-icon"
                            fontSize="small"
                        />
                        <span>
                            {t('homeCards.countryOfBirthEvent.eyebrow', {
                                country:
                                    event.hostCountry ||
                                    t(
                                        'homeCards.countryOfBirthEvent.yourCountry',
                                    ),
                            })}
                        </span>
                    </div>
                    <h2 className="world-event-name">{event.name}</h2>
                    <div className="world-event-meta">
                        <span className="world-event-meta-chip">
                            {formatRange(event.startDate, event.endDate)}
                        </span>
                        {event.hostCountry && (
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
                    <h3 className="world-event-places-label">
                        {t('homeCards.worldEvent.topSpots')}
                    </h3>
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
                                    aria-label={t(
                                        'homeCards.common.openPlaceAria',
                                        {
                                            name: place.name,
                                            country: place.country,
                                        },
                                    )}
                                >
                                    <PlaceThumb
                                        name={place.name}
                                        country={place.country}
                                        imageUrl={place.imageUrl}
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

export default CountryOfBirthEvent;
