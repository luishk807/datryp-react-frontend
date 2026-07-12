import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import { useTranslation } from "react-i18next";
import AsyncText from "components/common/AsyncText";
import DetailSection from "components/PlaceDetail/DetailSection";
import "./index.scss";

export interface WhenToVisitSectionProps {
  /** Best season/months to visit — always present, comes from the cached
   *  search-result payload. Rendered as plain text. */
  bestTime: string;
  /** Worst season/months — resolved from the enriched query. `undefined`
   *  while loading; the `AsyncText` shows a shimmer. */
  worstTime: string | undefined;
  /** Whether the enriched query errored. When true the worst-time row
   *  falls back to an em-dash so the section stays visible. */
  isError: boolean;
}

/**
 * "When to visit" sidebar section with two label-pilled rows: Best
 * (green pill, always-present cached value) and Worst (red pill,
 * lazy-loaded with em-dash fallback on error). Always renders — the
 * Best row keeps the section meaningful even when the enriched query
 * fails.
 */
const WhenToVisitSection = ({
  bestTime,
  worstTime,
  isError,
}: WhenToVisitSectionProps) => {
  const { t } = useTranslation();
  const bestLabel = t('detail.common.whenToVisit.best');
  const worstLabel = t('detail.common.whenToVisit.worst');
  // The worst value is lazy-loaded; fall back to the em-dash on error so the
  // row's accessible name matches what's shown. Undefined while loading — the
  // row then just names the label until the value resolves.
  const worstValue = worstTime ?? (isError ? '—' : undefined);
  return (
  <DetailSection
    title={t('detail.common.whenToVisit.title')}
    icon={<AccessTimeRoundedIcon />}
    contentRead="items"
  >
    <div className="when-to-visit">
      {/* Each row is its own tab stop so keyboard + screen-reader users hear
          "<label>: <value>" per row, instead of the whole card being one stop
          that only announces "When to visit". */}
      <div
        className="when-to-visit-row"
        tabIndex={0}
        aria-label={`${bestLabel}: ${bestTime}`}
      >
        <span className="when-to-visit-label tone-best">{bestLabel}</span>
        <span className="when-to-visit-value">{bestTime}</span>
      </div>
      <div
        className="when-to-visit-row"
        tabIndex={0}
        aria-label={worstValue ? `${worstLabel}: ${worstValue}` : worstLabel}
      >
        <span className="when-to-visit-label tone-worst">{worstLabel}</span>
        <span className="when-to-visit-value">
          <AsyncText
            value={worstTime}
            isError={isError}
            errorFallback="—"
            skeletonWidth="80%"
          />
        </span>
      </div>
    </div>
  </DetailSection>
  );
};

export default WhenToVisitSection;
