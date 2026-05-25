/**
 * "Your top pick for [Month]" — personalized monthly Pro homepage card.
 *
 * Picks ONE city tailored to the user's age + country + gender +
 * interests + traveler styles. Renders as a split-card with the place
 * photo on the left and the AI-written pitch + highlights on the right.
 *
 * Card click → /country detail page with `?seed=monthly-best-place` so
 * the country page can offer a "plan trip with these picks" CTA that
 * auto-seeds the 4 highlights as activities (saves the user from
 * guessing what to add).
 *
 * Hidden entirely for signed-out + free-tier users (Pro-only, no teaser
 * — matches the silent-surprise pattern we use for Holiday).
 */
import { useNavigate } from 'react-router-dom';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import Skeleton from 'components/common/Skeleton';
import type { MonthlyBestPlaceInfo } from 'api/monthlyBestPlaceApi';
import { useMonthlyBestPlace } from 'api/hooks/useMonthlyBestPlace';
import { useUser } from 'context/UserContext';
import { getUserFirstName } from 'utils/userName';
import './index.scss';

const monthLabel = (monthKey: string): string => {
    // monthKey is "YYYY-MM"; render as "May 2026".
    const [year, monthStr] = monthKey.split('-');
    const month = Number(monthStr);
    if (!year || Number.isNaN(month) || month < 1 || month > 12) return '';
    const d = new Date(Number(year), month - 1, 1);
    return d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
};

const goToCountryWithSeed = (
    navigate: (to: string) => void,
    place: MonthlyBestPlaceInfo
) => {
    // `?seed=monthly-best-place` tells the country page to surface the
    // auto-add CTA that pre-seeds the 4 highlight activities into the
    // new trip. Without the seed param, the country page renders the
    // normal "Start planning" flow.
    navigate(
        `/country?code=${encodeURIComponent(place.countryCode)}` +
            `&mode=single` +
            `&seed=monthly-best-place`
    );
};

const MonthlyBestPlace = () => {
    const { user, isAdmin } = useUser();
    const isPro = Boolean(user && (user.isPaidMember || isAdmin));

    // Pro-only silent surprise — same gate as UpcomingHoliday.
    if (!user || !isPro) return null;

    return <MonthlyBestPlaceActive userFirstName={getUserFirstName(user)} />;
};

// Active path lives separately so the conditional useQuery doesn't
// violate the rules of hooks — the gate above returns early for
// non-Pro users before this is mounted.
interface MonthlyBestPlaceActiveProps {
    userFirstName: string;
}

const MonthlyBestPlaceActive = ({ userFirstName }: MonthlyBestPlaceActiveProps) => {
    const navigate = useNavigate();
    const { data, isLoading, isError } = useMonthlyBestPlace();

    if (isLoading) {
        return (
            <section className="monthly-best-place" aria-live="polite">
                <article className="monthly-best-place-card monthly-best-place-card-loading">
                    <div className="monthly-best-place-photo-wrap">
                        <div className="monthly-best-place-loading-photo" />
                    </div>
                    <div className="monthly-best-place-body">
                        <div className="monthly-best-place-eyebrow">
                            <AutoAwesomeRoundedIcon
                                className="monthly-best-place-eyebrow-icon"
                                fontSize="small"
                            />
                            <span>{userFirstName}&rsquo;s top pick this month</span>
                        </div>
                        <Skeleton width="80%" height={32} radius={8} />
                        <Skeleton width="55%" height={14} radius={4} />
                        <Skeleton width="100%" height={16} radius={6} />
                        <Skeleton width="100%" height={12} radius={4} />
                        <Skeleton width="92%" height={12} radius={4} />
                        <Skeleton width="78%" height={12} radius={4} />
                    </div>
                </article>
            </section>
        );
    }

    if (isError || !data) return null;

    const { place, highlights, monthKey } = data;
    const month = monthLabel(monthKey);

    return (
        <section className="monthly-best-place">
            <article
                className="monthly-best-place-card"
                onClick={() => goToCountryWithSeed(navigate, place)}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        goToCountryWithSeed(navigate, place);
                    }
                }}
                aria-label={`Open ${place.name}, ${place.country}`}
            >
                {/* LEFT — photo */}
                <div className="monthly-best-place-photo-wrap">
                    {place.imageUrl ? (
                        <img
                            src={place.imageUrl}
                            alt=""
                            className="monthly-best-place-photo"
                            loading="lazy"
                        />
                    ) : (
                        <div className="monthly-best-place-photo-fallback" />
                    )}
                    <div
                        className="monthly-best-place-photo-scrim"
                        aria-hidden="true"
                    />
                    {place.imageUrl && place.photographerName && (
                        <span className="monthly-best-place-attribution">
                            Photo by{' '}
                            {place.photographerUrl ? (
                                <a
                                    href={place.photographerUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
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
                                onClick={(e) => e.stopPropagation()}
                            >
                                Unsplash
                            </a>
                        </span>
                    )}
                </div>

                {/* RIGHT — pitch + highlights */}
                <div className="monthly-best-place-body">
                    <div className="monthly-best-place-eyebrow">
                        <AutoAwesomeRoundedIcon
                            className="monthly-best-place-eyebrow-icon"
                            fontSize="small"
                        />
                        <span>
                            {userFirstName}&rsquo;s top pick{month ? ` · ${month}` : ''}
                        </span>
                    </div>

                    <h2 className="monthly-best-place-name">
                        {place.name}
                    </h2>
                    <span className="monthly-best-place-country">
                        <PlaceRoundedIcon fontSize="small" />
                        {place.country}
                    </span>

                    {place.tagline && (
                        <p className="monthly-best-place-tagline">
                            “{place.tagline}”
                        </p>
                    )}

                    {place.whyForYou && (
                        <p className="monthly-best-place-why">
                            {place.whyForYou}
                        </p>
                    )}

                    {highlights.length > 0 && (
                        <ul className="monthly-best-place-highlights">
                            {highlights.map((h) => (
                                <li
                                    key={h.title}
                                    className="monthly-best-place-highlight"
                                >
                                    <span className="monthly-best-place-highlight-title">
                                        {h.title}
                                    </span>
                                    <span className="monthly-best-place-highlight-description">
                                        {h.description}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </article>
        </section>
    );
};

export default MonthlyBestPlace;
