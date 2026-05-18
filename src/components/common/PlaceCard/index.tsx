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
    return (
        <button type="button" className="place-card" onClick={onClick}>
            <div className="place-card-image-wrap">
                <img
                    src={place.image}
                    alt={`${place.name}, ${place.country}`}
                    className="place-card-image"
                    loading="lazy"
                />
                {hasAttribution && (
                    <span className="place-card-attribution">
                        Photo by{' '}
                        {place.photographerUrl ? (
                            <a
                                href={place.photographerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={stopPropagation}
                            >
                                {place.photographerName}
                            </a>
                        ) : (
                            place.photographerName
                        )}{' '}
                        on{' '}
                        <a
                            href="https://unsplash.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={stopPropagation}
                        >
                            Unsplash
                        </a>
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
        </button>
    );
};

export default PlaceCard;
