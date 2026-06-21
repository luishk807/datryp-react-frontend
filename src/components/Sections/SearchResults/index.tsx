import { Link, useSearchParams } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import './index.scss';
import Layout from 'components/common/Layout/SubLayout';
import PlaceResultCard from 'components/PlaceResultCard';
import PlaceResultCardSkeleton from 'components/PlaceResultCardSkeleton';
import PlanCards from 'components/PlanCards';
import { useSearchPlaces } from 'api/hooks/useSearchPlaces';
import { isQueryBlockedError } from 'api/moderationError';
import { isSearchQuotaExceededError } from 'api/searchQuotaError';

const SKELETON_COUNT = 4;

const SearchResults = () => {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const query = (searchParams.get('q') ?? '').trim();
    // Visit /search?debug=skeleton to preview the loading state without
    // touching the backend (zero OpenAI tokens). Add &count=N to override
    // the default skeleton count for visual testing. Remove the params to
    // go back to the normal flow.
    const debugSkeleton = searchParams.get('debug') === 'skeleton';
    const debugCount = Number(searchParams.get('count')) || SKELETON_COUNT;

    // Suppress the network call entirely while debugging the skeleton.
    const { data, isLoading, isError, error } = useSearchPlaces(
        debugSkeleton ? '' : query,
        2
    );

    const renderBody = () => {
        if (debugSkeleton) {
            return (
                <div className="search-results-grid" aria-live="polite" aria-busy="true">
                    <PlaceResultCardSkeleton count={debugCount} />
                </div>
            );
        }
        if (!query) {
            return (
                <p className="search-results-empty">
                    {t('search.results.emptyStart')}
                </p>
            );
        }
        if (isLoading) {
            // Skeleton cards mirror the eventual result grid so the
            // page doesn't shift on load. The old AI-orb loader
            // implied this was an AI-trip-building endpoint, which
            // it isn't — Description search is just sentence-based
            // place lookup. The real AI trip-builder loader lives
            // on /discover behind its own wizard.
            return (
                <div
                    className="search-results-grid"
                    aria-live="polite"
                    aria-busy="true"
                >
                    <PlaceResultCardSkeleton count={SKELETON_COUNT} />
                </div>
            );
        }
        if (isError) {
            if (isQueryBlockedError(error)) {
                return (
                    <p className="search-results-blocked">
                        <Trans
                            i18nKey="search.blocked"
                            components={{
                                link: (
                                    <Link
                                        to="/terms"
                                        className="search-results-blocked-link"
                                    />
                                ),
                            }}
                        />
                    </p>
                );
            }
            if (isSearchQuotaExceededError(error)) {
                return (
                    <div className="search-results-quota">
                        <p className="search-results-quota-headline">
                            <Trans
                                i18nKey="search.results.quotaHeadline"
                                values={{
                                    used: error.used,
                                    limit: error.limit,
                                }}
                                components={{ strong: <strong /> }}
                            />
                        </p>
                        <p className="search-results-quota-body">
                            <Trans
                                i18nKey="search.results.quotaBody"
                                components={{
                                    link: (
                                        <Link
                                            to="/membership"
                                            className="search-results-quota-link"
                                        />
                                    ),
                                }}
                            />
                        </p>
                        <div className="search-results-quota-plans">
                            <PlanCards
                                showTrialNote={false}
                            />
                        </div>
                    </div>
                );
            }
            return (
                <p className="search-results-error" role="alert">
                    {t('search.results.loadError', {
                        message:
                            error instanceof Error
                                ? error.message
                                : t('search.results.unknownError'),
                    })}
                </p>
            );
        }
        if (!data || data.items.length === 0) {
            return (
                <p className="search-results-empty">
                    {t('search.results.noMatches', { query })}
                </p>
            );
        }
        return (
            <>
                {/* AI overview of the matches — frames the result set ("ancient
                    ruins span South America, the Mediterranean…") so the page
                    reads as intelligent discovery, not just a card dump. Only
                    present on the interest-search path. */}
                {data.summary && (
                    <p className="search-results-summary">{data.summary}</p>
                )}
                <div className="search-results-grid">
                    {data.items.map((place, idx) => (
                        <PlaceResultCard
                            key={`${place.name}-${idx}`}
                            place={place}
                            query={query}
                            index={idx}
                        />
                    ))}
                </div>
                {/* Related searches keep the page from being a dead end — each
                    chip re-runs the discovery search for an adjacent interest.
                    Self-hides when the backend didn't return any. */}
                {data.relatedSearches && data.relatedSearches.length > 0 && (
                    <nav
                        className="search-results-related"
                        aria-label={t('search.results.relatedAria')}
                    >
                        <h2 className="search-results-related-heading">
                            {t('search.results.related')}
                        </h2>
                        <ul className="search-results-related-list">
                            {data.relatedSearches.map((term) => (
                                <li key={term}>
                                    <Link
                                        to={`/search?q=${encodeURIComponent(term)}`}
                                        className="search-results-related-chip"
                                    >
                                        {term}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                )}
            </>
        );
    };

    return (
        <Layout
            title={
                query
                    ? t('search.results.resultsFor', { query })
                    : t('nav.search')
            }
        >
            <div className="search-results-page">{renderBody()}</div>
        </Layout>
    );
};

export default SearchResults;
