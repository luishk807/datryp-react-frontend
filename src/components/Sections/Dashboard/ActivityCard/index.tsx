import './index.scss';
import { useAdminActivityStats } from 'api/hooks/useAdmin';
import StatTile from '../StatTile';
import TopSearchesList from '../TopSearchesList';

const ActivityCard = () => {
    const { data, isLoading, error } = useAdminActivityStats();

    return (
        <section className="dashboard-card">
            <header className="dashboard-card-head">
                <h2 className="dashboard-card-title">Activity & content</h2>
                <p className="dashboard-card-subtitle">
                    What people are searching, saving, and planning.
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
                        <StatTile label="Trips" value={data.totalTrips} />
                        <StatTile label="Reviews" value={data.totalReviews} />
                        <StatTile
                            label="Searches · all-time"
                            value={data.totalSearchEvents}
                        />
                        <StatTile
                            label="Searches · 30d"
                            value={data.searchEventsLast30Days}
                            tone="accent"
                        />
                    </div>

                    <div className="activity-top-grid">
                        <div className="activity-top-section">
                            <h3 className="activity-top-title">
                                Top countries by search clicks
                            </h3>
                            {data.topCountries.length === 0 ? (
                                <p className="activity-top-empty">
                                    No clicks recorded yet.
                                </p>
                            ) : (
                                <ul className="activity-top-list">
                                    {data.topCountries.map((c, i) => (
                                        <li
                                            key={c.countryId}
                                            className="activity-top-row"
                                        >
                                            <span className="activity-top-rank">
                                                #{i + 1}
                                            </span>
                                            <span className="activity-top-name">
                                                {c.countryName}{' '}
                                                <span className="activity-top-sub">
                                                    ({c.countryCode})
                                                </span>
                                            </span>
                                            <span className="activity-top-count">
                                                {c.searchClicks}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="activity-top-section">
                            <h3 className="activity-top-title">
                                Top saved places
                            </h3>
                            {data.topSavedPlaces.length === 0 ? (
                                <p className="activity-top-empty">
                                    No bookmarks yet.
                                </p>
                            ) : (
                                <ul className="activity-top-list">
                                    {data.topSavedPlaces.map((p, i) => (
                                        <li
                                            key={p.placeKey}
                                            className="activity-top-row"
                                        >
                                            <span className="activity-top-rank">
                                                #{i + 1}
                                            </span>
                                            <span className="activity-top-name">
                                                {p.placeName}{' '}
                                                <span className="activity-top-sub">
                                                    {p.placeCity}, {p.placeCountry}
                                                </span>
                                            </span>
                                            <span className="activity-top-count">
                                                {p.uniqueSavers}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    <TopSearchesList />
                </>
            )}
        </section>
    );
};

export default ActivityCard;
