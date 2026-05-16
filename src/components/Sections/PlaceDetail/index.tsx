import { Link, useSearchParams } from 'react-router-dom';
import './index.scss';
import { Tooltip } from '@mui/material';
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
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import HikingRoundedIcon from '@mui/icons-material/HikingRounded';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import FlightTakeoffRoundedIcon from '@mui/icons-material/FlightTakeoffRounded';
import DirectionsCarRoundedIcon from '@mui/icons-material/DirectionsCarRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import LocalTaxiRoundedIcon from '@mui/icons-material/LocalTaxiRounded';
import DirectionsBusRoundedIcon from '@mui/icons-material/DirectionsBusRounded';
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded';
import TranslateRoundedIcon from '@mui/icons-material/TranslateRounded';
import CelebrationRoundedIcon from '@mui/icons-material/CelebrationRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import CakeRoundedIcon from '@mui/icons-material/CakeRounded';
import LuggageRoundedIcon from '@mui/icons-material/LuggageRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import HotelRoundedIcon from '@mui/icons-material/HotelRounded';
import ExploreRoundedIcon from '@mui/icons-material/ExploreRounded';
import LightbulbRoundedIcon from '@mui/icons-material/LightbulbRounded';
import NightlifeRoundedIcon from '@mui/icons-material/NightlifeRounded';
import LocalBarRoundedIcon from '@mui/icons-material/LocalBarRounded';
import RedeemRoundedIcon from '@mui/icons-material/RedeemRounded';
import StarsRoundedIcon from '@mui/icons-material/StarsRounded';
import SentimentVerySatisfiedRoundedIcon from '@mui/icons-material/SentimentVerySatisfiedRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import AttachMoneyRoundedIcon from '@mui/icons-material/AttachMoneyRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import classNames from 'classnames';
import Layout from 'components/common/Layout/SubLayout';
import ShareButton from 'components/ShareButton';
import BookmarkButton from 'components/BookmarkButton';
import Skeleton from 'components/common/Skeleton';
import ReviewSection, { ReviewSummary } from 'components/ReviewSection';
import { useSearchPlaces } from 'api/hooks/useSearchPlaces';
import { usePlaceDetails } from 'api/hooks/usePlaceDetails';
import { useUserLocation } from 'hooks/useUserLocation';
import type {
    Coordinates,
    CurrencyInfo,
    LocalFlavor,
    LodgingInfo,
    NamedTip,
    NearbyDestination,
    SafetyInfo,
    TravelBasics,
    VisaInfo,
} from 'types';

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

// ── Currency widget ────────────────────────────────────────────────────────

const CurrencyWidget = ({ info }: { info: CurrencyInfo }) => {
    const rate = info.ratePerUsd;
    const formatted = rate >= 100
        ? rate.toFixed(0)
        : rate >= 10
            ? rate.toFixed(1)
            : rate.toFixed(2);
    return (
        <div className="place-detail-currency-widget">
            <div className="place-detail-currency-rate">
                <span className="place-detail-currency-from">1 USD</span>
                <span className="place-detail-currency-arrow" aria-hidden="true">≈</span>
                <span className="place-detail-currency-amount">{formatted}</span>
                <span className="place-detail-currency-code">{info.code}</span>
            </div>
            <p className="place-detail-currency-name">{info.name}</p>
            <p className="place-detail-currency-disclaimer">Approximate — check before travel.</p>
        </div>
    );
};

// ── Safety widget ──────────────────────────────────────────────────────────

const SAFETY_LEVEL_LABEL: Record<SafetyInfo['level'], string> = {
    low: 'Low risk',
    moderate: 'Moderate risk',
    high: 'High risk',
};

