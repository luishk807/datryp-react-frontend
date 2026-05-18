import './index.scss';
import PlaceCard from 'components/common/PlaceCard';
import { useMonthlyTopCities } from 'api/hooks/useMonthlyTopCities';
import { NO_IMAGE } from 'constants';
import type { TopPlace } from 'sample/topPlaces';

export interface TopPlacesProps {
    /** Card click handler — receives the same `TopPlace` shape Home expects,
     *  built from the live monthly city. */
    onPlaceClick: (place: TopPlace) => void;
    title?: string;
    subtitle?: string;
}

const formatMonth = (monthKey: string): string => {
    // monthKey is "YYYY-MM"; convert to "May 2026".
    const [year, monthStr] = monthKey.split('-');
    const month = Number(monthStr);
    if (!year || Number.isNaN(month) || month < 1 || month > 12) return '';
    const date = new Date(Number(year), month - 1, 1);
    return date.toLocaleString(undefined, {
        month: 'long',
        year: 'numeric',
    });
};

const TopPlaces = ({
    onPlaceClick,
    title = 'Top 6 cities to travel',
    subtitle,
}: TopPlacesProps) => {
    const { data, isLoading, isError } = useMonthlyTopCities();

    // Subtitle defaults to the month label so the user understands the list
    // rotates monthly. Falls back to the caller's override if provided.
    const effectiveSubtitle =
        subtitle ??
        (data ? `Curated for ${formatMonth(data.month)}` : 'Get inspired');

    return (
        <section className="top-places">
            <div className="top-places-header">
                <h2 className="top-places-title">{title}</h2>
                {effectiveSubtitle && (
                    <span className="top-places-subtitle">
                        {effectiveSubtitle}
                    </span>
                )}
            </div>

            {isLoading && (
                <p className="top-places-msg">Loading this month's picks…</p>
            )}

            {isError && (
                <p
                    className="top-places-msg top-places-error"
                    role="alert"
                >
                    Couldn't load this month's picks. Try again later.
                </p>
            )}

            {!isLoading && !isError && data && (
                <div className="top-places-grid">
                    {data.cities.map((city) => {
                        const place: TopPlace = {
                            // Slug stays stable across renders; safer than
                            // the array index when the list shuffles monthly.
                            id: `${city.name}--${city.countryCode}`,
                            name: city.name,
                            country: city.country,
                            countryCode: city.countryCode,
                            image: city.imageUrl ?? NO_IMAGE,
                            tagline: city.why,
                        };
                        return (
                            <PlaceCard
                                key={place.id}
                                place={{
                                    ...place,
                                    photographerName: city.photographerName,
                                    photographerUrl: city.photographerUrl,
                                }}
                                onClick={() => onPlaceClick(place)}
                            />
                        );
                    })}
                </div>
            )}
        </section>
    );
};

export default TopPlaces;
