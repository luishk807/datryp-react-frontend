import { useTranslation } from "react-i18next";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import StarHalfRoundedIcon from "@mui/icons-material/StarHalfRounded";
import StarOutlineRoundedIcon from "@mui/icons-material/StarOutlineRounded";
import classNames from "classnames";
import "./index.scss";

export interface StarsProps {
  /** Rating value, 0-5. Half-stars render when the fractional part is ≥0.5. */
  rating: number;
  /** When false, hide the trailing numeric value. Defaults to true. */
  showValue?: boolean;
  /** Optional extra class for the wrapper. */
  className?: string;
}

/**
 * Read-only star rating display with half-star precision and a trailing
 * numeric label (e.g. `★★★★½ 4.5`). Use this for "show me an average rating"
 * surfaces. For interactive 1-5 picking, use `FormFields/StarInput`. For the
 * review-chip with "(N reviews)" suffix, use `RatingStats`.
 */
const Stars = ({ rating, showValue = true, className }: StarsProps) => {
  const { t } = useTranslation();
  const clamped = Math.max(0, Math.min(5, rating));
  const full = Math.floor(clamped);
  const hasHalf = clamped - full >= 0.5;
  const empty = 5 - full - (hasHalf ? 1 : 0);
  return (
    <span
      className={classNames("stars-display", className)}
      aria-label={t('search.card.ratingAria', { rating: clamped })}
    >
      {Array.from({ length: full }).map((_, i) => (
        <StarRoundedIcon key={`f-${i}`} className="stars-display-star filled" />
      ))}
      {hasHalf && <StarHalfRoundedIcon className="stars-display-star filled" />}
      {Array.from({ length: empty }).map((_, i) => (
        <StarOutlineRoundedIcon key={`e-${i}`} className="stars-display-star" />
      ))}
      {showValue && (
        <span className="stars-display-num">{clamped.toFixed(1)}</span>
      )}
    </span>
  );
};

export default Stars;
