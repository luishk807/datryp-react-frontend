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
  return (
  <DetailSection
    title={t('detail.common.whenToVisit.title')}
    icon={<AccessTimeRoundedIcon />}
  >
    <div className="when-to-visit">
      <div className="when-to-visit-row">
        {/* Decorative pill — the row's meaning is carried for assistive tech by
            the visually-hidden prefix on the value, so the loose "BEST" token
            isn't announced on its own. */}
        <span className="when-to-visit-label tone-best" aria-hidden="true">
          {t('detail.common.whenToVisit.best')}
        </span>
        <span className="when-to-visit-value">
          <span className="when-to-visit-sr">
            {t('detail.common.whenToVisit.best')}:{' '}
          </span>
          {bestTime}
        </span>
      </div>
      <div className="when-to-visit-row">
        <span className="when-to-visit-label tone-worst" aria-hidden="true">
          {t('detail.common.whenToVisit.worst')}
        </span>
        <span className="when-to-visit-value">
          <span className="when-to-visit-sr">
            {t('detail.common.whenToVisit.worst')}:{' '}
          </span>
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
