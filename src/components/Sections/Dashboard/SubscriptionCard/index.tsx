import './index.scss';
import { useAdminSubscriptionStats } from 'api/hooks/useAdmin';
import StatTile from '../StatTile';
import type { CountByKey } from 'types';

const STATUS_LABEL: Record<string, string> = {
    none: 'No sub',
    trialing: 'Trial',
    active: 'Active',
    past_due: 'Past due',
    canceled: 'Canceled',
};

const Bar = ({
    rows,
    labels,
}: {
    rows: CountByKey[];
    labels: Record<string, string>;
}) => {
    const max = Math.max(1, ...rows.map((r) => r.count));
    return (
        <ul className="sub-bar-list">
            {rows.map((r) => {
                const percent = Math.round((r.count / max) * 100);
                return (
                    <li className="sub-bar-row" key={r.key}>
                        <span className="sub-bar-label">
                            {labels[r.key] ?? r.key}
                        </span>
                        <div className="sub-bar-track">
                            <div
                                className={`sub-bar-fill sub-bar-fill-${r.key}`}
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                        <span className="sub-bar-count">{r.count}</span>
                    </li>
                );
            })}
        </ul>
    );
};

const SubscriptionCard = () => {
    const { data, isLoading, error } = useAdminSubscriptionStats();

    return (
        <section className="dashboard-card">
            <header className="dashboard-card-head">
                <h2 className="dashboard-card-title">Subscription</h2>
                <p className="dashboard-card-subtitle">
                    Status + churn from <code>users.subscription_*</code>{' '}
                    columns. (Plan distribution lives on the Overview page.)
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
                    <div className="dashboard-stat-grid sub-grid-2">
                        <StatTile
                            label="Active trials"
                            value={data.activeTrials}
                            tone="accent"
                        />
                        <StatTile
                            label="Cancelling at period end"
                            value={data.cancellingAtPeriodEnd}
                            tone="warning"
                        />
                    </div>

                    <div className="sub-section">
                        <h3 className="sub-section-title">By status</h3>
                        <Bar rows={data.byStatus} labels={STATUS_LABEL} />
                    </div>
                </>
            )}
        </section>
    );
};

export default SubscriptionCard;
