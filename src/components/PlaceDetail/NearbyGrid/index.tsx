import { Link } from "react-router-dom";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ExploreRoundedIcon from "@mui/icons-material/ExploreRounded";
import Skeleton from "components/common/Skeleton";
import type { NearbyDestination } from "types";
import "./index.scss";

/** Titlecase a free-form `kind` value from OpenAI (city / region / district /
 *  park / neighborhood / …) so the meta line reads naturally regardless of
 *  what label the model returned. */
const formatKindLabel = (kind: string): string =>
  kind.length === 0
    ? ""
    : kind.charAt(0).toUpperCase() + kind.slice(1).toLowerCase();

export interface NearbyGridProps {
  items: NearbyDestination[];
}

/** Hard cap on rendered items. The recommender returns 5 entries, but
 *  the grid is designed for a single 4-column row on desktop — render
 *  4 max so the row stays clean instead of dropping the 5th onto its
 *  own line. Tablet / mobile still re-flow per the SCSS breakpoints. */
const VISIBLE_LIMIT = 4;

/**
 * Horizontal card grid for "Nearby — worth a side trip". One image-led
 * card per destination, four-across on desktop, two on tablet, one on
 * phone. Distance sorting was dropped — the recommender already orders
 * by relevance, and showing a "12 mi" badge on a region-scale entry
 * felt arbitrary. Cards link to `/place?q=<name>&i=0`; image falls
 * back to a green-tinted gradient with a compass glyph when the
 * recommender row hasn't been Unsplash-enriched yet (legacy cached
 * rows).
 */
const NearbyGrid = ({ items }: NearbyGridProps) => (
  <ul className="nearby-grid">
    {items.slice(0, VISIBLE_LIMIT).map((d, i) => (
      <li key={`${d.name}-${i}`} className="nearby-grid-item">
        <Link
          to={`/place?q=${encodeURIComponent(d.name)}&i=0`}
          className="nearby-grid-link"
        >
          <div
            className="nearby-grid-image"
            style={
              d.imageUrl
                ? { backgroundImage: `url(${d.imageUrl})` }
                : undefined
            }
          >
            {!d.imageUrl && (
              <ExploreRoundedIcon className="nearby-grid-image-fallback" />
            )}
          </div>
          <div className="nearby-grid-body">
            <div className="nearby-grid-head">
              <span className="nearby-grid-name">{d.name}</span>
              <ArrowForwardRoundedIcon
                className="nearby-grid-arrow"
                fontSize="small"
              />
            </div>
            <p className="nearby-grid-meta">
              {d.country} · {formatKindLabel(d.kind)}
            </p>
            <p className="nearby-grid-why">{d.why}</p>
          </div>
        </Link>
      </li>
    ))}
  </ul>
);

export const NearbyGridSkeleton = () => (
  <ul className="nearby-grid">
    {Array.from({ length: 4 }).map((_, i) => (
      <li key={i} className="nearby-grid-item nearby-grid-item-skeleton">
        <div className="nearby-grid-image is-loading" />
        <div className="nearby-grid-body">
          <Skeleton width="60%" height={16} radius={4} />
          <Skeleton width="40%" height={12} radius={4} />
          <Skeleton width="95%" height={12} radius={4} />
        </div>
      </li>
    ))}
  </ul>
);

export default NearbyGrid;
