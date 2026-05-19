import './index.scss';
import classnames from 'classnames';

export interface StatTileProps {
    label: string;
    value: number | string;
    /** Optional tone for accent coloring. Default is neutral grey. */
    tone?: 'positive' | 'accent' | 'warning';
    /** Optional sublabel under the number, e.g. "+12 this week". */
    hint?: string;
}

/** Square-ish summary tile used across all dashboard cards. Pure
 *  presentational — number on top, label below, optional hint. */
const StatTile = ({ label, value, tone, hint }: StatTileProps) => (
    <div
        className={classnames('stat-tile', tone && `stat-tile-${tone}`)}
    >
        <span className="stat-tile-value">{value}</span>
        <span className="stat-tile-label">{label}</span>
        {hint && <span className="stat-tile-hint">{hint}</span>}
    </div>
);

export default StatTile;
