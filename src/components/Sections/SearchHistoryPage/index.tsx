/**
 * Full-page list of the current user's recent searches.
 *
 * Reachable via the `Recent searches` item in the user menu (`/history`).
 * Each row links to `/search?q=<query>` to rerun the search.
 *
 * Server-side paginated via the offset/limit parameters on
 * `/me/search-history`. One fetch per page keeps the payload small
 * regardless of how many searches the user has accumulated.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import moment from 'moment';
import Layout from 'components/common/Layout/SubLayout';
import Skeleton from 'components/common/Skeleton';
import Pagination from 'components/common/Pagination';
import { useSearchHistory } from 'api/hooks/useSearchHistory';
import { LIST_PAGE_SIZE } from 'constants';
import './index.scss';

const SearchHistoryPage = () => {
    const { t } = useTranslation();
    const [page, setPage] = useState(1);
    const { data, isLoading, isError, error } = useSearchHistory({
        limit: LIST_PAGE_SIZE,
        offset: (page - 1) * LIST_PAGE_SIZE,
    });

    const items = data?.items ?? [];
    const total = data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / LIST_PAGE_SIZE));

    return (
        <Layout title={t('nav.recentSearches')}>
            <article className="search-history-page">
                <header className="search-history-page-header">
                    <span className="search-history-page-icon" aria-hidden="true">
                        <HistoryRoundedIcon />
                    </span>
                    <div>
                        <h1 className="search-history-page-title">
                            {t('search.history.title')}
                        </h1>
                        <p className="search-history-page-subtitle">
                            {t('search.history.subtitle')}
                            {total > 0 && (
                                <>
                                    {' '}
                                    {total === 1
                                        ? t('search.history.uniqueOne', { n: total })
                                        : t('search.history.uniqueOther', { n: total })}
                                </>
                            )}
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
                        {t('search.history.loadError', {
                            detail:
                                error instanceof Error
                                    ? `: ${error.message}`
                                    : '.',
                        })}
                    </p>
                )}

                {!isLoading && !isError && items.length === 0 && (
                    <p className="search-history-page-empty">
                        {t('search.history.empty')}
                    </p>
                )}

                {!isLoading && !isError && items.length > 0 && (
                    <>
                        <ul className="search-history-page-list">
                            {items.map((item) => (
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
                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            onPageChange={(p) => {
                                setPage(p);
                                window.scrollTo({
                                    top: 0,
                                    behavior: 'smooth',
                                });
                            }}
                            ariaLabel={t('search.history.paginationAria')}
                        />
                    </>
                )}
            </article>
        </Layout>
    );
};

export default SearchHistoryPage;
