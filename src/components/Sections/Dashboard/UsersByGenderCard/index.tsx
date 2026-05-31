import { useMemo } from 'react';
import './index.scss';
import { useAdminUsersByGender } from 'api/hooks/useAdmin';
import PieChart, { type PieSlice } from '../PieChart';

const GENDER_COLORS: Record<string, string> = {
    Male: '#3a86ff',
    Female: '#f38e40',
    'Non-binary': '#8338ec',
    'Prefer not to say': '#9aa0a6',
    Unset: '#cccccc',
};

/**
 * Admin dashboard card — total users grouped by gender catalog value.
 *
 * Renders a small pie chart on the left, a legend + per-bucket count
 * column on the right. Synthetic "Unset" bucket counts users whose
 * `gender_id` is null so the totals match the dashboard overview's
 * user count.
 */
const UsersByGenderCard = () => {
    const { data, isLoading } = useAdminUsersByGender();

    const slices: PieSlice[] = useMemo(() => {
        if (!data) return [];
        return data.buckets.map((b) => ({
            key: b.genderName,
            label: b.genderName,
            count: b.count,
        }));
    }, [data]);

    const total = data?.total ?? 0;
    const hasData = total > 0;

    return (
        <section className="dashboard-card users-by-gender-card">
            <header className="dashboard-card-head">
                <h2 className="dashboard-card-title">Users by sex</h2>
                <p className="dashboard-card-subtitle">
                    Distribution of registered users by the gender they
                    picked during onboarding. "Unset" covers anyone who
                    skipped or hasn't completed that step.
                </p>
            </header>

            {isLoading && !data && (
                <div className="users-by-gender-empty">Loading…</div>
            )}

            {data && !hasData && (
                <div className="users-by-gender-empty">
                    No users yet.
                </div>
            )}

            {data && hasData && (
                <div className="users-by-gender-body">
                    <div className="users-by-gender-chart">
                        <PieChart
                            slices={slices}
                            colorByKey={GENDER_COLORS}
                        />
                    </div>
                    <ul className="users-by-gender-legend">
                        {slices.map((s) => {
                            const pct =
                                total > 0
                                    ? Math.round((s.count / total) * 100)
                                    : 0;
                            return (
                                <li
                                    key={s.key}
                                    className="users-by-gender-legend-item"
                                >
                                    <span
                                        className="users-by-gender-legend-swatch"
                                        style={{
                                            background:
                                                GENDER_COLORS[s.key] ??
                                                '#cccccc',
                                        }}
                                    />
                                    <span className="users-by-gender-legend-label">
                                        {s.label}
                                    </span>
                                    <span className="users-by-gender-legend-count">
                                        {s.count.toLocaleString()}{' '}
                                        <span className="users-by-gender-legend-pct">
                                            ({pct}%)
                                        </span>
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </section>
    );
};

export default UsersByGenderCard;
