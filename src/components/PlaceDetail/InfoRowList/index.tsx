import Skeleton from "components/common/Skeleton";
import "./index.scss";

export interface InfoRow {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

export interface InfoRowListProps {
  rows: InfoRow[];
}

/**
 * Shared `<dl>` key/value layout used by the "Travel basics" and
 * "Where to stay" sections on the place-detail page. Each row renders an
 * icon + uppercase label on the left and free-form content on the right,
 * with a 1-col / 2-col responsive grid. Kept here (not in `common/`)
 * because the visual style is tuned for this page's information density.
 */
const InfoRowList = ({ rows }: InfoRowListProps) => (
  <dl className="info-rows-list">
    {rows.map((row) => (
      <div key={row.label} className="info-rows-row">
        <dt className="info-rows-label">
          <span className="info-rows-icon" aria-hidden="true">
            {row.icon}
          </span>
          {row.label}
        </dt>
        <dd className="info-rows-value">{row.value}</dd>
      </div>
    ))}
  </dl>
);

export const InfoRowListSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="info-rows-list">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="info-rows-row">
        <Skeleton width="30%" height={14} radius={4} />
        <Skeleton width="80%" height={14} radius={4} />
      </div>
    ))}
  </div>
);

export default InfoRowList;
