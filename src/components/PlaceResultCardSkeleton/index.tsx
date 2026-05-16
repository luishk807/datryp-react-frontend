import './index.scss';
import Skeleton from 'components/common/Skeleton';

export interface PlaceResultCardSkeletonProps {
    /** Render N copies when set. Omit for a single skeleton card. */
    count?: number;
}

// One card's worth of skeleton. Only %-based widths so it scales cleanly
// from a narrow mobile column to a wide tablet/desktop grid cell.
const SingleSkeleton = () => (
    <article className="place-result-card place-result-card-skeleton" aria-busy="true">
        <Skeleton className="place-result-card-skeleton-image" radius={0} />
        <div className="place-result-card-body">
            <Skeleton width="70%" height={20} radius={6} />
            <Skeleton width="50%" height={14} radius={4} />
            <Skeleton width="45%" height={16} radius={4} />
            <Skeleton width="40%" height={14} radius={4} />
            <Skeleton width="100%" height={12} radius={4} />
            <Skeleton width="92%" height={12} radius={4} />
        </div>
    </article>
);

/**
 * Skeleton placeholder shaped exactly like `PlaceResultCard` so the grid
 * doesn't jump when real results arrive. Pass `count` to render multiple.
 */
const PlaceResultCardSkeleton = ({ count }: PlaceResultCardSkeletonProps) => {
    if (count === undefined) return <SingleSkeleton />;
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <SingleSkeleton key={i} />
            ))}
        </>
    );
};

export default PlaceResultCardSkeleton;
