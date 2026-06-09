import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './index.scss';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import LocationCityRoundedIcon from '@mui/icons-material/LocationCityRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import FlightTakeoffRoundedIcon from '@mui/icons-material/FlightTakeoffRounded';
import LuggageRoundedIcon from '@mui/icons-material/LuggageRounded';
import Layout from 'components/common/Layout/SubLayout';
import DeleteBtn from 'components/common/DeleteBtn';
import ButtonIcon from 'components/common/FormFields/ButtonIcon';
import Pagination from 'components/common/Pagination';
import VisitedMenu, {
    type VisitedTabKey,
} from './VisitedMenu';
import { useUnmarkVisited, useVisitedPlaces } from 'api/hooks/useVisitedPlaces';
import {
    useUnmarkVisitedCountry,
    useVisitedCountries,
} from 'api/hooks/useVisitedCountries';
import {
    useUnmarkVisitedCity,
    useVisitedCities,
} from 'api/hooks/useVisitedCities';
import { formatDate } from 'utils/date';
import { placeDetailUrl } from 'utils/placeUrl';
import {
    BUTTON_VARIANT,
    LIST_PAGE_SIZE,
    NO_IMAGE,
    VISITED_SOURCE,
} from 'constants';
import type { VisitedPlace } from 'types';

const sourceLabel = (source: VisitedPlace['source']): string =>
    source === VISITED_SOURCE.ITINERARY ? 'From itinerary' : 'Marked manually';