const SafetyWidget = ({ info }: { info: SafetyInfo }) => {
    const score = Math.max(0, Math.min(100, Math.round(info.score)));
    return (
        <div className={classNames('place-detail-safety-widget', `level-${info.level}`)}>
            <div className="place-detail-safety-top">
                <span className="place-detail-safety-level">{SAFETY_LEVEL_LABEL[info.level]}</span>
                <span className="place-detail-safety-score">
                    <strong>{score}</strong>
                    <span className="place-detail-safety-score-max">/100</span>
                </span>
            </div>
            <div
                className="place-detail-safety-meter"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={score}
                aria-label={`Safety score ${score} out of 100`}
            >
                <div
                    className="place-detail-safety-meter-fill"
                    style={{ width: `${score}%` }}
                />
            </div>
            <p className="place-detail-safety-summary">{info.summary}</p>
            <p className="place-detail-safety-disclaimer">
                Approximate — verify with official travel advisories before travel.
            </p>
        </div>
    );
};

// ── Travel widget (distance + estimated time + Google Maps link) ───────────

/** Great-circle distance in km between two lat/lng points. */
const haversineKm = (a: Coordinates, b: Coordinates): number => {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
};

interface TravelEstimate {
    mode: 'drive' | 'flight';
    /** Hours, rounded — drive uses 80 km/h, flight uses 800 km/h + 3 h airport buffer. */
    hours: number;
    /** Distance in km, rounded to nearest 10. */
    km: number;
}

/** Pick drive vs flight by distance and apply a coarse speed assumption.
 *  Numbers are intentionally rough — the widget is a "vibe check" not a
 *  travel itinerary, and the disclaimer makes that explicit. */
const estimateTravel = (km: number): TravelEstimate => {
    const rounded = Math.round(km / 10) * 10;
    if (km < 500) {
        return { mode: 'drive', hours: km / 80, km: rounded };
    }
    return { mode: 'flight', hours: km / 800 + 3, km: rounded };
};

const formatHours = (h: number): string => {
    if (h < 1) {
        const mins = Math.max(5, Math.round(h * 60));
        return `~${mins}m`;
    }
    if (h < 10) {
        const whole = Math.floor(h);
        const mins = Math.round((h - whole) * 60);
        return mins >= 5 ? `~${whole}h ${mins}m` : `~${whole}h`;
    }
    return `~${Math.round(h)}h`;
};

const formatKm = (km: number): string =>
    km >= 1000 ? `${(km / 1000).toFixed(1).replace(/\.0$/, '')}k km` : `${km} km`;

interface TravelWidgetProps {
    placeName: string;
    placeCoords: Coordinates;
}

const TravelWidget = ({ placeName, placeCoords }: TravelWidgetProps) => {
    const { data: user, isLoading, isError } = useUserLocation();

    const mapsUrl = (() => {
        const dest = `${placeCoords.lat},${placeCoords.lng}`;
        const destLabel = encodeURIComponent(placeName);
        const base = `https://www.google.com/maps/dir/?api=1&destination=${dest}&destination_place_id=&destination_name=${destLabel}`;
        return user
            ? `${base}&origin=${user.lat},${user.lng}`
            : `${base}&origin=My+location`;
    })();

    if (isLoading) {
        return (
            <div className="place-detail-travel-widget">
                <Skeleton width="80%" height={14} radius={4} />
                <Skeleton width="60%" height={14} radius={4} />
            </div>
        );
    }

    if (isError || !user) {
        // Geolocation blocked / rate-limited — still offer the Maps link so
        // the user can compute directions in Google themselves.
        return (
            <div className="place-detail-travel-widget">
                <p className="place-detail-travel-fallback">
                    Couldn&rsquo;t detect your location — open in Google Maps to get
                    directions from where you are.
                </p>
                <a
                    className="place-detail-travel-maps"
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Open in Google Maps <OpenInNewRoundedIcon fontSize="small" />
                </a>
            </div>
        );
    }

    const km = haversineKm(user, placeCoords);
    const est = estimateTravel(km);
    const fromLabel = [user.city, user.country].filter(Boolean).join(', ') || 'your location';

    return (
        <div className="place-detail-travel-widget">
            <p className="place-detail-travel-from">From {fromLabel}</p>
            <div className="place-detail-travel-stats">
                <span className="place-detail-travel-icon" aria-hidden="true">
                    {est.mode === 'flight' ? (
                        <FlightTakeoffRoundedIcon />
                    ) : (
                        <DirectionsCarRoundedIcon />
                    )}
                </span>
                <span className="place-detail-travel-distance">{formatKm(est.km)}</span>
                <span className="place-detail-travel-dot" aria-hidden="true">·</span>
                <span className="place-detail-travel-duration">
                    {formatHours(est.hours)} {est.mode}
                </span>
            </div>
            <a
                className="place-detail-travel-maps"
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
            >
                Open in Google Maps <OpenInNewRoundedIcon fontSize="small" />
            </a>
            <p className="place-detail-travel-disclaimer">
                Straight-line estimate — actual time depends on routes &amp; layovers.
            </p>
        </div>
    );
};

