import { Link, useSearchParams } from 'react-router-dom';
import './index.scss';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarHalfRoundedIcon from '@mui/icons-material/StarHalfRounded';
import StarOutlineRoundedIcon from '@mui/icons-material/StarOutlineRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import RestaurantRoundedIcon from '@mui/icons-material/RestaurantRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import WbSunnyRoundedIcon from '@mui/icons-material/WbSunnyRounded';
import CloudRoundedIcon from '@mui/icons-material/CloudRounded';
import AcUnitRoundedIcon from '@mui/icons-material/AcUnitRounded';
import GrainRoundedIcon from '@mui/icons-material/GrainRounded';
import BeachAccessRoundedIcon from '@mui/icons-material/BeachAccessRounded';
import FilterDramaRoundedIcon from '@mui/icons-material/FilterDramaRounded';
import classNames from 'classnames';
import Layout from 'components/common/Layout/SubLayout';
import ShareButton from 'components/ShareButton';
import Skeleton from 'components/common/Skeleton';
import { useSearchPlaces } from 'api/hooks/useSearchPlaces';
import { usePlaceDetails } from 'api/hooks/usePlaceDetails';
import type { NamedTip } from 'types';

// ── Weather widget ─────────────────────────────────────────────────────────

type WeatherCondition = 'tropical' | 'cold' | 'rainy' | 'cloudy' | 'mild' | 'sunny';

interface WeatherFlavor {
    icon: React.ReactNode;
    label: string;
    className: string;
}

/** Pick a vibe from the free-text weather paragraph. Order matters — checks
 *  go from most-distinctive keywords to least. Falls back to "sunny". */
const detectCondition = (text: string): WeatherCondition => {
    const t = text.toLowerCase();
    if (/(snow|winter|freezing|sub-?zero|alpine|arctic)/.test(t)) return 'cold';
    if (/(monsoon|rainy season|rainfall|wet season|heavy rain)/.test(t)) return 'rainy';
    if (/(tropical|humid|equatorial|jungle)/.test(t)) return 'tropical';
    if (/(overcast|cloudy|foggy|mist)/.test(t)) return 'cloudy';
    if (/(mild|temperate|cool|moderate|pleasant)/.test(t)) return 'mild';
    return 'sunny';
};

const WEATHER_FLAVORS: Record<WeatherCondition, WeatherFlavor> = {
    tropical: { icon: <BeachAccessRoundedIcon />, label: 'Tropical', className: 'flavor-tropical' },
    cold:     { icon: <AcUnitRoundedIcon />,       label: 'Cold',     className: 'flavor-cold' },
    rainy:    { icon: <GrainRoundedIcon />,        label: 'Rainy',    className: 'flavor-rainy' },
    cloudy:   { icon: <CloudRoundedIcon />,        label: 'Cloudy',   className: 'flavor-cloudy' },
    mild:     { icon: <FilterDramaRoundedIcon />,  label: 'Mild',     className: 'flavor-mild' },
    sunny:    { icon: <WbSunnyRoundedIcon />,      label: 'Sunny',    className: 'flavor-sunny' },
};

const WeatherWidget = ({ text }: { text: string }) => {
    const flavor = WEATHER_FLAVORS[detectCondition(text)];
    return (
        <div className={classNames('place-detail-weather-widget', flavor.className)}>
            <div className="place-detail-weather-icon" aria-hidden="true">
                {flavor.icon}
            </div>
            <div className="place-detail-weather-body">
                <span className="place-detail-weather-tag">{flavor.label}</span>
                <p className="place-detail-weather-text">{text}</p>
            </div>
        </div>
    );
};

// ── Detail-page sub-sections ────────────────────────────────────────────────

interface SectionProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}

const DetailSection = ({ title, icon, children }: SectionProps) => (
    <section className="place-detail-section">
        <h2 className="place-detail-section-title">
            <span className="place-detail-section-icon">{icon}</span>
            {title}
        </h2>
        {children}
    </section>
);