const Visited = () => {
    const navigate = useNavigate();
    const { data, isLoading, isError, error } = useVisitedPlaces();
    const {
        data: countriesData,
        isLoading: countriesLoading,
        isError: countriesError,
    } = useVisitedCountries();
    const {
        data: citiesData,
        isLoading: citiesLoading,
        isError: citiesError,
    } = useVisitedCities();
    const unmarkVisited = useUnmarkVisited();
    const unmarkVisitedCountry = useUnmarkVisitedCountry();
    const unmarkVisitedCity = useUnmarkVisitedCity();

    const items = data?.items ?? [];
    const total = data?.total ?? 0;
    const countryItems = countriesData?.items ?? [];
    const countryTotal = countriesData?.total ?? 0;
    const cityItems = citiesData?.items ?? [];
    const cityTotal = citiesData?.total ?? 0;

    const [activeTab, setActiveTab] = useState<VisitedTabKey>('countries');
    const [pageByTab, setPageByTab] = useState<Record<VisitedTabKey, number>>({
        countries: 1,
        cities: 1,
        places: 1,
    });

    const handleTabChange = (key: VisitedTabKey) => {
        setActiveTab(key);
    };

    const handlePageChange = (page: number) => {
        setPageByTab((prev) => ({ ...prev, [activeTab]: page }));
    };

    // Distinct countries union: explicit country marks + city marks +
    // implicit codes derived from visited places. Drives the top rollup.
    const countryCount = useMemo(() => {
        const seen = new Set<string>();
        for (const v of items) seen.add(v.countryCode ?? v.placeCountry);
        for (const c of countryItems) seen.add(c.countryCode);
        for (const c of cityItems) seen.add(c.countryCode);
        return seen.size;
    }, [items, countryItems, cityItems]);

    const anyLoading = isLoading || countriesLoading || citiesLoading;
    const anyError = isError || countriesError || citiesError;
    const allEmpty =
        total === 0 && countryTotal === 0 && cityTotal === 0;

    const counts: Record<VisitedTabKey, number> = {
        countries: countryTotal,
        cities: cityTotal,
        places: total,
    };

    const page = pageByTab[activeTab];
    const totalForTab = counts[activeTab];
    const totalPages = Math.max(1, Math.ceil(totalForTab / LIST_PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const startIdx = (safePage - 1) * LIST_PAGE_SIZE;
    const endIdx = startIdx + LIST_PAGE_SIZE;

    return (
        <Layout title="Visited Places">
            <div className="visited-page">
                <header className="visited-page-header">
                    <div className="visited-page-header-text">
                        <h1 className="visited-page-title">Where you've been</h1>
                        {!anyLoading && !anyError && !allEmpty && (
                            <div className="visited-page-stats">
                                <span className="visited-stat-pill">
                                    <PublicRoundedIcon className="visited-stat-pill-icon" />
                                    <strong>{countryCount}</strong>{' '}
                                    {countryCount === 1
                                        ? 'Country'
                                        : 'Countries'}
                                </span>
                                <span className="visited-stat-pill">
                                    <LocationCityRoundedIcon className="visited-stat-pill-icon" />
                                    <strong>{cityTotal}</strong>{' '}
                                    {cityTotal === 1 ? 'City' : 'Cities'}
                                </span>
                                <span className="visited-stat-pill">
                                    <PlaceRoundedIcon className="visited-stat-pill-icon" />
                                    <strong>{total}</strong>{' '}
                                    {total === 1 ? 'Place' : 'Places'}
                                </span>
                            </div>
                        )}
                    </div>
                    <Link to="/my-map" className="visited-page-map-link">
                        <MapRoundedIcon className="visited-page-map-link-icon" />
                        <span>View on map</span>
                    </Link>
                </header>

                {anyLoading && <p className="visited-page-msg">Loading…</p>}

                {anyError && (
                    <p
                        className="visited-page-msg visited-page-error"
                        role="alert"
                    >
                        Could not load your visited list
                        {error instanceof Error ? ` — ${error.message}` : ''}.
                    </p>
                )}

                {!anyLoading && !anyError && allEmpty && (
                    <div className="visited-page-empty">
                        <CheckCircleRoundedIcon className="visited-page-empty-icon" />
                        <p>No visited places yet.</p>
                        <p className="visited-page-empty-hint">
                            Complete a trip or mark a destination as visited to
                            start building your travel history. Open a country
                            or place and tap <em>"I've been here"</em>, or plan
                            a trip and it lands here when it&rsquo;s done.
                        </p>
                        <ButtonIcon
                            type={BUTTON_VARIANT.STANDARD}
                            Icon={FlightTakeoffRoundedIcon}
                            iconPosition="start"
                            title="Build your first trip"
                            className="visited-empty-cta"
                            onClick={() => navigate('/single')}
                        />
                    </div>
                )}

                {!anyLoading && !anyError && !allEmpty && (
                    <div className="visited-page-body">
                        <aside className="visited-page-side">
                            <VisitedMenu
                                active={activeTab}
                                onChange={handleTabChange}
                                counts={counts}
                            />
                        </aside>

                        <section className="visited-page-main">
                            {activeTab === 'countries' && (
                                countryTotal === 0 ? (
                                    <p className="visited-page-msg">
                                        No countries marked yet.
                                    </p>
                                ) : (
                                    <ul className="visited-list">
                                        {countryItems
                                            .slice(startIdx, endIdx)
                                            .map((c) => (
                                                <li
                                                    key={c.id}
                                                    className="visited-card"
                                                >
                                                    <Link
                                                        to={`/country?code=${encodeURIComponent(c.countryCode)}`}
                                                        className="visited-card-main"
                                                    >
                                                        <img
                                                            src={
                                                                c.countryImage ??
                                                                NO_IMAGE
                                                            }
                                                            alt=""
                                                            loading="lazy"
                                                            className={
                                                                c.countryImage
                                                                    ? 'visited-card-thumb'
                                                                    : 'visited-card-thumb is-placeholder'
                                                            }
                                                        />
                                                        <div className="visited-card-text">
                                                            <span className="visited-card-name">
                                                                {c.countryName}
                                                            </span>
                                                            <span className="visited-card-location">
                                                                {c.countryCode}
                                                            </span>
                                                            <span className="visited-card-meta">
                                                                Visited on{' '}
                                                                {formatDate(
                                                                    c.visitedAt,
                                                                    'MMM D, YYYY'
                                                                )}
                                                            </span>
                                                        </div>
                                                    </Link>
                                                    <div className="visited-card-actions">
                                                        <DeleteBtn
                                                            title="Remove from visited"
                                                            label="Remove"
                                                            targetName={
                                                                c.countryName
                                                            }
                                                            buttonType={
                                                                BUTTON_VARIANT.TEXT
                                                            }
                                                            onConfirm={() =>
                                                                unmarkVisitedCountry.mutate(
                                                                    c.countryCode
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                </li>
                                            ))}
                                    </ul>
                                )
                            )}

                            {activeTab === 'cities' && (
                                cityTotal === 0 ? (
                                    <p className="visited-page-msg">
                                        No cities marked yet.
                                    </p>
                                ) : (
                                    <ul className="visited-list">
                                        {cityItems
                                            .slice(startIdx, endIdx)
                                            .map((c) => (
                                                <li
                                                    key={c.id}
                                                    className="visited-card"
                                                >
                                                    <Link
                                                        to={
                                                            `/city?name=${encodeURIComponent(c.cityName)}` +
                                                            `&country=${encodeURIComponent(c.countryName)}` +
                                                            `&code=${encodeURIComponent(c.countryCode)}` +
                                                            `&mode=single`
                                                        }
                                                        className="visited-card-main"
                                                    >
                                                        <PublicRoundedIcon className="visited-card-icon" />
                                                        <div className="visited-card-text">
                                                            <span className="visited-card-name">
                                                                {c.cityName}
                                                            </span>
                                                            <span className="visited-card-location">
                                                                {c.countryName}{' '}
                                                                ({c.countryCode})
                                                            </span>
                                                            <span className="visited-card-meta">
                                                                Visited on{' '}
                                                                {formatDate(
                                                                    c.visitedAt,
                                                                    'MMM D, YYYY'
                                                                )}
                                                            </span>
                                                        </div>
                                                    </Link>
                                                    <div className="visited-card-actions">
                                                        <DeleteBtn
                                                            title="Remove from visited"
                                                            label="Remove"
                                                            targetName={
                                                                c.cityName
                                                            }
                                                            buttonType={
                                                                BUTTON_VARIANT.TEXT
                                                            }
                                                            onConfirm={() =>
                                                                unmarkVisitedCity.mutate(
                                                                    c.citySlug
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                </li>
                                            ))}
                                    </ul>
                                )
                            )}

                            {activeTab === 'places' && (
                                total === 0 ? (
                                    <p className="visited-page-msg">
                                        No places marked yet.
                                    </p>
                                ) : (
                                    <ul className="visited-list">
                                        {items
                                            .slice(startIdx, endIdx)
                                            .map((v) => (
                                                <li
                                                    key={v.id}
                                                    className="visited-card"
                                                >
                                                    <Link
                                                        to={placeDetailUrl(
                                                            v.placeName,
                                                            v.placeCity,
                                                            v.placeCountry,
                                                        )}
                                                        className="visited-card-main"
                                                    >
                                                        <PublicRoundedIcon className="visited-card-icon" />
                                                        <div className="visited-card-text">
                                                            <span className="visited-card-name">
                                                                {v.placeName}
                                                            </span>
                                                            <span className="visited-card-location">
                                                                {v.placeCity} ·{' '}
                                                                {v.placeCountry}
                                                            </span>
                                                            <span className="visited-card-meta">
                                                                Visited on{' '}
                                                                {formatDate(
                                                                    v.visitedAt,
                                                                    'MMM D, YYYY'
                                                                )}
                                                                {' · '}
                                                                {sourceLabel(
                                                                    v.source
                                                                )}
                                                            </span>
                                                            {v.trips &&
                                                                v.trips.length >
                                                                    0 &&
                                                                v.trips[0]
                                                                    .tripName && (
                                                                    <span className="visited-card-trip">
                                                                        <LuggageRoundedIcon className="visited-card-trip-icon" />
                                                                        From{' '}
                                                                        <strong>
                                                                            {
                                                                                v
                                                                                    .trips[0]
                                                                                    .tripName
                                                                            }
                                                                        </strong>
                                                                        {v.trips
                                                                            .length >
                                                                        1
                                                                            ? ` +${v.trips.length - 1} more`
                                                                            : ''}
                                                                    </span>
                                                                )}
                                                        </div>
                                                    </Link>
                                                    <div className="visited-card-actions">
                                                        {v.trips &&
                                                            v.trips.length >
                                                                0 && (
                                                                <Link
                                                                    to={`/trip-detail?id=${encodeURIComponent(
                                                                        v.trips[0]
                                                                            .tripId
                                                                    )}`}
                                                                    className="visited-card-trip-link"
                                                                >
                                                                    View trip
                                                                </Link>
                                                            )}
                                                        <DeleteBtn
                                                            title="Remove from visited"
                                                            label="Remove"
                                                            targetName={
                                                                v.placeName
                                                            }
                                                            buttonType={
                                                                BUTTON_VARIANT.TEXT
                                                            }
                                                            onConfirm={() =>
                                                                unmarkVisited.mutate(
                                                                    v.placeKey
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                </li>
                                            ))}
                                    </ul>
                                )
                            )}

                            {totalForTab > LIST_PAGE_SIZE && (
                                <Pagination
                                    page={safePage}
                                    totalPages={totalPages}
                                    onPageChange={handlePageChange}
                                    ariaLabel={`${activeTab} pagination`}
                                />
                            )}
                        </section>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Visited;