// ── Visa widget (yes/no for the user's IP-origin country) ──────────────────

type VisaStatus = 'citizen' | 'visa-free' | 'visa-on-arrival' | 'visa-required' | 'unknown';

const VISA_STATUS_LABEL: Record<VisaStatus, string> = {
    citizen: "You're a citizen",
    'visa-free': 'Visa-free entry',
    'visa-on-arrival': 'Visa on arrival',
    'visa-required': 'Visa required',
    unknown: 'Check visa requirements',
};

const resolveVisaStatus = (visa: VisaInfo, userCountryCode: string | undefined): VisaStatus => {
    if (!userCountryCode) return 'unknown';
    const u = userCountryCode.toUpperCase();
    const dest = visa.destinationCountryCode.toUpperCase();
    if (u === dest) return 'citizen';
    if (visa.visaFreeCountries.map((c) => c.toUpperCase()).includes(u)) return 'visa-free';
    if (visa.visaOnArrivalCountries.map((c) => c.toUpperCase()).includes(u)) return 'visa-on-arrival';
    return 'visa-required';
};

interface VisaWidgetProps {
    visa: VisaInfo;
}

const VisaWidget = ({ visa }: VisaWidgetProps) => {
    const { data: user, isLoading } = useUserLocation();
    const status = resolveVisaStatus(visa, user?.countryCode);
    const isPositive = status === 'citizen' || status === 'visa-free' || status === 'visa-on-arrival';
    const fromLabel = user?.country
        ? `From ${user.country}`
        : 'From your location';

    return (
        <div className={classNames('place-detail-visa-widget', `status-${status}`)}>
            <div className="place-detail-visa-top">
                <span className="place-detail-visa-icon" aria-hidden="true">
                    {isPositive ? <CheckCircleRoundedIcon /> : <HelpOutlineRoundedIcon />}
                </span>
                <span className="place-detail-visa-status">
                    {isLoading ? 'Detecting your location…' : VISA_STATUS_LABEL[status]}
                </span>
            </div>
            <p className="place-detail-visa-from">{fromLabel}</p>
            <p className="place-detail-visa-summary">{visa.summary}</p>
            <p className="place-detail-visa-disclaimer">
                Verify with an official consulate before booking.
            </p>
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

const CostBadge = ({ level }: { level: number }) => {
    const clamped = Math.max(1, Math.min(5, Math.round(level)));
    return (
        <span
            className="place-detail-cost"
            aria-label={`Cost level ${clamped} out of 5`}
            title={`${clamped}/5 — ${['Very cheap', 'Cheap', 'Mid-range', 'Expensive', 'Very expensive'][clamped - 1]}`}
        >
            {Array.from({ length: 5 }).map((_, i) => (
                <span
                    key={i}
                    className={classNames('place-detail-cost-sign', {
                        filled: i < clamped,
                    })}
                    aria-hidden="true"
                >
                    $
                </span>
            ))}
        </span>
    );
};

interface TravelBasicsRowsProps {
    basics: TravelBasics;
}

const PAYMENT_LABEL: Record<TravelBasics['paymentMethod'], string> = {
    cash: 'Mostly cash',
    card: 'Cards widely accepted',
    mixed: 'Mixed (card + cash)',
};

const TravelBasicsRows = ({ basics }: TravelBasicsRowsProps) => {
    const rows: { icon: React.ReactNode; label: string; value: React.ReactNode }[] = [
        {
            icon: <LocalTaxiRoundedIcon />,
            label: 'Getting around',
            value: basics.preferredTransport,
        },
        {
            icon: <DirectionsBusRoundedIcon />,
            label: 'Transit system',
            value: basics.transportSystem,
        },
        {
            icon: <CreditCardRoundedIcon />,
            label: 'Payment',
            value: (
                <>
                    <strong>{PAYMENT_LABEL[basics.paymentMethod]}</strong>
                    <span className="place-detail-basics-sub"> — {basics.paymentNote}</span>
                </>
            ),
        },
        {
            icon: <TranslateRoundedIcon />,
            label: 'Language',
            value: basics.language,
        },
        {
            icon: <CelebrationRoundedIcon />,
            label: 'Vibe',
            value: basics.vibe,
        },
        {
            icon: <GroupsRoundedIcon />,
            label: 'Good for',
            value: basics.audience,
        },
        {
            icon: <CakeRoundedIcon />,
            label: 'Age range',
            value: basics.ageRecommendation,
        },
    ];

    return (
        <dl className="place-detail-basics-list">
            {rows.map((row) => (
                <div key={row.label} className="place-detail-basics-row">
                    <dt className="place-detail-basics-label">
                        <span className="place-detail-basics-icon" aria-hidden="true">
                            {row.icon}
                        </span>
                        {row.label}
                    </dt>
                    <dd className="place-detail-basics-value">{row.value}</dd>
                </div>
            ))}
        </dl>
    );
};

const TravelBasicsSkeleton = () => (
    <div className="place-detail-basics-list">
        {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="place-detail-basics-row">
                <Skeleton width="30%" height={14} radius={4} />
                <Skeleton width="80%" height={14} radius={4} />
            </div>
        ))}
    </div>
);