const TipList = ({ items }: { items: NamedTip[] }) => (
    <ul className="place-detail-tip-list">
        {items.map((t, i) => (
            <li key={`${t.name}-${i}`} className="place-detail-tip-item">
                <span className="place-detail-tip-name">{t.name}</span>
                <span className="place-detail-tip-why">{t.why}</span>
            </li>
        ))}
    </ul>
);

const TipListSkeleton = ({ rows = 5 }: { rows?: number }) => (
    <ul className="place-detail-tip-list">
        {Array.from({ length: rows }).map((_, i) => (
            <li key={i} className="place-detail-tip-item">
                <Skeleton width="40%" height={14} radius={4} />
                <Skeleton width="90%" height={12} radius={4} />
            </li>
        ))}
    </ul>
);

const ParagraphSkeleton = ({ lines = 2 }: { lines?: number }) => (
    <div className="place-detail-paragraph-skeleton">
        {Array.from({ length: lines }).map((_, i) => (
            <Skeleton key={i} width={i === lines - 1 ? '70%' : '100%'} height={12} radius={4} />
        ))}
    </div>
);

const Stars = ({ rating }: { rating: number }) => {
    const clamped = Math.max(0, Math.min(5, rating));
    const full = Math.floor(clamped);
    const hasHalf = clamped - full >= 0.5;
    const empty = 5 - full - (hasHalf ? 1 : 0);
    return (
        <span className="place-detail-stars" aria-label={`Rating ${clamped} out of 5`}>
            {Array.from({ length: full }).map((_, i) => (
                <StarRoundedIcon key={`f-${i}`} className="place-detail-star filled" />
            ))}
            {hasHalf && <StarHalfRoundedIcon className="place-detail-star filled" />}
            {Array.from({ length: empty }).map((_, i) => (
                <StarOutlineRoundedIcon key={`e-${i}`} className="place-detail-star" />
            ))}
            <span className="place-detail-rating-num">{clamped.toFixed(1)}</span>
        </span>
    );
};

