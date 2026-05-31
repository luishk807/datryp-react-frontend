import { useMemo, useState } from 'react';
import './index.scss';
import { useAdminPosthogStats } from 'api/hooks/useAdmin';
import StatTile from '../StatTile';
import LineChart from '../LineChart';

const WINDOW_OPTIONS = [
    { days: 7, label: '7d' },
    { days: 30, label: '30d' },
    { days: 90, label: '90d' },
] as const;

/**
 * Admin dashboard card — headline PostHog metrics over a rolling
 * window. Three states:
 *
 * - Loading: skeleton text.
 * - Not configured: setup prompt with the env vars the admin needs
 *   to set on the backend.
 * - Configured: total events tile, unique users tile, top-events
 *   list, and a daily-events LineChart.
 *
 * Window selectable between 7/30/90 days. The backend caps at 365.
 */
const PosthogStatsCard = () => {
    const [windowDays, setWindowDays] = useState<number>(30);
    const { data, isLoading } = useAdminPosthogStats(windowDays);

    const categories = useMemo(
        () => data?.dailyEvents.map((d) => d.day) ?? [],
        [data],
    );
    const dailySeries = useMemo(
        () => [
            {
                key: 'events',
                label: 'Events',
                values: data?.dailyEvents.map((d) => d.count) ?? [],
                color: '#f38e40',
            },
        ],
        [data],
    );

    return (
        <section className="dashboard-card posthog-stats-card">
            <header className="dashboard-card-head posthog-stats-head">
                <div>
                    <h2 className="dashboard-card-title">
                        PostHog analytics
                    </h2>
                    <p className="dashboard-card-subtitle">
                        Server-side pull from PostHog's Query API.
                        Refreshes every 5 minutes; cached on the FE for
                        a minute so quick re-visits don't re-fetch.
                    </p>
                </div>
                <div className="posthog-stats-windows">
                    {WINDOW_OPTIONS.map((opt) => (
                        <button
                            key={opt.days}
                            type="button"
                            className={
                                windowDays === opt.days
                                    ? 'posthog-stats-window is-active'
                                    : 'posthog-stats-window'
                            }
                            onClick={() => setWindowDays(opt.days)}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </header>

            {isLoading && !data && (
                <div className="posthog-stats-empty">Loading…</div>
            )}

            {data && !data.configured && (
                <div className="posthog-stats-setup">
                    <h3>PostHog isn&rsquo;t configured yet.</h3>
                    <p>
                        Set these env vars on the backend (
                        <code>.env</code>) and restart uvicorn to
                        unlock this card:
                    </p>
                    <ul>
                        <li>
                            <code>POSTHOG_API_KEY</code> — personal API
                            key from{' '}
                            <a
                                href="https://us.posthog.com/settings/user-api-keys"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                PostHog → Personal API keys
                            </a>{' '}
                            with <em>Query Read</em> + <em>Project Read</em>{' '}
                            scopes.
                        </li>
                        <li>
                            <code>POSTHOG_PROJECT_ID</code> — numeric
                            project id (visible in the URL when you open
                            your project's settings).
                        </li>
                        <li>
                            <code>POSTHOG_API_HOST</code> — optional
                            override; defaults to{' '}
                            <code>https://us.posthog.com</code>. Use{' '}
                            <code>https://eu.posthog.com</code> for an
                            EU project.
                        </li>
                    </ul>
                </div>
            )}

            {data && data.configured && (
                <div className="posthog-stats-body">
                    <div className="posthog-stats-tiles">
                        <StatTile
                            label={`Total events (${data.windowDays}d)`}
                            value={data.totalEvents.toLocaleString()}
                            tone="accent"
                        />
                        <StatTile
                            label={`Unique users (${data.windowDays}d)`}
                            value={data.uniqueUsers.toLocaleString()}
                            tone="positive"
                        />
                        <StatTile
                            label="Top event"
                            value={
                                data.topEvents[0]?.event ?? '—'
                            }
                            hint={
                                data.topEvents[0]?.count != null
                                    ? `${data.topEvents[0].count.toLocaleString()} fires`
                                    : undefined
                            }
                        />
                    </div>

                    {data.dailyEvents.length > 1 && (
                        <div className="posthog-stats-chart">
                            <LineChart
                                categories={categories}
                                series={dailySeries}
                            />
                        </div>
                    )}

                    {data.topEvents.length > 0 && (
                        <div className="posthog-stats-events">
                            <h3 className="posthog-stats-events-title">
                                Top events
                            </h3>
                            <ul className="posthog-stats-events-list">
                                {data.topEvents.map((e) => (
                                    <li
                                        key={e.event}
                                        className="posthog-stats-event-row"
                                    >
                                        <span className="posthog-stats-event-name">
                                            {e.event}
                                        </span>
                                        <span className="posthog-stats-event-count">
                                            {e.count.toLocaleString()}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
};

export default PosthogStatsCard;