const AVAILABILITY_LABEL: Record<LodgingInfo['airbnbAvailability'], string> = {
    common: 'Widely available',
    limited: 'Limited',
    none: 'Not available',
};

interface AvailabilityBadgeProps {
    availability: LodgingInfo['airbnbAvailability'];
}

const AvailabilityBadge = ({ availability }: AvailabilityBadgeProps) => (
    <span className={classNames('place-detail-lodging-badge', `availability-${availability}`)}>
        {AVAILABILITY_LABEL[availability]}
    </span>
);

const LodgingRows = ({ lodging }: { lodging: LodgingInfo }) => {
    const rows: { icon: React.ReactNode; label: string; value: React.ReactNode }[] = [
        {
            icon: <StarBorderRoundedIcon />,
            label: 'Recommended',
            value: lodging.recommendedType,
        },
        {
            icon: <HomeRoundedIcon />,
            label: 'Airbnb',
            value: (
                <>
                    <AvailabilityBadge availability={lodging.airbnbAvailability} />
                    <span className="place-detail-basics-sub"> — {lodging.airbnbNote}</span>
                </>
            ),
        },
        {
            icon: <ApartmentRoundedIcon />,
            label: 'Hotels',
            value: (
                <>
                    <AvailabilityBadge availability={lodging.hotelAvailability} />
                    <span className="place-detail-basics-sub"> — {lodging.hotelNote}</span>
                </>
            ),
        },
        {
            icon: <AttachMoneyRoundedIcon />,
            label: 'Price range',
            value: lodging.priceRange,
        },
        {
            icon: <EventAvailableRoundedIcon />,
            label: 'Booking tip',
            value: lodging.bookingTip,
        },
    ];

    return (
        <dl className="place-detail-basics-list">
            {rows.map((row) => (
                <div key={row.label} className="place-detail-basics-row">
                    <dt className="place-detail-basics-label">
                        <span className="place-detail-basics-icon" aria-hidden="true">
                            {row.icon}
                        </span>
                        {row.label}
                    </dt>
                    <dd className="place-detail-basics-value">{row.value}</dd>
                </div>
            ))}
        </dl>
    );
};

const LodgingSkeleton = () => (
    <div className="place-detail-basics-list">
        {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="place-detail-basics-row">
                <Skeleton width="30%" height={14} radius={4} />
                <Skeleton width="80%" height={14} radius={4} />
            </div>
        ))}
    </div>
);

