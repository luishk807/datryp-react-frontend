import { useState } from 'react';
import './index.scss';
import { useAdminSubscribers } from 'api/hooks/useAdmin';
import { formatDate } from 'utils/date';
import type { SubscriberSort } from 'types';

const SORT_OPTIONS: { key: SubscriberSort; label: string }[] = [
    { key: 'recent', label: 'Latest updates' },
    { key: 'newest_signup', label: 'Newest signups' },
    { key: 'period_end', label: 'Period end' },
    { key: 'email', label: 'Email A-Z' },
];

const PER_PAGE = 10;

/**
 * Paginated paid-subscriber list. Lives inside SubscriptionCard.
 *
 * Sort options:
 *  - recent (default) — users.updated_at desc, surfaces fresh changes.
 *  - newest_signup — created_at desc.
 *  - period_end — current_period_end desc.
 *  - email — alphabetical.
 *
 * Pagination: 10 rows per page; Prev/Next buttons + page indicator.
 * Mobile: each row stacks as a self-contained card; sort + pagination
 * controls wrap. No horizontal scroll.
 */
const SubscribersList = () => {
    const [sort, setSort] = useState<SubscriberSort>('recent');
    const [page, setPage] = useState(1);
    const { data, isLoading, isFetching, error } = useAdminSubscribers({
        sort,
        page,
        perPage: PER_PAGE,
    });

    const handleSort = (next: SubscriberSort) => {
        setSort(next);
        setPage(1);
    };

    const total = data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    const hasPrev = page > 1;
    const hasNext = page < totalPages;

    return (
        <div className="subscribers-list">
            <header className="subscribers-list-head">
                <h3 className="subscribers-list-title">
                    Subscribed users{' '}
                    <span className="subscribers-list-count">
                        ({total.toLocaleString()})
                    </span>
                </h3>
                <div className="subscribers-list-sort">
                    {SORT_OPTIONS.map((opt) => (
                        <button
                            key={opt.key}
                            type="button"
                            className={
                                sort === opt.key
                                    ? 'subscribers-list-sort-btn is-active'
                                    : 'subscribers-list-sort-btn'
                            }
                            onClick={() => handleSort(opt.key)}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </header>

            {error && (
                <p className="subscribers-list-status subscribers-list-error">
                    {error instanceof Error
                        ? error.message
                        : 'Failed to load subscribers.'}
                </p>
            )}

            {isLoading && !data && (
                <p className="subscribers-list-status">Loading…</p>
            )}

            {data && data.items.length === 0 && (
                <p className="subscribers-list-status">
                    No paid subscribers yet.
                </p>
            )}

            {data && data.items.length > 0 && (
                <ul className="subscribers-list-rows">
                    {data.items.map((u) => (
                        <li key={u.id} className="subscriber-row">
                            <div className="subscriber-row-main">
                                <span className="subscriber-row-email">
                                    {u.email}
                                </span>
                                {u.name && (
                                    <span className="subscriber-row-name">
                                        {u.name}
                                    </span>
                                )}
                            </div>
                            <div className="subscriber-row-tags">
                                <span
                                    className={`subscriber-row-tag subscriber-row-plan-${u.subscriptionPlan}`}
                                >
                                    {u.subscriptionPlan}
                                </span>
                                <span
                                    className={`subscriber-row-tag subscriber-row-status-${u.subscriptionStatus}`}
                                >
                                    {u.subscriptionStatus}
                                </span>
                                {u.subscriptionCancelAtPeriodEnd && (
                                    <span className="subscriber-row-tag subscriber-row-cancel">
                                        cancelling
                                    </span>
                                )}
                            </div>
                            <div className="subscriber-row-dates">
                                {u.currentPeriodEnd && (
                                    <span>
                                        Period ends{' '}
                                        {formatDate(
                                            u.currentPeriodEnd,
                                            'MMM D, YYYY',
                                        )}
                                    </span>
                                )}
                                <span>
                                    Updated{' '}
                                    {formatDate(
                                        u.updatedAt,
                                        'MMM D, YYYY HH:mm',
                                    )}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {data && data.items.length > 0 && (
                <footer className="subscribers-list-foot">
                    <span className="subscribers-list-page-info">
                        Page {page} of {totalPages}
                        {isFetching ? ' · refreshing…' : ''}
                    </span>
                    <div className="subscribers-list-page-controls">
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

export default SubscribersList;
