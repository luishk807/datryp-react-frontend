import classNames from "classnames";
import Skeleton from "components/common/Skeleton";
import type { TipListSize } from "components/PlaceDetail/TipList";
// Reuse the live list's stylesheet so the skeleton stays in lockstep
// with `TipList` even when imported on a page that doesn't render the
// populated list at the same time.
import "components/PlaceDetail/TipList/index.scss";

export interface TipListSkeletonProps {
  /** Number of placeholder rows to render. Defaults to 5. */
  rows?: number;
  /** Density variant — must match the `size` of the `TipList` this is
   *  standing in for. Defaults to `md`. See `TipList` for the meaning of
   *  the two sizes. */
  size?: TipListSize;
}

/**
 * Loading-state placeholder for `TipList`. Renders `rows` items, each
 * with a short "name" bar and a longer "why" bar, matching the live
 * list's row shape. Uses the same `.tip-list` / `.tip-list-item` classes
 * (loaded from `TipList`'s stylesheet) so the layout stays in lockstep.
 */
const TipListSkeleton = ({ rows = 5, size = "md" }: TipListSkeletonProps) => (
  <ul className={classNames("tip-list", `size-${size}`)}>
    {Array.from({ length: rows }).map((_, i) => (
      <li key={i} className="tip-list-item">
        <Skeleton width="40%" height={14} radius={4} />
        <Skeleton width="90%" height={12} radius={4} />
      </li>
    ))}
  </ul>
);

export default TipListSkeleton;
