import './index.scss';
import PlaceCard from 'components/common/PlaceCard';
import { topPlaces, type TopPlace } from 'sample/topPlaces';

export interface TopPlacesProps {
    onPlaceClick: (place: TopPlace) => void;
    title?: string;
    subtitle?: string;
}

const TopPlaces = ({
    onPlaceClick,
    title = 'Top 6 places to travel',
    subtitle = 'Get inspired',
}: TopPlacesProps) => {
    const places = topPlaces;

    return (
        <section className="top-places">
            <div className="top-places-header">
                <h2 className="top-places-title">{title}</h2>
                {subtitle && <span className="top-places-subtitle">{subtitle}</span>}
            </div>
            <div className="top-places-grid">
                {places.map((place) => (
                    <PlaceCard
                        key={place.id}
                        place={place}
                        onClick={() => onPlaceClick(place)}
                    />
                ))}
            </div>
        </section>
    );
};

export default TopPlaces;
