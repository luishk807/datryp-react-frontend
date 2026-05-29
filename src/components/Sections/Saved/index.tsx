import { Link } from 'react-router-dom';
import './index.scss';
import BookmarkRoundedIcon from '@mui/icons-material/BookmarkRounded';
import Layout from 'components/common/Layout/SubLayout';
import DeleteBtn from 'components/common/DeleteBtn';
import AddToBucketButton from 'components/AddToBucketButton';
import { useSavedPlaces, useUnsavePlace } from 'api/hooks/useSavedPlaces';
import { useSavedCities, useUnsaveCity } from 'api/hooks/useSavedCities';
import {
    useSavedCountries,
    useUnsaveCountry,
} from 'api/hooks/useSavedCountries';
import { formatDate } from 'utils/date';
import { BUTTON_VARIANT, NO_IMAGE } from 'constants';

const Saved = () => {
    const { data: placesData } = useSavedPlaces();
    const { data: citiesData } = useSavedCities();
    const { data: countriesData } = useSavedCountries();
    const unsavePlace = useUnsavePlace();
    const unsaveCity = useUnsaveCity();
    const unsaveCountry = useUnsaveCountry();

    const countries = countriesData?.items ?? [];
    const cities = citiesData?.items ?? [];
    const places = placesData?.items ?? [];

    const countryTotal = countries.length;
    const cityTotal = cities.length;
    const placeTotal = places.length;
    const allEmpty =
        countryTotal === 0 && cityTotal === 0 && placeTotal === 0;

    return (
        <Layout title="Saved">
            <div className="saved-page">
                <header className="saved-page-header">
                    <h1 className="saved-page-title">Your bookmarks</h1>
                    {!allEmpty && (
                        <p className="saved-page-summary">
                            {countryTotal}{' '}
                            countr{countryTotal === 1 ? 'y' : 'ies'} ·{' '}
                            {cityTotal} cit{cityTotal === 1 ? 'y' : 'ies'} ·{' '}
                            {placeTotal} place{placeTotal === 1 ? '' : 's'}{' '}
                            bookmarked
                        </p>
                    )}
                </header>

                {allEmpty && (
                    <div className="saved-page-empty">
                        <BookmarkRoundedIcon className="saved-page-empty-icon" />
                        <p>You haven't saved anything yet.</p>
                        <p className="saved-page-empty-hint">
                            Open a country or place from the{' '}
                            <Link to="/">home page</Link> and tap{' '}
                            <em>Save</em> on anything you want to come back to.
                        </p>
                    </div>
                )}

                {countryTotal > 0 && (
                    <section className="saved-section">
                        <h2 className="saved-section-title">
                            Countries
                            <span className="saved-section-count">
                                {countryTotal}
                            </span>
                        </h2>
                        <ul className="saved-list">
                            {countries.map((b) => {
                                const href = `/country?code=${encodeURIComponent(b.countryCode)}`;
                                return (
                                    <li
                                        key={b.id}
                                        className="saved-card"
                                    >
                                        <Link
                                            to={href}
                                            className="saved-card-main"
                                        >
                                            <img
                                                src={b.countryImage ?? NO_IMAGE}
                                                alt=""
                                                loading="lazy"
                                                className="saved-card-image"
                                            />
                                            <div className="saved-card-text">
                                                <span className="saved-card-name">
                                                    {b.countryName}
                                                </span>
                                                <span className="saved-card-location">
                                                    {b.countryCode}
                                                </span>
                                                <span className="saved-card-meta">
                                                    Saved on{' '}
                                                    {formatDate(
                                                        b.savedAt,
                                                        'MMM D, YYYY'
                                                    )}
                                                </span>
                                            </div>
                                        </Link>
                                        <div className="saved-card-actions">
                                            <AddToBucketButton
                                                kind="country"
                                                name={b.countryName}
                                                triggerClassName="saved-card-bucket-icon"
                                            />
                                            <DeleteBtn
                                                title="Remove from saved"
                                                label="Remove"
                                                targetName={b.countryName}
                                                buttonType={BUTTON_VARIANT.TEXT}
                                                onConfirm={() =>
                                                    unsaveCountry.mutate(
                                                        b.countryCode
                                                    )
                                                }
                                            />
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                )}

                {cityTotal > 0 && (
                    <section className="saved-section">
                        <h2 className="saved-section-title">
                            Cities
                            <span className="saved-section-count">
                                {cityTotal}
                            </span>
                        </h2>
                        <ul className="saved-list">
                            {cities.map((b) => {
                                const href =
                                    `/city?name=${encodeURIComponent(b.cityName)}` +
                                    `&country=${encodeURIComponent(b.countryName)}` +
                                    `&code=${encodeURIComponent(b.countryCode)}` +
                                    `&mode=single`;
                                return (
                                    <li
                                        key={b.id}
                                        className="saved-card"
                                    >
                                        <Link
                                            to={href}
                                            className="saved-card-main"
                                        >
                                            <img
                                                src={b.imageUrl ?? NO_IMAGE}
                                                alt=""
                                                loading="lazy"
                                                className="saved-card-image"
                                            />
                                            <div className="saved-card-text">
                                                <span className="saved-card-name">
                                                    {b.cityName}
                                                </span>
                                                <span className="saved-card-location">
                                                    {b.countryName} ({b.countryCode})
                                                </span>
                                                <span className="saved-card-meta">
                                                    Saved on{' '}
                                                    {formatDate(
                                                        b.savedAt,
                                                        'MMM D, YYYY'
                                                    )}
                                                </span>
                                            </div>
                                        </Link>
                                        <div className="saved-card-actions">
                                            <AddToBucketButton
                                                kind="city"
                                                name={b.cityName}
                                                context={b.countryName}
                                                triggerClassName="saved-card-bucket-icon"
                                            />
                                            <DeleteBtn
                                                title="Remove from saved"
                                                label="Remove"
                                                targetName={b.cityName}
                                                buttonType={BUTTON_VARIANT.TEXT}
                                                onConfirm={() =>
                                                    unsaveCity.mutate(
                                                        b.citySlug
                                                    )
                                                }
                                            />
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                )}

                {placeTotal > 0 && (
                    <section className="saved-section">
                        <h2 className="saved-section-title">
                            Places
                            <span className="saved-section-count">
                                {placeTotal}
                            </span>
                        </h2>
                        <ul className="saved-list">
                            {places.map((b) => {
                                // Prefer the cached (query, index) re-open so the
                                // recommender returns instantly. Fall back to a
                                // name search when the bookmark predates the
                                // search_query/index columns.
                                const placeHref =
                                    b.searchQuery && b.searchIndex !== null
                                        ? `/place?q=${encodeURIComponent(b.searchQuery)}&i=${b.searchIndex}`
                                        : `/place?q=${encodeURIComponent(b.placeName)}&i=0`;
                                return (
                                    <li
                                        key={b.id}
                                        className="saved-card"
                                    >
                                        <Link
                                            to={placeHref}
                                            className="saved-card-main"
                                        >
                                            <img
                                                src={b.imageUrl ?? NO_IMAGE}
                                                alt=""
                                                loading="lazy"
                                                className="saved-card-image"
                                            />
                                            <div className="saved-card-text">
                                                <span className="saved-card-name">
                                                    {b.placeName}
                                                </span>
                                                <span className="saved-card-location">
                                                    {b.placeCity} · {b.placeCountry}
                                                </span>
                                                <span className="saved-card-meta">
                                                    Saved on{' '}
                                                    {formatDate(
                                                        b.savedAt,
                                                        'MMM D, YYYY'
                                                    )}
                                                </span>
                                            </div>
                                        </Link>
                                        <div className="saved-card-actions">
                                            <AddToBucketButton
                                                kind="place"
                                                name={b.placeName}
                                                context={[
                                                    b.placeCity,
                                                    b.placeCountry,
                                                ]
                                                    .filter(Boolean)
                                                    .join(', ')}
                                                variant="pill"
                                            />
                                            <DeleteBtn
                                                title="Remove from saved"
                                                label="Remove"
                                                targetName={b.placeName}
                                                buttonType={BUTTON_VARIANT.TEXT}
                                                onConfirm={() =>
                                                    unsavePlace.mutate(
                                                        b.placeKey
                                                    )
                                                }
                                            />
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                )}
            </div>
        </Layout>
    );
};

export default Saved;
