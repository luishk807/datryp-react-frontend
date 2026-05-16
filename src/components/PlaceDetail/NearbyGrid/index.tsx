import { Link } from "react-router-dom";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import Skeleton from "components/common/Skeleton";
import { haversineKm, KM_TO_MI } from "utils/geo";
import type { Coordinates, NearbyDestination } from "types";
import "./index.scss";

/** Titlecase a free-form `kind` value from OpenAI (city / region / district /
 *  park / neighborhood / …) so the meta line reads naturally regardless of
 *  what label the model returned. */
const formatKindLabel = (kind: string): string =>
  kind.length === 0
    ? ""
    : kind.charAt(0).toUpperCase() + kind.slice(1).toLowerCase();

const formatMiles = (mi: number): string => {
  if (mi < 10) return `${mi.toFixed(1)} mi`;
  if (mi < 1000) return `${Math.round(mi)} mi`;
  return `${(mi / 1000).toFixed(1).replace(/\.0$/, "")}k mi`;
};

export interface NearbyGridProps {
  items: NearbyDestination[];
  origin: Coordinates;
}

const NearbyGrid = ({ items, origin }: NearbyGridProps) => {
  // Sort nearest-first by the haversine distance from the place currently
  // being viewed. OpenAI is asked to do this server-side too, but we re-sort
  // defensively in case the model misorders.
  const enriched = items
    .map((d) => ({
      d,
      mi: haversineKm(origin, { lat: d.lat, lng: d.lng }) * KM_TO_MI,
    }))
    .sort((a, b) => a.mi - b.mi);

  return (
    <ul className="nearby-grid">
      {enriched.map(({ d, mi }, i) => (
        <li key={`${d.name}-${i}`} className="nearby-grid-item">
          <Link
            to={`/place?q=${encodeURIComponent(d.name)}&i=0`}
            className="nearby-grid-link"
          >
            <div className="nearby-grid-head">
              <span className="nearby-grid-name">{d.name}</span>
              <span className="nearby-grid-distance">{formatMiles(mi)}</span>
              <ArrowForwardRoundedIcon
                className="nearby-grid-arrow"
                fontSize="small"
              />
            </div>
            <p className="nearby-grid-meta">
              {d.country} · {formatKindLabel(d.kind)}
            </p>
            <p className="nearby-grid-why">{d.why}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
};

export const NearbyGridSkeleton = () => (
  <ul className="nearby-grid">
    {Array.from({ length: 5 }).map((_, i) => (
      <li key={i} className="nearby-grid-item nearby-grid-item-skeleton">
        <Skeleton width="50%" height={16} radius={4} />
        <Skeleton width="35%" height={12} radius={4} />
        <Skeleton width="95%" height={12} radius={4} />
      </li>
    ))}
  </ul>
);

export default NearbyGrid;
