import { useSearchParams } from 'react-router-dom';
import './index.scss';
import Layout from 'components/common/Layout/SubLayout';
import PlaceResultCard from 'components/PlaceResultCard';
import PlaceResultCardSkeleton from 'components/PlaceResultCardSkeleton';
import { useSearchPlaces } from 'api/hooks/useSearchPlaces';

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
                    Start a search from the homepage to see AI-curated places here.
                </p>
            );
        }
        if (isLoading) {
            return (
                <div className="search-results-grid" aria-live="polite" aria-busy="true">
                    <PlaceResultCardSkeleton count={SKELETON_COUNT} />
                </div>
            );
        }
        if (isError) {
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
