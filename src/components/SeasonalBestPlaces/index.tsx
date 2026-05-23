/**
 * "Best places this month" homepage section — Pro feature.
 *
 * Shows 6 globally-curated destinations whose CURRENT month is the
 * right time of year (Kyoto in May for azaleas, Iceland in June for
 * midnight sun, Mexico beaches in February for warm + dry, etc.).
 *
 * Same picks for every Pro user; the backend caches in-memory by ISO
 * month so the OpenAI cost is one call per month per process.
 *
 * Card behavior: click → city detail page (`/city?name=...&country=...
 * &code=...&mode=single`). Same target as the WorldEvent and
 * UpcomingHoliday "Places to celebrate it" rows.
 *
 * Hidden for signed-out + free-tier users — the query hook is gated on
 * Pro entitlement so the backend never sees a 402.
 */
import { useNavigate } from 'react-router-dom';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import PlaceCardSkeleton from 'components/common/PlaceCard/PlaceCardSkeleton';
import PlaceCard from 'components/common/PlaceCard';
import { useSeasonalBestPlaces } from 'api/hooks/useSeasonalBestPlaces';
import type { SeasonalPlace } from 'api/seasonalBestPlacesApi';
import { useUser } from 'context/UserContext';
import { NO_IMAGE } from 'constants';
import './index.scss';

const monthLabel = (monthKey: string): string => {
    // monthKey looks like "2026-05". Convert to "May 2026" for the
    // headline. Defensive parse — fall back to the raw key if the
    // format is unexpected.
    const m = /^(\d{4})-(\d{2})$/.exec(monthKey);
    if (!m) return monthKey;
    const year = Number(m[1]);
    const monthIdx = Number(m[2]) - 1;
    const date = new Date(Date.UTC(year, monthIdx, 1));
    return date.toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
    });
};

const SeasonalBestPlaces = () => {
    const { user, isAdmin } = useUser();
    const isPro = Boolean(user && (user.isPaidMember || isAdmin));

    // Hidden for non-Pro users.
    if (!user || !isPro) return null;

    return <SeasonalBestPlacesActive />;
};

const SeasonalBestPlacesActive = () => {
    const navigate = useNavigate();
    const { data, isLoading, isError } = useSeasonalBestPlaces();

    const cardKey = (place: SeasonalPlace) =>
        `${place.name}--${place.countryCode}`;

    const goToCity = (place: SeasonalPlace) => {
        navigate(
            `/city?name=${encodeURIComponent(place.name)}` +
                `&country=${encodeURIComponent(place.country)}` +
                `&code=${encodeURIComponent(place.countryCode)}` +
                `&mode=single`,
        );
    };

    if (isLoading) {
        return (
            <section
                className="seasonal-best-places"
                aria-live="polite"
            >
                <header className="seasonal-best-places-header">
                    <span className="seasonal-best-places-eyebrow">
                        <CalendarMonthRoundedIcon
                            className="seasonal-best-places-eyebrow-icon"
                            fontSize="small"
                        />
                        <span>Best places this month</span>
                    </span>
                    <h2 className="seasonal-best-places-title">
                        Curating this month&rsquo;s seasonal picks&hellip;
                    </h2>
                </header>
                <div className="seasonal-best-places-grid">
                    <PlaceCardSkeleton count={6} />
                </div>
            </section>
        );
    }

    if (isError || !data || data.places.length === 0) return null;

    return (
        <section className="seasonal-best-places">
            <header className="seasonal-best-places-header">
                <span className="seasonal-best-places-eyebrow">
                    <CalendarMonthRoundedIcon
                        className="seasonal-best-places-eyebrow-icon"
                        fontSize="small"
                    />
                    <span>Best places this month</span>
                </span>
                <h2 className="seasonal-best-places-title">
                    Where the season is right in {monthLabel(data.monthKey)}
                </h2>
                <p className="seasonal-best-places-subtitle">
                    Six destinations whose weather, festivals, or natural
                    moments make this month the time to go.
                </p>
            </header>
            <div className="seasonal-best-places-grid">
                {data.places.map((place) => (
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
                        onClick={() => goToCity(place)}
                    />
                ))}
            </div>
        </section>
    );
};

export default SeasonalBestPlaces;
