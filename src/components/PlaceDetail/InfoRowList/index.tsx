import Skeleton from "components/common/Skeleton";
import "./index.scss";

export interface InfoRow {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  /** Plain-text version of `value` for the row's accessible name, used when
   *  `value` is a node (badge/formatted markup) rather than a string. Ignored
   *  when `value` is already a string. */
  valueText?: string;
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
    {rows.map((row) => {
      // Each row is a keyboard tab stop that voices "label: value" — so
      // keyboard/screen-reader users Tab through the facts one by one instead
      // of the whole card being a single stop. role="group" because a bare
      // <div> (generic role) can't carry aria-label (axe aria-prohibited-attr).
      const valueStr =
        row.valueText ?? (typeof row.value === "string" ? row.value : undefined);
      const rowLabel = valueStr ? `${row.label}: ${valueStr}` : row.label;
      return (
        <div
          key={row.label}
          className="info-rows-row"
          role="group"
          tabIndex={0}
          aria-label={rowLabel}
        >
          <dt className="info-rows-label">
            <span className="info-rows-icon" aria-hidden="true">
              {row.icon}
            </span>
            {row.label}
          </dt>
          <dd className="info-rows-value">{row.value}</dd>
        </div>
      );
    })}
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
