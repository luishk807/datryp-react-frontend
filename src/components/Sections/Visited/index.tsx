import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './index.scss';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import FlightTakeoffRoundedIcon from '@mui/icons-material/FlightTakeoffRounded';
import LuggageRoundedIcon from '@mui/icons-material/LuggageRounded';
import Layout from 'components/common/Layout/SubLayout';
import CountryFlag from 'components/common/CountryFlag';
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
    VISITED_SOURCE,
} from 'constants';
import type { VisitedPlace } from 'types';

const Visited = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const sourceLabel = (source: VisitedPlace['source']): string =>
        source === VISITED_SOURCE.ITINERARY
            ? t('visited.source.itinerary')
            : t('visited.source.manual');

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
        <Layout title={t('visited.title')}>
            <div className="visited-page">
                <header className="visited-page-header">
                    <div className="visited-page-header-text">
                        <h1 className="visited-page-title">
                            {t('visited.heading')}
                        </h1>
                    </div>
                    <Link to="/my-map" className="visited-page-map-link">
                        <MapRoundedIcon className="visited-page-map-link-icon" />
                        <span>{t('visited.viewOnMap')}</span>
                    </Link>
                </header>

                {anyLoading && (
                    <p className="visited-page-msg">{t('visited.loading')}</p>
                )}

                {anyError && (
                    <p
                        className="visited-page-msg visited-page-error"
                        role="alert"
                    >
                        {t('visited.error')}
                        {error instanceof Error ? ` — ${error.message}` : ''}.
                    </p>
                )}

                {!anyLoading && !anyError && allEmpty && (
                    <div className="visited-page-empty">
                        <CheckCircleRoundedIcon className="visited-page-empty-icon" />
                        <p>{t('visited.empty.heading')}</p>
                        <p className="visited-page-empty-hint">
                            {t('visited.empty.hintBefore')}{' '}
                            <em>{t('visited.empty.hintEmphasis')}</em>
                            {t('visited.empty.hintAfter')}
                        </p>
                        <ButtonIcon
                            type={BUTTON_VARIANT.STANDARD}
                            Icon={FlightTakeoffRoundedIcon}
                            iconPosition="start"
                            title={t('visited.empty.cta')}
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
                                        {t('visited.emptyTab.countries')}
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
                                                        <CountryFlag
                                                            code={c.countryCode}
                                                            title={c.countryName}
                                                            className="visited-card-flag"
                                                        />
                                                        <div className="visited-card-text">
                                                            <span className="visited-card-name">
                                                                {c.countryName}
                                                            </span>
                                                            <span className="visited-card-location">
                                                                {c.countryCode}
                                                            </span>
                                                            <span className="visited-card-meta">
                                                                {t(
                                                                    'visited.visitedOn',
                                                                    {
                                                                        date: formatDate(
                                                                            c.visitedAt,
                                                                            'MMM D, YYYY'
                                                                        ),
                                                                    }
                                                                )}
                                                            </span>
                                                        </div>
                                                    </Link>
                                                    <div className="visited-card-actions">
                                                        <DeleteBtn
                                                            title={t(
                                                                'visited.remove.title'
                                                            )}
                                                            label={t(
                                                                'visited.remove.label'
                                                            )}
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
                                        {t('visited.emptyTab.cities')}
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
                                                        <CountryFlag
                                                            code={c.countryCode}
                                                            title={c.countryName}
                                                            className="visited-card-flag"
                                                        />
                                                        <div className="visited-card-text">
                                                            <span className="visited-card-name">
                                                                {c.cityName}
                                                            </span>
                                                            <span className="visited-card-location">
                                                                {c.countryName}{' '}
                                                                ({c.countryCode})
                                                            </span>
                                                            <span className="visited-card-meta">
                                                                {t(
                                                                    'visited.visitedOn',
                                                                    {
                                                                        date: formatDate(
                                                                            c.visitedAt,
                                                                            'MMM D, YYYY'
                                                                        ),
                                                                    }
                                                                )}
                                                            </span>
                                                        </div>
                                                    </Link>
                                                    <div className="visited-card-actions">
                                                        <DeleteBtn
                                                            title={t(
                                                                'visited.remove.title'
                                                            )}
                                                            label={t(
                                                                'visited.remove.label'
                                                            )}
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
                                        {t('visited.emptyTab.places')}
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
                                                        <CountryFlag
                                                            code={v.countryCode}
                                                            title={v.placeCountry}
                                                            className="visited-card-flag"
                                                        />
                                                        <div className="visited-card-text">
                                                            <span className="visited-card-name">
                                                                {v.placeName}
                                                            </span>
                                                            <span className="visited-card-location">
                                                                {v.placeCity} ·{' '}
                                                                {v.placeCountry}
                                                            </span>
                                                            <span className="visited-card-meta">
                                                                {t(
                                                                    'visited.visitedOn',
                                                                    {
                                                                        date: formatDate(
                                                                            v.visitedAt,
                                                                            'MMM D, YYYY'
                                                                        ),
                                                                    }
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
                                                                        {t(
                                                                            'visited.fromTripBefore'
                                                                        )}{' '}
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
                                                                            ? ` ${t(
                                                                                  'visited.moreCount',
                                                                                  {
                                                                                      count:
                                                                                          v
                                                                                              .trips
                                                                                              .length -
                                                                                          1,
                                                                                  }
                                                                              )}`
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
                                                                    {t(
                                                                        'visited.viewTrip'
                                                                    )}
                                                                </Link>
                                                            )}
                                                        <DeleteBtn
                                                            title={t(
                                                                'visited.remove.title'
                                                            )}
                                                            label={t(
                                                                'visited.remove.label'
                                                            )}
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
                                    ariaLabel={t('visited.paginationAria', {
                                        tab: t(`visited.tabs.${activeTab}`),
                                    })}
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
