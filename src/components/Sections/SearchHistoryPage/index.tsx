/**
 * Full-page list of the current user's recent searches.
 *
 * Reachable via the `Recent searches` item in the user menu (`/history`).
 * Each row links to `/search?q=<query>` to rerun the search; the same
 * `useSearchHistory` hook drives the header dropdown is reused here.
 */
import { Link } from 'react-router-dom';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import moment from 'moment';
import Layout from 'components/common/Layout/SubLayout';
import Skeleton from 'components/common/Skeleton';
import { useSearchHistory } from 'api/hooks/useSearchHistory';
import './index.scss';

const SearchHistoryPage = () => {
    const { data, isLoading, isError, error } = useSearchHistory(10);

    return (
        <Layout title="Recent searches">
            <article className="search-history-page">
                <header className="search-history-page-header">
                    <span className="search-history-page-icon" aria-hidden="true">
                        <HistoryRoundedIcon />
                    </span>
                    <div>
                        <h1 className="search-history-page-title">Recent searches</h1>
                        <p className="search-history-page-subtitle">
                            Your 10 most-recent searches. Click any to rerun it.
                        </p>
                    </div>
                </header>

                {isLoading && (
                    <ul className="search-history-page-list">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <li key={i} className="search-history-page-row search-history-page-row-skeleton">
                                <Skeleton width="55%" height={16} radius={4} />
                                <Skeleton width="20%" height={12} radius={4} />
                            </li>
                        ))}
                    </ul>
                )}

                {isError && (
                    <p className="search-history-page-error" role="alert">
                        Couldn&rsquo;t load your history
                        {error instanceof Error ? `: ${error.message}` : '.'}
                    </p>
                )}

                {!isLoading && !isError && (!data || data.length === 0) && (
                    <p className="search-history-page-empty">
                        No searches yet. Once you start searching, you&rsquo;ll see your
                        recent queries here.
                    </p>
                )}

                {!isLoading && !isError && data && data.length > 0 && (
                    <ul className="search-history-page-list">
                        {data.map((item) => (
                            <li key={`${item.query}-${item.lastSearchedAt}`}>
                                <Link
                                    to={`/search?q=${encodeURIComponent(item.query)}`}
                                    className="search-history-page-row"
                                >
                                    <SearchRoundedIcon className="search-history-page-row-icon" />
                                    <span className="search-history-page-row-query">
                                        {item.query}
                                    </span>
                                    <span className="search-history-page-row-time">
                                        {moment(item.lastSearchedAt).fromNow()}
                                    </span>
                                    <ArrowForwardRoundedIcon
                                        className="search-history-page-row-arrow"
                                        fontSize="small"
                                    />
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </article>
        </Layout>
    );
};

export default SearchHistoryPage;
