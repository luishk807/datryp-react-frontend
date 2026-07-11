import { Trans } from 'react-i18next';
import './index.scss';

export interface PlaceCardData {
    id: number | string;
    name: string;
    country: string;
    image: string;
    tagline?: string;
    /** Unsplash photographer attribution. Required by Unsplash's API terms
     *  whenever we display one of their photos. Rendered as a small badge
     *  in the bottom-right corner of the image when provided. */
    photographerName?: string | null;
    photographerUrl?: string | null;
}

export interface PlaceCardProps {
    place: PlaceCardData;
    onClick?: () => void;
}

const stopPropagation: React.MouseEventHandler = (e) => e.stopPropagation();

const PlaceCard = ({ place, onClick }: PlaceCardProps) => {
    const hasAttribution = Boolean(place.photographerName);
    // The card is a plain container, not a <button>: it must hold the Unsplash
    // attribution <a> links, and a button may not contain focusable descendants
    // (WCAG "nested-interactive"). Instead, a single stretched, transparent
    // action button overlays the whole card as the primary click/keyboard
    // target, and the attribution links sit above it (z-index) so they stay
    // independently clickable.
    return (
        <div className="place-card">
            <div className="place-card-image-wrap">
                <img
                    src={place.image}
                    alt=""
                    className="place-card-image"
                    loading="lazy"
                />
                {hasAttribution && (
                    <span className="place-card-attribution">
                        <Trans
                            i18nKey="home.attribution"
                            values={{ name: place.photographerName }}
                            components={{
                                author: place.photographerUrl ? (
                                    <a
                                        href={place.photographerUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={stopPropagation}
                                    />
                                ) : (
                                    <span />
                                ),
                                unsplash: (
                                    <a
                                        href="https://unsplash.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={stopPropagation}
                                    />
                                ),
                            }}
                        />
                    </span>
                )}
            </div>
            <div className="place-card-content">
                <p className="place-card-country">{place.country}</p>
                <h3 className="place-card-name">{place.name}</h3>
                {place.tagline && (
                    <p className="place-card-tagline">{place.tagline}</p>
                )}
            </div>
            <button
                type="button"
                className="place-card-action"
                onClick={onClick}
                aria-label={`${place.name}, ${place.country}`}
            />
        </div>
    );
};

export default PlaceCard;
