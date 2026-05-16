import './index.scss';
import { Tooltip } from '@mui/material';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import Skeleton from 'components/common/Skeleton';
import RatingStats from 'components/common/RatingStats';
import { usePlaceReviews } from 'api/hooks/useReviews';
import { getPlaceKey } from 'utils/placeKey';

export interface ReviewSummaryProps {
    placeName: string;
    placeCity: string;
    placeCountry: string;
    /** id of the DOM node to scroll to when the user clicks "View all". */
    targetId?: string;
}

/**
 * Small summary chip — fits next to the OpenAI rating on the place header.
 * Uses the same `usePlaceReviews` query as the full section; TanStack Query
 * dedupes so the page fires one request regardless of how many summaries
 * are on screen.
 */
const ReviewSummary = ({
    placeName,
    placeCity,
    placeCountry,
    targetId = 'reviews',
}: ReviewSummaryProps) => {
    const placeKey = getPlaceKey(placeName, placeCity, placeCountry);
    const { data, isLoading } = usePlaceReviews(placeKey);

    const handleViewAll = () => {
        const node = document.getElementById(targetId);
        if (node) {
            node.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    if (isLoading) {
        return (
            <div className="review-summary">
                <Skeleton width={120} height={16} radius={4} />
            </div>
        );
    }

    const total = data?.total ?? 0;
    const avg = data?.averageRating ?? 0;

    return (
        <div className="review-summary">
            <Tooltip title="Traveler reviews" arrow>
                <span
                    className="review-summary-icon"
                    role="img"
                    aria-label="Traveler reviews"
                >
                    <GroupsRoundedIcon />
                </span>
            </Tooltip>
            {total > 0 ? (
                <>
                    <RatingStats average={avg} total={total} size="md" />
                    <button
                        type="button"
                        className="review-summary-link"
                        onClick={handleViewAll}
                    >
                        View all
                    </button>
                </>
            ) : (
                <>
                    <span className="review-summary-empty">No reviews yet</span>
                    <button
                        type="button"
                        className="review-summary-link"
                        onClick={handleViewAll}
                    >
                        Be the first
                    </button>
                </>
            )}
        </div>
    );
};

export default ReviewSummary;
