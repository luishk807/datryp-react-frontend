import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import './index.scss';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import Layout from 'components/common/Layout/SubLayout';
import DeleteBtn from 'components/common/DeleteBtn';
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
import { BUTTON_VARIANT, NO_IMAGE, VISITED_SOURCE } from 'constants';
import type { VisitedPlace } from 'types';

const sourceLabel = (source: VisitedPlace['source']): string =>
    source === VISITED_SOURCE.ITINERARY ? 'From itinerary' : 'Marked manually';

const Visited = () => {
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

    return (
        <Layout title="Visited Places">
            <div className="visited-page">
                <header className="visited-page-header">
                    <h1 className="visited-page-title">Visited Places</h1>
                    {!anyLoading && !anyError && !allEmpty && (
                        <p className="visited-page-summary">
                            {countryCount}{' '}
                            countr{countryCount === 1 ? 'y' : 'ies'} ·{' '}
                            {cityTotal} cit{cityTotal === 1 ? 'y' : 'ies'} ·{' '}
                            {total} place{total === 1 ? '' : 's'}
                        </p>
                    )}
                </header>

                {anyLoading && <p className="visited-page-msg">Loading…</p>}

                {anyError && (
                    <p className="visited-page-msg visited-page-error" role="alert">
                        Could not load your visited list
                        {error instanceof Error ? ` — ${error.message}` : ''}.
                    </p>
                )}

                {!anyLoading && !anyError && allEmpty && (
                    <div className="visited-page-empty">
                        <CheckCircleRoundedIcon className="visited-page-empty-icon" />
                        <p>You haven't marked anywhere as visited yet.</p>
                        <p className="visited-page-empty-hint">
                            Open a country from the{' '}
                            <Link to="/">home page</Link> and tap{' '}
                            <em>"I've been here"</em>, or do the same on a
                            specific place page.
                        </p>
                    </div>
                )}

                {!anyLoading && !anyError && countryTotal > 0 && (
                    <section className="visited-section">
                        <h2 className="visited-section-title">
                            Countries
                            <span className="visited-section-count">
                                {countryTotal}
                            </span>
                        </h2>
                        <ul className="visited-list">
                            {countryItems.map((c) => (
                                <li key={c.id} className="visited-card">
                                    <Link
                                        to={`/country?code=${encodeURIComponent(c.countryCode)}`}
                                        className="visited-card-main"
                                    >
                                        <img
                                            src={c.countryImage ?? NO_IMAGE}
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
                                            targetName={c.countryName}
                                            buttonType={BUTTON_VARIANT.TEXT}
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
                    </section>
                )}

                {!anyLoading && !anyError && cityTotal > 0 && (
                    <section className="visited-section">
                        <h2 className="visited-section-title">
                            Cities
                            <span className="visited-section-count">
                                {cityTotal}
                            </span>
                        </h2>
                        <ul className="visited-list">
                            {cityItems.map((c) => (
                                <li key={c.id} className="visited-card">
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
                                                {c.countryName} ({c.countryCode})
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
                                            targetName={c.cityName}
                                            buttonType={BUTTON_VARIANT.TEXT}
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
                    </section>
                )}

                {!anyLoading && !anyError && total > 0 && (
                    <section className="visited-section">
                        <h2 className="visited-section-title">
                            Places
                            <span className="visited-section-count">
                                {total}
                            </span>
                        </h2>
                        <ul className="visited-list">
                            {items.map((v) => (
                                <li key={v.id} className="visited-card">
                                    <Link
                                        to={`/place?q=${encodeURIComponent(v.placeName)}&i=0`}
                                        className="visited-card-main"
                                    >
                                        <PublicRoundedIcon className="visited-card-icon" />
                                        <div className="visited-card-text">
                                            <span className="visited-card-name">
                                                {v.placeName}
                                            </span>
                                            <span className="visited-card-location">
                                                {v.placeCity} · {v.placeCountry}
                                            </span>
                                            <span className="visited-card-meta">
                                                Visited on{' '}
                                                {formatDate(v.visitedAt, 'MMM D, YYYY')}
                                                {' · '}
                                                {sourceLabel(v.source)}
                                            </span>
                                        </div>
                                    </Link>
                                    <div className="visited-card-actions">
                                        <DeleteBtn
                                            title="Remove from visited"
                                            label="Remove"
                                            targetName={v.placeName}
                                            buttonType={BUTTON_VARIANT.TEXT}
                                            onConfirm={() =>
                                                unmarkVisited.mutate(v.placeKey)
                                            }
                                        />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>
        </Layout>
    );
};

export default Visited;
