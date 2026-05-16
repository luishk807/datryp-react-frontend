import './index.scss';
import StarInput, {
    type StarInputSize,
} from 'components/common/FormFields/StarInput';

export interface RatingStatsProps {
    /** Average rating across all reviews. `null` (or a 0 total) renders nothing. */
    average: number | null;
    /** Total review count — used to pluralize the trailing "(N reviews)". */
    total: number;
    /** Visual size of the stars. Defaults to `sm` (the compact chip look). */
    size?: StarInputSize;
}

/**
 * Shared `[★★★★☆ 4.2 (12 reviews)]` chip used wherever we display
 * aggregate review stats. Renders nothing when there are no reviews yet,
 * so callers can drop it in unconditionally.
 */
const RatingStats = ({ average, total, size = 'sm' }: RatingStatsProps) => {
    if (total === 0 || average === null) return null;
    return (
        <span className="rating-stats">
            <StarInput value={Math.round(average)} readonly size={size} />
            <span className="rating-stats-avg">{average.toFixed(1)}</span>
            <span className="rating-stats-count">
                ({total} review{total === 1 ? '' : 's'})
            </span>
        </span>
    );
};

export default RatingStats;
