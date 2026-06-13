import FlightRoundedIcon from "@mui/icons-material/FlightRounded";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import ParagraphSkeleton from "components/common/ParagraphSkeleton";
import DetailSection from "components/PlaceDetail/DetailSection";
import type { Airport } from "types";
import "./index.scss";

export interface AirportsSectionProps {
  /** Airports serving this destination. `undefined` while the
   *  enriched query is in flight (renders a 3-line skeleton).
   *  Empty array = the cached row pre-dates this feature; we show
   *  a one-line "Airport info unavailable" note so the section
   *  still has presence on the page. */
  airports: Airport[] | undefined;
  /** Source query's error flag — when true, the section is hidden
   *  entirely (consistent with VisaSection / WhenToVisitSection). */
  isError?: boolean;
}

const formatDistance = (km: number, t: TFunction): string =>
  km === 0
    ? t('detail.common.airports.inCity')
    : t('detail.common.airports.kmAway', { km });

/**
 * "Airports" sidebar section. Lists the 1-4 airports a traveler
 * would realistically fly into to reach this destination, sorted
 * by usefulness. AI-populated via the existing detail-page
 * enrichment flow.
 */
const AirportsSection = ({ airports, isError = false }: AirportsSectionProps) => {
  const { t } = useTranslation();
  if (isError) return null;

  const title = t('detail.common.airports.title');

  if (!airports) {
    return (
      <DetailSection title={title} icon={<FlightRoundedIcon />}>
        <ParagraphSkeleton lines={3} />
      </DetailSection>
    );
  }

  if (airports.length === 0) {
    return (
      <DetailSection title={title} icon={<FlightRoundedIcon />}>
        <p className="airports-empty">
          {t('detail.common.airports.unavailable')}
        </p>
      </DetailSection>
    );
  }

  return (
    <DetailSection title={title} icon={<FlightRoundedIcon />}>
      <ul className="airports-list">
        {airports.map((a) => (
          <li key={a.iataCode} className="airports-item">
            <span className="airports-code">{a.iataCode}</span>
            <div className="airports-meta">
              <span className="airports-name">{a.name}</span>
              <span className="airports-sub">
                {formatDistance(a.distanceKm, t)}
                {a.international && (
                  <>
                    {" · "}
                    <span className="airports-intl">
                      {t('detail.common.airports.international')}
                    </span>
                  </>
                )}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </DetailSection>
  );
};

export default AirportsSection;
