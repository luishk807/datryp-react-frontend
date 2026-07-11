import { useTranslation } from "react-i18next";
import classNames from "classnames";
import "./index.scss";

const COST_LABEL_KEY = [
  "detail.common.cost.l1",
  "detail.common.cost.l2",
  "detail.common.cost.l3",
  "detail.common.cost.l4",
  "detail.common.cost.l5",
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
  const { t } = useTranslation();
  if (level == null || !Number.isFinite(level)) return null;
  const clamped = Math.max(1, Math.min(5, Math.round(level)));
  return (
    <span
      className={classNames("cost-badge", className)}
      role="img"
      aria-label={t('detail.common.cost.aria', { n: clamped })}
      title={`${clamped}/5 — ${t(COST_LABEL_KEY[clamped - 1])}`}
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
