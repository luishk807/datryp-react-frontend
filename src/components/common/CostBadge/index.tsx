import classNames from "classnames";
import "./index.scss";

const COST_LABEL = [
  "Very cheap",
  "Cheap",
  "Mid-range",
  "Expensive",
  "Very expensive",
] as const;

export interface CostBadgeProps {
  /** 1-5 price tier. Values outside the range are clamped and rounded.
   *  `null` / `undefined` / non-finite values cause the badge to render
   *  nothing, so callers can drop it in unconditionally while their data
   *  is still loading. */
  level: number | null | undefined;
  /** Optional extra class for the wrapper — handy when a parent layout
   *  needs to resize or push the badge (see the Expenses heading). */
  className?: string;
}

/**
 * Generic 1-5 dollar-sign price-tier indicator (e.g. `$ $ $ . .`).
 * Filled `$` signs use the green accent; unfilled signs are muted.
 * The `title` tooltip provides a friendly label ("Mid-range", "Very
 * expensive", …) for hover.
 */
const CostBadge = ({ level, className }: CostBadgeProps) => {
  if (level == null || !Number.isFinite(level)) return null;
  const clamped = Math.max(1, Math.min(5, Math.round(level)));
  return (
    <span
      className={classNames("cost-badge", className)}
      aria-label={`Cost level ${clamped} out of 5`}
      title={`${clamped}/5 — ${COST_LABEL[clamped - 1]}`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={classNames("cost-badge-sign", { filled: i < clamped })}
          aria-hidden="true"
        >
          $
        </span>
      ))}
    </span>
  );
};

export default CostBadge;
