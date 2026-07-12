import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import { useTranslation } from "react-i18next";
import classNames from "classnames";
import AsyncText from "components/common/AsyncText";
import DetailSection from "components/PlaceDetail/DetailSection";
import "./index.scss";

type HighlightTier = "city" | "country";

export interface HighlightsSectionProps {
  city: string;
  country: string;
  /** "Biggest draw" sentence for the city. `undefined` while the
   *  enriched query is still loading — `AsyncText` shows a shimmer. */
  cityHighlight: string | undefined;
  /** "Biggest draw" sentence for the country. Same loading behavior. */
  countryHighlight: string | undefined;
  /** When true, the whole section renders nothing. Pass the source
   *  query's `isError` flag here instead of wrapping the call site in
   *  a `!isError && (...)` guard. */
  isError?: boolean;
}

/**
 * "Highlights" sidebar section — two pill-labeled rows showing the
 * biggest draw of the city (green pill) and the country (orange pill).
 */
const HighlightsSection = ({
  city,
  country,
  cityHighlight,
  countryHighlight,
  isError = false,
}: HighlightsSectionProps) => {
  const { t } = useTranslation();
  if (isError) return null;
  const rows: { tier: HighlightTier; label: string; highlight: string | undefined }[] = [
    { tier: "city", label: city, highlight: cityHighlight },
    { tier: "country", label: country, highlight: countryHighlight },
  ];
  return (
    <DetailSection
      title={t('detail.common.highlights.title')}
      icon={<EmojiEventsRoundedIcon />}
      contentRead="items"
    >
      <div className="highlights-section">
        {rows.map((row) => (
          // Each row is its own tab stop so keyboard + screen-reader users hear
          // "<place>: <highlight>" per row, instead of the whole card being one
          // stop that only announces "Highlights". The highlight is lazy-loaded,
          // so the name falls back to the place label until it resolves.
          <div
            key={row.tier}
            className="highlights-section-row"
            tabIndex={0}
            aria-label={
              row.highlight ? `${row.label}: ${row.highlight}` : row.label
            }
          >
            <span
              className={classNames(
                "highlights-section-label",
                `tier-${row.tier}`,
              )}
            >
              {row.label}
            </span>
            <span className="highlights-section-value">
              <AsyncText value={row.highlight} />
            </span>
          </div>
        ))}
      </div>
    </DetailSection>
  );
};

export default HighlightsSection;
