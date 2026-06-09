import { Link, useSearchParams } from 'react-router-dom';
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
                    Start a search from the homepage to see curated places here.
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
                        DaTryp.com is a travel planner — try a search like
                        &ldquo;beach yoga retreat&rdquo; or
                        &ldquo;ancient ruins.&rdquo;{' '}
                        <Link to="/terms" className="search-results-blocked-link">
                            Learn more
                        </Link>
                        .
                    </p>
                );
            }
            if (isSearchQuotaExceededError(error)) {
                return (
                    <div className="search-results-quota">
                        <p className="search-results-quota-headline">
                            You&rsquo;ve used your{' '}
                            <strong>
                                {error.used}/{error.limit}
                            </strong>{' '}
                            free searches for today.
                        </p>
                        <p className="search-results-quota-body">
                            Free searches reset at midnight UTC. Or upgrade to
                            Pro for unlimited Advanced Search and unlimited
                            saved trips.{' '}
                            <Link
                                to="/membership"
                                className="search-results-quota-link"
                            >
                                See plan comparison
                            </Link>
                            .
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
                    Could not load recommendations: {error instanceof Error ? error.message : 'Unknown error'}
                </p>
            );
        }
        if (!data || data.items.length === 0) {
            return (
                <p className="search-results-empty">
                    No matches for &ldquo;{query}&rdquo;. Try a different search.
                </p>
            );
        }
        return (
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
        );
    };

    return (
        <Layout title={query ? `Results for "${query}"` : 'Search'}>
            <div className="search-results-page">{renderBody()}</div>
        </Layout>
    );
};

export default SearchResults;
