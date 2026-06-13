import './index.scss';
import classNames from 'classnames';
import { useNavigate } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarHalfRoundedIcon from '@mui/icons-material/StarHalfRounded';
import StarOutlineRoundedIcon from '@mui/icons-material/StarOutlineRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import ShareButton from 'components/ShareButton';
import type { PlaceRecommendation } from 'types';

interface PlaceResultCardProps {
    place: PlaceRecommendation;
    /** Query and index needed to deep-link to the detail page (/place?q=&i=). */
    query: string;
    index: number;
}

/** Click handler that stops the card-wide navigation when a nested
 *  interactive element (attribution link, share button) is clicked. */
const stopProp = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
};

const Stars = ({ rating }: { rating: number }) => {
    const { t } = useTranslation();
    // Clamp + render 5 stars: filled / half / empty.
    const clamped = Math.max(0, Math.min(5, rating));
    const full = Math.floor(clamped);
    const hasHalf = clamped - full >= 0.5;
    const empty = 5 - full - (hasHalf ? 1 : 0);
    return (
        <span
            className="place-result-card-stars"
            aria-label={t('search.card.ratingAria', { rating: clamped })}
        >
            {Array.from({ length: full }).map((_, i) => (
                <StarRoundedIcon key={`f-${i}`} className="place-result-card-star filled" />
            ))}
            {hasHalf && <StarHalfRoundedIcon className="place-result-card-star filled" />}
            {Array.from({ length: empty }).map((_, i) => (
                <StarOutlineRoundedIcon key={`e-${i}`} className="place-result-card-star" />
            ))}
            <span className="place-result-card-rating-num">{clamped.toFixed(1)}</span>
        </span>
    );
};

const PlaceResultCard = ({ place, query, index }: PlaceResultCardProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const isPlaceholder = !place.imageUrl;
    const hasAttribution = !isPlaceholder && place.photographerName;
    const detailUrl = `/place?q=${encodeURIComponent(query)}&i=${index}`;
    // Absolute URL used by Share so the recipient lands on this specific
    // place's detail page, not the broader search results.
    const sharePlaceUrl =
        typeof window !== 'undefined'
            ? new URL(detailUrl, window.location.origin).href
            : detailUrl;

    const handleCardClick = () => navigate(detailUrl);
    const handleCardKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate(detailUrl);
        }
    };

    return (
        <article
            className="place-result-card"
            role="button"
            tabIndex={0}
            aria-label={t('search.card.openAria', { name: place.name })}
            onClick={handleCardClick}
            onKeyDown={handleCardKeyDown}
        >
            <div
                className={classNames('place-result-card-image', {
                    'is-placeholder': isPlaceholder,
                })}
                role={isPlaceholder ? 'img' : undefined}
                aria-label={isPlaceholder ? place.name : undefined}
            >
                {!isPlaceholder && (
                    <img src={place.imageUrl as string} alt={place.name} loading="lazy" />
                )}
                {hasAttribution && (
                    <span
                        className="place-result-card-attribution"
                        onClick={stopProp}
                    >
                        <Trans
                            i18nKey="home.attribution"
                            values={{ name: place.photographerName }}
                            components={{
                                author: place.photographerUrl ? (
                                    <a
                                        href={place.photographerUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={stopProp}
                                    />
                                ) : (
                                    <span />
                                ),
                                unsplash: (
                                    <a
                                        href="https://unsplash.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={stopProp}
                                    />
                                ),
                            }}
                        />
                    </span>
                )}
            </div>
            <div className="place-result-card-body">
                <h3 className="place-result-card-name">{place.name}</h3>
                <p className="place-result-card-location">
                    {place.city} · {place.country}
                </p>
                <Stars rating={place.rating} />
                <p className="place-result-card-best-time">
                    <AccessTimeRoundedIcon className="place-result-card-best-time-icon" />
                    {t('search.card.bestTime', { time: place.bestTimeToVisit })}
                </p>
                <p className="place-result-card-description">{place.description}</p>
                <div className="place-result-card-actions" onClick={stopProp}>
                    <ShareButton
                        title={place.name}
                        subtitle={`${place.city} · ${place.country}`}
                        url={sharePlaceUrl}
                        emailPayload={{
                            name: place.name,
                            city: place.city,
                            country: place.country,
                            description: place.description,
                            image_url: place.imageUrl,
                        }}
                    />
                </div>
            </div>
        </article>
    );
};

export default PlaceResultCard;