const PlaceDetail = () => {
    const [searchParams] = useSearchParams();
    const query = (searchParams.get('q') ?? '').trim();
    const index = Number(searchParams.get('i') ?? '0');

    // Reuses the same cached recommender response — instant if the user just
    // came from the search results page; one OpenAI/Unsplash hit if landing
    // here directly via a shared link.
    const { data, isLoading, isError, error } = useSearchPlaces(query, 5);

    // Enriched details (foods, places, weather, worst-time). Lazy-fetched,
    // cached server-side on the same row so a repeat view is instant.
    const detailsQuery = usePlaceDetails(query, index);

    const detailUrl =
        typeof window !== 'undefined'
            ? window.location.href
            : `/place?q=${encodeURIComponent(query)}&i=${index}`;
    const backUrl = `/search?q=${encodeURIComponent(query)}`;

    const place = data?.items[index];

    if (!query) {
        return (
            <Layout title="Place">
                <p className="place-detail-empty">Missing query — open this page from a search result.</p>
            </Layout>
        );
    }

    if (isLoading) {
        return (
            <Layout title="Loading…">
                <p className="place-detail-loading">Loading details…</p>
            </Layout>
        );
    }

    if (isError) {
        return (
            <Layout title="Error">
                <p className="place-detail-error" role="alert">
                    Could not load this place: {error instanceof Error ? error.message : 'Unknown error'}
                </p>
            </Layout>
        );
    }

    if (!place) {
        return (
            <Layout title="Not found">
                <p className="place-detail-empty">
                    No place at position {index + 1} for &ldquo;{query}&rdquo;.
                </p>
                <Link to={backUrl} className="place-detail-back-link">
                    <ArrowBackRoundedIcon fontSize="small" /> Back to results
                </Link>
            </Layout>
        );
    }

    const isPlaceholder = !place.imageUrl;
    const hasAttribution = !isPlaceholder && place.photographerName;

    return (
        <Layout title={place.name}>
            <article className="place-detail">
                <Link to={backUrl} className="place-detail-back-link">
                    <ArrowBackRoundedIcon fontSize="small" /> Back to &ldquo;{query}&rdquo;
                </Link>

                <div className="place-detail-top">
                    <div
                        className={classNames('place-detail-hero', {
                            'is-placeholder': isPlaceholder,
                        })}
                        role={isPlaceholder ? 'img' : undefined}
                        aria-label={isPlaceholder ? place.name : undefined}
                    >
                        {!isPlaceholder && (
                            <img src={place.imageUrl as string} alt={place.name} />
                        )}
                        {hasAttribution && (
                            <span className="place-detail-attribution">
                                Photo by{' '}
                                {place.photographerUrl ? (
                                    <a
                                        href={place.photographerUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
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
                                >
                                    Unsplash
                                </a>
                            </span>
                        )}
                    </div>

                    {/* Right column on desktop / stacked under hero on mobile.
                        Row 1: Weather. Row 2: When-to-visit (best + worst). */}
                    <aside className="place-detail-side">
                        <DetailSection title="Weather" icon={<WbSunnyRoundedIcon />}>
                            {detailsQuery.data ? (
                                <WeatherWidget text={detailsQuery.data.details.weather} />
                            ) : detailsQuery.isError ? (
                                <p className="place-detail-side-error" role="alert">
                                    Could not load weather.
                                </p>
                            ) : (
                                <ParagraphSkeleton lines={3} />
                            )}
                        </DetailSection>

                        <DetailSection title="When to visit" icon={<AccessTimeRoundedIcon />}>
                            <div className="place-detail-when">
                                <div className="place-detail-when-row">
                                    <span className="place-detail-when-label good">Best</span>
                                    <span className="place-detail-when-value">
                                        {place.bestTimeToVisit}
                                    </span>
                                </div>
                                <div className="place-detail-when-row">
                                    <span className="place-detail-when-label bad">Worst</span>
                                    <span className="place-detail-when-value">
                                        {detailsQuery.data ? (
                                            detailsQuery.data.details.worstTimeToVisit
                                        ) : detailsQuery.isError ? (
                                            '—'
                                        ) : (
                                            <Skeleton width="80%" height={14} radius={4} />
                                        )}
                                    </span>
                                </div>
                            </div>
                        </DetailSection>
                    </aside>
                </div>

                <header className="place-detail-header">
                    <h1 className="place-detail-name">{place.name}</h1>
                    <p className="place-detail-location">
                        {place.city} · {place.country}
                    </p>
                    <div className="place-detail-meta">
                        <Stars rating={place.rating} />
                    </div>
                </header>

                <p className="place-detail-description">{place.description}</p>

                {/* Enriched sections — loaded lazily from /place-details. */}
                {detailsQuery.isError ? (
                    <p className="place-detail-error" role="alert">
                        Could not load extras:{' '}
                        {detailsQuery.error instanceof Error
                            ? detailsQuery.error.message
                            : 'Unknown error'}
                    </p>
                ) : (
                    <div className="place-detail-extras">
                        <DetailSection
                            title="Top 5 foods to try"
                            icon={<RestaurantRoundedIcon />}
                        >
                            {detailsQuery.data ? (
                                <TipList items={detailsQuery.data.details.foods} />
                            ) : (
                                <TipListSkeleton />
                            )}
                        </DetailSection>

                        <DetailSection
                            title="Top 5 places to visit"
                            icon={<PlaceRoundedIcon />}
                        >
                            {detailsQuery.data ? (
                                <TipList items={detailsQuery.data.details.placesToVisit} />
                            ) : (
                                <TipListSkeleton />
                            )}
                        </DetailSection>
                    </div>
                )}

                <div className="place-detail-actions">
                    <ShareButton place={place} searchUrl={detailUrl} />
                </div>
            </article>
        </Layout>
    );
};

export default PlaceDetail;
