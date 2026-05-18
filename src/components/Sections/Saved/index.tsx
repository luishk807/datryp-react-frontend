import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import './index.scss';
import BookmarkRoundedIcon from '@mui/icons-material/BookmarkRounded';
import Layout from 'components/common/Layout/SubLayout';
import DeleteBtn from 'components/common/DeleteBtn';
import { useBookmarks } from 'hooks/useBookmarks';
import { formatDate } from 'utils/date';
import { BUTTON_VARIANT, NO_IMAGE } from 'constants';

const Saved = () => {
    const { bookmarks, remove, removeCountry, removeCity } = useBookmarks();

    const { countries, cities, places } = useMemo(() => {
        const c = bookmarks.filter((b) => b.kind === 'country');
        const ci = bookmarks.filter((b) => b.kind === 'city');
        const p = bookmarks.filter((b) => (b.kind ?? 'place') === 'place');
        return { countries: c, cities: ci, places: p };
    }, [bookmarks]);

    const countryTotal = countries.length;
    const cityTotal = cities.length;
    const placeTotal = places.length;
    const allEmpty =
        countryTotal === 0 && cityTotal === 0 && placeTotal === 0;

    return (
        <Layout title="Saved">
            <div className="saved-page">
                <header className="saved-page-header">
                    <h1 className="saved-page-title">Saved</h1>
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
                                const code = b.code ?? '';
                                const href = `/country?code=${encodeURIComponent(code)}`;
                                return (
                                    <li
                                        key={`country::${code}`}
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
                                                    {b.name}
                                                </span>
                                                <span className="saved-card-location">
                                                    {code}
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
                                            <DeleteBtn
                                                title="Remove from saved"
                                                label="Remove"
                                                targetName={b.name}
                                                buttonType={BUTTON_VARIANT.TEXT}
                                                onConfirm={() =>
                                                    removeCountry(code)
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
                                const code = b.code ?? '';
                                const href =
                                    `/city?name=${encodeURIComponent(b.name)}` +
                                    `&country=${encodeURIComponent(b.country)}` +
                                    `&code=${encodeURIComponent(code)}` +
                                    `&mode=single`;
                                return (
                                    <li
                                        key={`city::${b.name}--${code}`}
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
                                                    {b.name}
                                                </span>
                                                <span className="saved-card-location">
                                                    {b.country} ({code})
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
                                            <DeleteBtn
                                                title="Remove from saved"
                                                label="Remove"
                                                targetName={b.name}
                                                buttonType={BUTTON_VARIANT.TEXT}
                                                onConfirm={() =>
                                                    removeCity(b.name, code)
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
                                const placeHref = `/place?q=${encodeURIComponent(b.query)}&i=${b.index}`;
                                return (
                                    <li
                                        key={`place::${b.query}::${b.index}`}
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
                                                    {b.name}
                                                </span>
                                                <span className="saved-card-location">
                                                    {b.city} · {b.country}
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
                                            <DeleteBtn
                                                title="Remove from saved"
                                                label="Remove"
                                                targetName={b.name}
                                                buttonType={BUTTON_VARIANT.TEXT}
                                                onConfirm={() =>
                                                    remove(b.query, b.index)
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
