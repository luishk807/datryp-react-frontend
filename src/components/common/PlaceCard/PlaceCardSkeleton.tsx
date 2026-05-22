/**
 * Skeleton placeholder shaped like `PlaceCard` (the discovery card used
 * by `TopPlaces` and `PlacesYouMightLove`). Mirrors the real card's
 * geometry — same border-radius, image height, content padding — so the
 * grid doesn't jump when real cards arrive.
 *
 * Lives next to PlaceCard since it shares the `.place-card-*` styles
 * verbatim. Pass `count` to render multiple in a row.
 */
import Skeleton from 'components/common/Skeleton';
import './index.scss';

export interface PlaceCardSkeletonProps {
    /** Render N copies when set. Omit for a single skeleton card. */
    count?: number;
}

const SingleSkeleton = () => (
    <div
        className="place-card place-card-skeleton"
        aria-busy="true"
        aria-hidden="true"
    >
        <div className="place-card-image-wrap">
            <Skeleton width="100%" height="100%" radius={0} />
        </div>
        <div className="place-card-content">
            <Skeleton width="40%" height={12} radius={4} />
            <Skeleton
                width="65%"
                height={22}
                radius={6}
                className="place-card-skeleton-name"
            />
            <Skeleton width="100%" height={12} radius={4} />
            <Skeleton
                width="85%"
                height={12}
                radius={4}
                className="place-card-skeleton-tagline-line"
            />
        </div>
    </div>
);

const PlaceCardSkeleton = ({ count }: PlaceCardSkeletonProps) => {
    if (count === undefined) return <SingleSkeleton />;
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <SingleSkeleton key={i} />
            ))}
        </>
    );
};

export default PlaceCardSkeleton;
