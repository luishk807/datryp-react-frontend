import { useState } from 'react';
import './index.scss';
import { useAdminTopSearches } from 'api/hooks/useAdmin';

const PER_PAGE = 10;
const WINDOW_OPTIONS = [
    { days: 0, label: 'All time' },
    { days: 7, label: '7d' },
    { days: 30, label: '30d' },
    { days: 90, label: '90d' },
] as const;

/**
 * Paginated top-searches list. Lives inside ActivityCard.
 *
 * Each row: query text + count. Window toggle (all-time / 7d / 30d
 * / 90d) so admins can see fresh vs historical favorites. Pagination
 * is 10 rows per page; the BE returns the total distinct-query count
 * so we can render "Page X of Y" deterministically.
 *
 * Mobile: rows stack into single-column flex; controls wrap.
 */
const TopSearchesList = () => {
    const [windowDays, setWindowDays] = useState<number>(0);
    const [page, setPage] = useState(1);
    const { data, isLoading, isFetching, error } = useAdminTopSearches({
        page,
        perPage: PER_PAGE,
        days: windowDays,
    });

    const handleWindow = (days: number) => {
        setWindowDays(days);
        setPage(1);
    };

    const total = data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    const hasPrev = page > 1;
    const hasNext = page < totalPages;
    const offsetStart = (page - 1) * PER_PAGE + 1;

    return (
        <div className="top-searches-list">
            <header className="top-searches-head">
                <h3 className="top-searches-title">
                    Top searches{' '}
                    <span className="top-searches-count">
                        ({total.toLocaleString()} distinct)
                    </span>
                </h3>
                <div className="top-searches-window">
                    {WINDOW_OPTIONS.map((opt) => (
                        <button
                            key={opt.days}
                            type="button"
                            className={
                                windowDays === opt.days
                                    ? 'top-searches-window-btn is-active'
                                    : 'top-searches-window-btn'
                            }
                            onClick={() => handleWindow(opt.days)}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </header>

            {error && (
                <p className="top-searches-status top-searches-error">
                    {error instanceof Error
                        ? error.message
                        : 'Failed to load top searches.'}
                </p>
            )}

            {isLoading && !data && (
                <p className="top-searches-status">Loading…</p>
            )}

            {data && data.items.length === 0 && (
                <p className="top-searches-status">
                    No searches recorded in this window yet.
                </p>
            )}

            {data && data.items.length > 0 && (
                <ul className="top-searches-rows">
                    {data.items.map((row, i) => (
                        <li
                            key={`${row.query}-${i}`}
                            className="top-search-row"
                        >
                            <span className="top-search-rank">
                                #{offsetStart + i}
                            </span>
                            <span
                                className="top-search-query"
                                title={row.query}
                            >
                                {row.query}
                            </span>
                            <span className="top-search-count">
                                {row.count.toLocaleString()}
                            </span>
                        </li>
                    ))}
                </ul>
            )}

            {data && data.items.length > 0 && (
                <footer className="top-searches-foot">
                    <span className="top-searches-page-info">
                        Page {page} of {totalPages}
                        {isFetching ? ' · refreshing…' : ''}
                    </span>
                    <div className="top-searches-page-controls">
                        <button
                            type="button"
                            disabled={!hasPrev}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                            ← Prev
                        </button>
                        <button
                            type="button"
                            disabled={!hasNext}
                            onClick={() =>
                                setPage((p) => Math.min(totalPages, p + 1))
                            }
                        >
                            Next →
                        </button>
                    </div>
                </footer>
            )}
        </div>
    );
};

export default TopSearchesList;
