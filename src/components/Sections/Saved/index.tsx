import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { placeDetailUrl } from 'utils/placeUrl';
import { BUTTON_VARIANT, NO_IMAGE } from 'constants';

const Saved = () => {
    const { t } = useTranslation();
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
        <Layout title={t('saved.title')}>
            <div className="saved-page">
                <header className="saved-page-header">
                    <h1 className="saved-page-title">
                        {t('saved.heading')}
                    </h1>
                    {!allEmpty && (
                        <p className="saved-page-summary">
                            {t('saved.summary', {
                                countries: t('saved.summaryCountries', {
                                    count: countryTotal,
                                }),
                                cities: t('saved.summaryCities', {
                                    count: cityTotal,
                                }),
                                places: t('saved.summaryPlaces', {
                                    count: placeTotal,
                                }),
                            })}
                        </p>
                    )}
                </header>

                {allEmpty && (
                    <div className="saved-page-empty">
                        <BookmarkRoundedIcon className="saved-page-empty-icon" />
                        <p>{t('saved.empty.heading')}</p>
                        <p className="saved-page-empty-hint">
                            {t('saved.empty.hintBefore')}{' '}
                            <Link to="/">{t('saved.empty.homeLink')}</Link>{' '}
                            {t('saved.empty.hintMiddle')}{' '}
                            <em>{t('saved.empty.hintEmphasis')}</em>{' '}
                            {t('saved.empty.hintAfter')}
                        </p>
                    </div>
                )}

                {countryTotal > 0 && (
                    <section className="saved-section">
                        <h2 className="saved-section-title">
                            {t('saved.sections.countries')}
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
                                                    {t('saved.savedOn', {
                                                        date: formatDate(
                                                            b.savedAt,
                                                            'MMM D, YYYY'
                                                        ),
                                                    })}
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
                                                title={t('saved.remove.title')}
                                                label={t('saved.remove.label')}
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
                            {t('saved.sections.cities')}
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
                                                    {t('saved.savedOn', {
                                                        date: formatDate(
                                                            b.savedAt,
                                                            'MMM D, YYYY'
                                                        ),
                                                    })}
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
                                                title={t('saved.remove.title')}
                                                label={t('saved.remove.label')}
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
                            {t('saved.sections.places')}
                            <span className="saved-section-count">
                                {placeTotal}
                            </span>
                        </h2>
                        <ul className="saved-list">
                            {places.map((b) => {
                                // Go-direct: the bookmark already carries city +
                                // country, so skip the recommender discovery hop
                                // and seed the place directly. Falls back to a
                                // name search only if those are somehow missing.
                                const placeHref = placeDetailUrl(
                                    b.placeName,
                                    b.placeCity,
                                    b.placeCountry,
                                );
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
                                                    {t('saved.savedOn', {
                                                        date: formatDate(
                                                            b.savedAt,
                                                            'MMM D, YYYY'
                                                        ),
                                                    })}
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
                                                title={t('saved.remove.title')}
                                                label={t('saved.remove.label')}
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