/** Titlecase a free-form `kind` value from OpenAI (city / region / district /
 *  park / neighborhood / …) so the meta line reads naturally regardless of
 *  what label the model returned. */
const formatKindLabel = (kind: string): string =>
    kind.length === 0 ? '' : kind.charAt(0).toUpperCase() + kind.slice(1).toLowerCase();

const KM_TO_MI = 0.621371;

const formatMiles = (mi: number): string => {
    if (mi < 10) return `${mi.toFixed(1)} mi`;
    if (mi < 1000) return `${Math.round(mi)} mi`;
    return `${(mi / 1000).toFixed(1).replace(/\.0$/, '')}k mi`;
};

interface NearbyGridProps {
    items: NearbyDestination[];
    origin: Coordinates;
}

const NearbyGrid = ({ items, origin }: NearbyGridProps) => {
    // Sort nearest-first by the haversine distance from the place currently
    // being viewed. OpenAI is asked to do this server-side too, but we re-sort
    // defensively in case the model misorders.
    const enriched = items
        .map((d) => ({ d, mi: haversineKm(origin, { lat: d.lat, lng: d.lng }) * KM_TO_MI }))
        .sort((a, b) => a.mi - b.mi);

    return (
        <ul className="place-detail-nearby-grid">
            {enriched.map(({ d, mi }, i) => (
                <li key={`${d.name}-${i}`} className="place-detail-nearby-item">
                    <Link
                        to={`/place?q=${encodeURIComponent(d.name)}&i=0`}
                        className="place-detail-nearby-link"
                    >
                        <div className="place-detail-nearby-head">
                            <span className="place-detail-nearby-name">{d.name}</span>
                            <span className="place-detail-nearby-distance">{formatMiles(mi)}</span>
                            <ArrowForwardRoundedIcon
                                className="place-detail-nearby-arrow"
                                fontSize="small"
                            />
                        </div>
                        <p className="place-detail-nearby-meta">
                            {d.country} · {formatKindLabel(d.kind)}
                        </p>
                        <p className="place-detail-nearby-why">{d.why}</p>
                    </Link>
                </li>
            ))}
        </ul>
    );
};

const FUN_LEVEL_LABEL: Record<number, string> = {
    1: 'Very quiet',
    2: 'Relaxed',
    3: 'Balanced',
    4: 'Lively',
    5: 'High-energy',
};

