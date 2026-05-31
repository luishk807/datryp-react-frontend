import { useMemo } from 'react';
import './index.scss';
import {
    useAdminAiUsage,
    useAdminOverview,
    useAdminSubscriptionGrowth,
} from 'api/hooks/useAdmin';
import { formatDate } from 'utils/date';
import BarChart from '../BarChart';
import LineChart from '../LineChart';
import UsersByGenderCard from '../UsersByGenderCard';
import PosthogStatsCard from '../PosthogStatsCard';

const MONTH_LABELS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];

/** Turn `YYYY-MM` into a short, human label. Used as x-axis tick text. */
const formatMonth = (key: string): string => {
    const [yearStr, monthStr] = key.split('-');
    const m = Number(monthStr);
    if (Number.isNaN(m) || m < 1 || m > 12) return key;
    return `${MONTH_LABELS[m - 1]} ${yearStr.slice(2)}`;
};

const currencyUsd = (n: number): string =>
    new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
    }).format(n);

const OverviewCard = () => {
    const { data: overview, isLoading: overviewLoading } = useAdminOverview();
    const { data: subGrowth, isLoading: subGrowthLoading } =
        useAdminSubscriptionGrowth(12);
    const { data: ai, isLoading: aiLoading } = useAdminAiUsage(12);

    const subGrowthCategories = useMemo(
        () => subGrowth?.months.map((m) => m.month) ?? [],
        [subGrowth]
    );
    const subGrowthValues = useMemo(
        () => subGrowth?.months.map((m) => m.count) ?? [],
        [subGrowth]
    );

    const aiCategories = useMemo(
        () => ai?.months.map((m) => m.month) ?? [],
        [ai]
    );
    const aiCalls = useMemo(
        () => ai?.months.map((m) => m.aiCalls) ?? [],
        [ai]
    );
    const cacheHits = useMemo(
        () => ai?.months.map((m) => m.cacheHits) ?? [],
        [ai]
    );

    return (
        <>
            <section className="dashboard-card">
                <header className="dashboard-card-head">
                    <h2 className="dashboard-card-title">
                        Subscription growth
                    </h2>
                    <p className="dashboard-card-subtitle">
                        New paid subscribers per month, last 12 months.
                        Doesn't model churn — see{' '}
                        <code>app/routers/admin.py</code> for the
                        approximation note.
                    </p>
                </header>
                {subGrowthLoading && (
                    <p className="dashboard-card-status">Loading…</p>
                )}
                {subGrowth && (
                    <LineChart
                        categories={subGrowthCategories}
                        series={[
                            {
                                key: 'subscribers',
                                label: 'New paid subscribers',
                                values: subGrowthValues,
                                color: '#228b22',
                            },
                        ]}
                        height={220}
                        formatX={formatMonth}
                    />
                )}
            </section>

            <section className="dashboard-card">
                <header className="dashboard-card-head">
                    <h2 className="dashboard-card-title">AI search expense</h2>
                    <p className="dashboard-card-subtitle">
                        Search events split by cache hit vs. AI call, last 12
                        months. AI calls = cache misses, the ones that
                        actually hit OpenAI.
                    </p>
                </header>
                {aiLoading && (
                    <p className="dashboard-card-status">Loading…</p>
                )}
                {ai && (
                    <>
                        <div className="overview-ai-stats">
                            <div className="overview-ai-stat">
                                <span className="overview-ai-stat-value">
                                    {ai.totalAiCalls.toLocaleString()}
                                </span>
                                <span className="overview-ai-stat-label">
                                    AI calls · 12mo
                                </span>
                            </div>
                            <div className="overview-ai-stat">
                                <span className="overview-ai-stat-value">
                                    {ai.totalCacheHits.toLocaleString()}
                                </span>
                                <span className="overview-ai-stat-label">
                                    Cache hits · 12mo
                                </span>
                            </div>
                            <div className="overview-ai-stat">
                                <span className="overview-ai-stat-value overview-ai-stat-cost">
                                    {currencyUsd(ai.totalEstimatedCostUsd)}
                                </span>
                                <span className="overview-ai-stat-label">
                                    Est. cost · 12mo
                                </span>
                            </div>
                        </div>
                        <BarChart
                            categories={aiCategories}
                            series={[
                                {
                                    key: 'ai_calls',
                                    label: 'AI calls',
                                    values: aiCalls,
                                    color: '#f38e40',
                                },
                                {
                                    key: 'cache_hits',
                                    label: 'Cache hits',
                                    values: cacheHits,
                                    color: '#228b22',
                                },
                            ]}
                            height={220}
                            formatX={formatMonth}
                        />
                        <p className="overview-ai-footnote">
                            Cost estimated at{' '}
                            {currencyUsd(ai.estimatedCostPerCallUsd)}/call —
                            edit the constant in{' '}
                            <code>app/routers/admin.py</code> if your rate is
                            different.
                        </p>
                    </>
                )}
            </section>

            <UsersByGenderCard />

            <PosthogStatsCard />

            <section className="dashboard-card">
                <header className="dashboard-card-head">
                    <h2 className="dashboard-card-title">Recent signups</h2>
                    <p className="dashboard-card-subtitle">
                        Most recent 20 accounts.
                    </p>
                </header>
                {overviewLoading && (
                    <p className="dashboard-card-status">Loading…</p>
                )}
                {overview && overview.recentSignups.length === 0 && (
                    <p className="dashboard-card-status">No signups yet.</p>
                )}
                {overview && overview.recentSignups.length > 0 && (
                    <ul className="dashboard-recent-list">
                        {overview.recentSignups.map((u) => (
                            <li
                                key={u.id}
                                className="dashboard-recent-row"
                            >
                                <div className="dashboard-recent-main">
                                    <span className="dashboard-recent-email">
                                        {u.email}
                                    </span>
                                    {u.name && (
                                        <span className="dashboard-recent-name">
                                            {u.name}
                                        </span>
                                    )}
                                </div>
                                <div className="dashboard-recent-meta">
                                    <span
                                        className={`dashboard-recent-tag dashboard-recent-plan-${u.subscriptionPlan}`}
                                    >
                                        {u.subscriptionPlan}
                                    </span>
                                    {u.role === 'admin' && (
                                        <span className="dashboard-recent-tag dashboard-recent-admin">
                                            admin
                                        </span>
                                    )}
                                    <span className="dashboard-recent-date">
                                        {formatDate(
                                            u.createdAt,
                                            'MMM D, YYYY HH:mm'
                                        )}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </>
    );
};

export default OverviewCard;
