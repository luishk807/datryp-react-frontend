import './index.scss';
import classnames from 'classnames';
import { useAdminCostAnalytics } from 'api/hooks/useAdmin';
import StatTile from '../StatTile';

const currencyUsd = (n: number): string =>
    new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(n);

/**
 * "Costs" dashboard section — per-feature AI / 3rd-party spend ESTIMATE.
 *
 * Everything is an estimate built from the backend's per-call constant ×
 * inferred call counts (cold cache rows × calls-per-generation, uncached
 * searches, the AI-invocation log). Untracked third parties (Unsplash = free,
 * Google Places = not logged) are shown greyed at $0 with their note so the
 * gaps are explicit rather than silently missing.
 */
const CostsCard = () => {
    const { data, isLoading, error } = useAdminCostAnalytics();

    return (
        <section className="dashboard-card">
            <header className="dashboard-card-head">
                <h2 className="dashboard-card-title">AI &amp; service costs</h2>
                <p className="dashboard-card-subtitle">
                    Estimated spend per feature. All figures are modeled, not
                    billed — order-of-magnitude only.
                </p>
            </header>

            {isLoading && <p className="dashboard-card-status">Loading…</p>}
            {error && (
                <p className="dashboard-card-status dashboard-card-error">
                    {error instanceof Error ? error.message : 'Failed to load'}
                </p>
            )}

            {data && (
                <>
                    <div className="dashboard-stat-grid">
                        <StatTile
                            label="Est. total cost"
                            value={currencyUsd(data.totalEstimatedCostUsd)}
                            tone="warning"
                        />
                        <StatTile
                            label="OpenAI calls"
                            value={data.totalOpenaiCalls.toLocaleString()}
                        />
                        <StatTile
                            label="Served from cache"
                            value={data.totalCachedServed.toLocaleString()}
                            tone="positive"
                            hint="spend avoided"
                        />
                        <StatTile
                            label="Cost / call"
                            value={currencyUsd(data.estimatedCostPerCallUsd)}
                            tone="accent"
                        />
                    </div>

                    <div className="costs-table" role="table">
                        <div
                            className="costs-row costs-row-head"
                            role="row"
                        >
                            <span role="columnheader">Feature</span>
                            <span role="columnheader">Calls</span>
                            <span role="columnheader">Cached</span>
                            <span role="columnheader">Est. cost</span>
                        </div>
                        {data.features.map((f) => (
                            <div
                                key={f.feature}
                                className={classnames('costs-row', {
                                    'costs-row-untracked': !f.tracked,
                                })}
                                role="row"
                            >
                                <span className="costs-feature" role="cell">
                                    <span className="costs-feature-label">
                                        {f.label}
                                        {!f.tracked && (
                                            <span className="costs-untracked-tag">
                                                untracked
                                            </span>
                                        )}
                                    </span>
                                    {f.note && (
                                        <span className="costs-feature-note">
                                            {f.note}
                                        </span>
                                    )}
                                </span>
                                <span className="costs-num" role="cell">
                                    {f.tracked
                                        ? f.openaiCalls.toLocaleString()
                                        : '—'}
                                    {f.tracked && f.callsPerUnit > 1 && (
                                        <span className="costs-num-sub">
                                            ×{f.callsPerUnit}/gen
                                        </span>
                                    )}
                                </span>
                                <span className="costs-num" role="cell">
                                    {f.cachedServed > 0
                                        ? f.cachedServed.toLocaleString()
                                        : '—'}
                                </span>
                                <span className="costs-cost" role="cell">
                                    {f.tracked
                                        ? currencyUsd(f.estimatedCostUsd)
                                        : '—'}
                                </span>
                            </div>
                        ))}
                    </div>

                    <p className="costs-footnote">
                        Cost estimated at{' '}
                        {currencyUsd(data.estimatedCostPerCallUsd)}/call. Detail
                        pages fan out 3 calls (prose + lists + facts) per cold
                        generation. Unsplash is free; Google Places ratings
                        aren&apos;t persistently tracked.
                    </p>
                </>
            )}
        </section>
    );
};

export default CostsCard;