const LocalFlavorBlock = ({ flavor }: { flavor: LocalFlavor }) => {
    const level = Math.max(1, Math.min(5, Math.round(flavor.funLevel)));
    return (
        <div className="place-detail-flavor">
            {/* Fun meter — same visual pattern as the safety meter. */}
            <div className="place-detail-flavor-fun">
                <div className="place-detail-flavor-fun-top">
                    <span className="place-detail-flavor-fun-icon" aria-hidden="true">
                        <SentimentVerySatisfiedRoundedIcon />
                    </span>
                    <span className="place-detail-flavor-fun-label">Fun level</span>
                    <span className="place-detail-flavor-fun-score">
                        <strong>{level}</strong>
                        <span className="place-detail-flavor-fun-score-max">/5</span>
                    </span>
                </div>
                <div
                    className="place-detail-flavor-meter"
                    role="meter"
                    aria-valuemin={1}
                    aria-valuemax={5}
                    aria-valuenow={level}
                    aria-label={`Fun level ${level} out of 5`}
                >
                    <div
                        className="place-detail-flavor-meter-fill"
                        style={{ width: `${(level / 5) * 100}%` }}
                    />
                </div>
                <span className="place-detail-flavor-fun-tag">{FUN_LEVEL_LABEL[level]}</span>
            </div>

            {/* Three short labeled paragraphs. */}
            <div className="place-detail-flavor-rows">
                <div className="place-detail-flavor-row">
                    <span className="place-detail-flavor-row-label">
                        <NightlifeRoundedIcon className="place-detail-flavor-row-icon" />
                        Nightlife
                    </span>
                    <p className="place-detail-flavor-row-text">{flavor.nightlife}</p>
                </div>
                <div className="place-detail-flavor-row">
                    <span className="place-detail-flavor-row-label">
                        <LocalBarRoundedIcon className="place-detail-flavor-row-icon" />
                        Famous liquor
                    </span>
                    <p className="place-detail-flavor-row-text">{flavor.famousLiquor}</p>
                </div>
                <div className="place-detail-flavor-row">
                    <span className="place-detail-flavor-row-label">
                        <RedeemRoundedIcon className="place-detail-flavor-row-icon" />
                        Souvenir
                    </span>
                    <p className="place-detail-flavor-row-text">{flavor.uniqueSouvenir}</p>
                </div>
            </div>

            {/* Don't-leave-without list. */}
            <div className="place-detail-flavor-mustdo">
                <span className="place-detail-flavor-mustdo-label">
                    <StarsRoundedIcon className="place-detail-flavor-row-icon" />
                    Don&rsquo;t leave without
                </span>
                <ul className="place-detail-flavor-mustdo-list">
                    {flavor.mustDoBeforeLeaving.map((t, i) => (
                        <li key={`${t.name}-${i}`} className="place-detail-flavor-mustdo-item">
                            <span className="place-detail-flavor-mustdo-name">{t.name}</span>
                            <span className="place-detail-flavor-mustdo-why">{t.why}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

const LocalFlavorSkeleton = () => (
    <div className="place-detail-flavor">
        <Skeleton width="60%" height={14} radius={4} />
        <Skeleton width="100%" height={8} radius={999} />
        {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="place-detail-flavor-row">
                <Skeleton width="35%" height={12} radius={4} />
                <Skeleton width="95%" height={14} radius={4} />
            </div>
        ))}
        {Array.from({ length: 5 }).map((_, i) => (
            <div key={`m-${i}`} className="place-detail-flavor-mustdo-item">
                <Skeleton width="40%" height={14} radius={4} />
                <Skeleton width="90%" height={12} radius={4} />
            </div>
        ))}
    </div>
);

const NearbyGridSkeleton = () => (
    <ul className="place-detail-nearby-grid">
        {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="place-detail-nearby-item place-detail-nearby-item-skeleton">
                <Skeleton width="50%" height={16} radius={4} />
                <Skeleton width="35%" height={12} radius={4} />
                <Skeleton width="95%" height={12} radius={4} />
            </li>
        ))}
    </ul>
);

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
                <div className="place-detail-toolbar">
                    <Link to={backUrl} className="place-detail-back-link">
                        <ArrowBackRoundedIcon fontSize="small" /> Back to &ldquo;{query}&rdquo;
                    </Link>
                    <div className="place-detail-toolbar-actions">
                        <BookmarkButton place={place} query={query} index={index} />
                        <ShareButton place={place} searchUrl={detailUrl} variant="pill" />
                    </div>
                </div>

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
                        Weather, Currency, and Safety stack vertically. */}
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

                        <DetailSection title="Currency" icon={<PaidRoundedIcon />}>
                            {detailsQuery.data ? (
                                <CurrencyWidget info={detailsQuery.data.details.currency} />
                            ) : detailsQuery.isError ? (
                                <p className="place-detail-side-error" role="alert">
                                    Could not load currency.
                                </p>
                            ) : (
                                <ParagraphSkeleton lines={2} />
                            )}
                        </DetailSection>

                        <DetailSection title="Safety" icon={<ShieldRoundedIcon />}>
                            {detailsQuery.data ? (
                                <SafetyWidget info={detailsQuery.data.details.safety} />
                            ) : detailsQuery.isError ? (
                                <p className="place-detail-side-error" role="alert">
                                    Could not load safety.
                                </p>
                            ) : (
                                <ParagraphSkeleton lines={3} />
                            )}
                        </DetailSection>
                    </aside>
                </div>

                <header className="place-detail-header">
                    <div className="place-detail-name-row">
                        <h1 className="place-detail-name">{place.name}</h1>
                        {detailsQuery.data && (
                            <CostBadge level={detailsQuery.data.details.costLevel} />
                        )}
                    </div>
                    <p className="place-detail-location">
                        {place.city} · {place.country}
                    </p>
                    <div className="place-detail-meta">
                        <Tooltip title="Overall rating" arrow>
                            <span
                                className="place-detail-meta-icon"
                                role="img"
                                aria-label="Overall rating"
                            >
                                <PublicRoundedIcon />
                            </span>
                        </Tooltip>
                        <Stars rating={place.rating} />
                    </div>
                    <ReviewSummary
                        placeName={place.name}
                        placeCity={place.city}
                        placeCountry={place.country}
                        targetId="reviews"
                    />
                </header>

                {/* Description on the left; travel + highlights + when-to-visit
                    stack on the right. Single column on mobile. */}
                <div className="place-detail-content">
                    <div className="place-detail-content-main">
                        {detailsQuery.data ? (
                            <p className="place-detail-description">
                                {detailsQuery.data.details.longDescription}
                            </p>
                        ) : detailsQuery.isError ? (
                            <p className="place-detail-description">{place.description}</p>
                        ) : (
                            <ParagraphSkeleton lines={6} />
                        )}

                        {!detailsQuery.isError && (
                            <section className="place-detail-country">
                                <h3 className="place-detail-country-heading">
                                    About {place.country}
                                </h3>
                                {detailsQuery.data ? (
                                    <p className="place-detail-country-description">
                                        {detailsQuery.data.details.countryDescription}
                                    </p>
                                ) : (
                                    <ParagraphSkeleton lines={6} />
                                )}
                            </section>
                        )}

                        {!detailsQuery.isError && (
                            <section className="place-detail-notes">
                                <h3 className="place-detail-notes-heading">
                                    <span className="place-detail-notes-icon" aria-hidden="true">
                                        <LightbulbRoundedIcon />
                                    </span>
                                    Good to know
                                </h3>
                                {detailsQuery.data ? (
                                    <ul className="place-detail-notes-list">
                                        {detailsQuery.data.details.notesToKnow.map((n, i) => (
                                            <li
                                                key={`${n.name}-${i}`}
                                                className="place-detail-notes-item"
                                            >
                                                <span className="place-detail-notes-name">{n.name}</span>
                                                <span className="place-detail-notes-why">{n.why}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <ul className="place-detail-notes-list">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <li key={i} className="place-detail-notes-item">
                                                <Skeleton width="35%" height={14} radius={4} />
                                                <Skeleton width="90%" height={12} radius={4} />
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        )}

                        {!detailsQuery.isError && (
                            <section className="place-detail-budget">
                                <h3 className="place-detail-budget-heading">
                                    <span className="place-detail-budget-icon" aria-hidden="true">
                                        <SavingsRoundedIcon />
                                    </span>
                                    Expenses &amp; budget
                                    {detailsQuery.data && (
                                        <CostBadge level={detailsQuery.data.details.costLevel} />
                                    )}
                                </h3>
                                {detailsQuery.data ? (
                                    <p className="place-detail-budget-description">
                                        {detailsQuery.data.details.budgetDescription}
                                    </p>
                                ) : (
                                    <ParagraphSkeleton lines={6} />
                                )}
                            </section>
                        )}

                        {!detailsQuery.isError && (
                            <section className="place-detail-flavor-section">
                                <h3 className="place-detail-flavor-heading">
                                    <span className="place-detail-flavor-heading-icon" aria-hidden="true">
                                        <CelebrationRoundedIcon />
                                    </span>
                                    Local flavor
                                </h3>
                                {detailsQuery.data ? (
                                    <LocalFlavorBlock flavor={detailsQuery.data.details.localFlavor} />
                                ) : (
                                    <LocalFlavorSkeleton />
                                )}
                            </section>
                        )}

                        {!detailsQuery.isError && (
                            <section className="place-detail-nearby">
                                <h3 className="place-detail-nearby-heading">
                                    <span className="place-detail-nearby-heading-icon" aria-hidden="true">
                                        <ExploreRoundedIcon />
                                    </span>
                                    Nearby — worth a side trip
                                </h3>
                                {detailsQuery.data ? (
                                    <NearbyGrid
                                        items={detailsQuery.data.details.nearbyDestinations}
                                        origin={detailsQuery.data.details.coordinates}
                                    />
                                ) : (
                                    <NearbyGridSkeleton />
                                )}
                            </section>
                        )}
                    </div>

                    <aside className="place-detail-content-side">
                        <DetailSection
                            title="Getting there"
                            icon={<FlightTakeoffRoundedIcon />}
                        >
                            {detailsQuery.data ? (
                                <TravelWidget
                                    placeName={`${place.name}, ${place.city}`}
                                    placeCoords={detailsQuery.data.details.coordinates}
                                />
                            ) : detailsQuery.isError ? (
                                <p className="place-detail-side-error" role="alert">
                                    Could not load travel info.
                                </p>
                            ) : (
                                <ParagraphSkeleton lines={3} />
                            )}
                        </DetailSection>

                        {!detailsQuery.isError && (
                            <DetailSection title="Visa" icon={<BadgeRoundedIcon />}>
                                {detailsQuery.data ? (
                                    <VisaWidget visa={detailsQuery.data.details.visa} />
                                ) : (
                                    <ParagraphSkeleton lines={3} />
                                )}
                            </DetailSection>
                        )}

                        {!detailsQuery.isError && (
                            <DetailSection
                                title="Highlights"
                                icon={<EmojiEventsRoundedIcon />}
                            >
                                <div className="place-detail-highlights">
                                    <div className="place-detail-highlight-row">
                                        <span className="place-detail-highlight-label city">
                                            {place.city}
                                        </span>
                                        <span className="place-detail-highlight-value">
                                            {detailsQuery.data ? (
                                                detailsQuery.data.details.cityHighlight
                                            ) : (
                                                <Skeleton width="95%" height={14} radius={4} />
                                            )}
                                        </span>
                                    </div>
                                    <div className="place-detail-highlight-row">
                                        <span className="place-detail-highlight-label country">
                                            {place.country}
                                        </span>
                                        <span className="place-detail-highlight-value">
                                            {detailsQuery.data ? (
                                                detailsQuery.data.details.countryHighlight
                                            ) : (
                                                <Skeleton width="95%" height={14} radius={4} />
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </DetailSection>
                        )}

                        <DetailSection
                            title="When to visit"
                            icon={<AccessTimeRoundedIcon />}
                        >
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

                {!detailsQuery.isError && (
                    <DetailSection title="Travel basics" icon={<LuggageRoundedIcon />}>
                        {detailsQuery.data ? (
                            <TravelBasicsRows basics={detailsQuery.data.details.travelBasics} />
                        ) : (
                            <TravelBasicsSkeleton />
                        )}
                    </DetailSection>
                )}

                {!detailsQuery.isError && (
                    <DetailSection title="Where to stay" icon={<HotelRoundedIcon />}>
                        {detailsQuery.data ? (
                            <LodgingRows lodging={detailsQuery.data.details.lodging} />
                        ) : (
                            <LodgingSkeleton />
                        )}
                    </DetailSection>
                )}

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
                            title="Top 5 things to do"
                            icon={<HikingRoundedIcon />}
                        >
                            {detailsQuery.data ? (
                                <TipList items={detailsQuery.data.details.thingsToDo} />
                            ) : (
                                <TipListSkeleton />
                            )}
                        </DetailSection>

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

                        <DetailSection
                            title="Top 5 photo spots"
                            icon={<PhotoCameraRoundedIcon />}
                        >
                            {detailsQuery.data ? (
                                <TipList items={detailsQuery.data.details.photoSpots} />
                            ) : (
                                <TipListSkeleton />
                            )}
                        </DetailSection>
                    </div>
                )}

                <div id="reviews">
                    <ReviewSection
                        placeName={place.name}
                        placeCity={place.city}
                        placeCountry={place.country}
                    />
                </div>

            </article>
        </Layout>
    );
};

export default PlaceDetail;
