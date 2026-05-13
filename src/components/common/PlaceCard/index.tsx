import './index.scss';

export interface PlaceCardData {
    id: number | string;
    name: string;
    country: string;
    image: string;
    tagline?: string;
}

export interface PlaceCardProps {
    place: PlaceCardData;
    onClick?: () => void;
}

const PlaceCard = ({ place, onClick }: PlaceCardProps) => {
    return (
        <button type="button" className="place-card" onClick={onClick}>
            <div className="place-card-image-wrap">
                <img
                    src={place.image}
                    alt={`${place.name}, ${place.country}`}
                    className="place-card-image"
                    loading="lazy"
                />
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
