import PsychologyAltRoundedIcon from "@mui/icons-material/PsychologyAltRounded";
import { useTranslation } from "react-i18next";
import "./index.scss";

export interface CulturalShockCalloutProps {
  /** The AI-generated cultural-shock paragraph. `undefined` while the
   *  query is loading; `null`/empty for cached rows that pre-date this
   *  field — in either case the callout renders nothing rather than
   *  showing a skeleton, since the surrounding About paragraph already
   *  carries the loading state and a second skeleton looks noisy. */
  text: string | null | undefined;
  /** Label used in the eyebrow ("Heads up about <subjectLabel>") so the
   *  callout reads naturally on country / city / place pages. Optional —
   *  falls back to a generic "Heads up". */
  subjectLabel?: string;
}

/**
 * Soft-orange callout that sits directly under the long-description /
 * About paragraph on detail pages. Surfaces the AI-generated read on
 * cultural-shock moments a first-time visitor might experience —
 * etiquette, taboos, dress, pace, etc.
 *
 * Self-hides when there's no content (either still loading or the
 * cached row pre-dates the field) so consumers can drop it in
 * unconditionally without a guard.
 */
const CulturalShockCallout = ({
  text,
  subjectLabel,
}: CulturalShockCalloutProps) => {
  const { t } = useTranslation();
  const trimmed = (text ?? "").trim();
  if (!trimmed) return null;

  const eyebrow = subjectLabel
    ? t('detail.common.culturalShock.headsUpAbout', { name: subjectLabel })
    : t('detail.common.culturalShock.headsUp');

  return (
    <aside className="cultural-shock-callout" role="note">
      <div className="cultural-shock-callout-icon">
        <PsychologyAltRoundedIcon />
      </div>
      <div className="cultural-shock-callout-body">
        <span className="cultural-shock-callout-eyebrow">{eyebrow}</span>
        <h3 className="cultural-shock-callout-title">
          {t('detail.common.culturalShock.title')}
        </h3>
        <p className="cultural-shock-callout-text">{trimmed}</p>
      </div>
    </aside>
  );
};

export default CulturalShockCallout;
