import FlightTakeoffRoundedIcon from "@mui/icons-material/FlightTakeoffRounded";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import Skeleton from "components/common/Skeleton";
import { useUserLocation } from "hooks/useUserLocation";
import { haversineKm } from "utils/geo";
import type { Coordinates } from "types";
import "./index.scss";

interface TravelEstimate {
  mode: "drive" | "flight";
  /** Hours, rounded — drive uses 80 km/h, flight uses 800 km/h + 3 h airport buffer. */
  hours: number;
  /** Distance in km, rounded to nearest 10. */
  km: number;
}

/** Pick drive vs flight by distance and apply a coarse speed assumption.
 *  Numbers are intentionally rough — the widget is a "vibe check" not a
 *  travel itinerary, and the disclaimer makes that explicit. */
const estimateTravel = (km: number): TravelEstimate => {
  const rounded = Math.round(km / 10) * 10;
  if (km < 500) {
    return { mode: "drive", hours: km / 80, km: rounded };
  }
  return { mode: "flight", hours: km / 800 + 3, km: rounded };
};

const formatHours = (h: number): string => {
  if (h < 1) {
    const mins = Math.max(5, Math.round(h * 60));
    return `~${mins}m`;
  }
  if (h < 10) {
    const whole = Math.floor(h);
    const mins = Math.round((h - whole) * 60);
    return mins >= 5 ? `~${whole}h ${mins}m` : `~${whole}h`;
  }
  return `~${Math.round(h)}h`;
};

const formatKm = (km: number): string =>
  km >= 1000 ? `${(km / 1000).toFixed(1).replace(/\.0$/, "")}k km` : `${km} km`;

export interface TravelWidgetProps {
  placeName: string;
  placeCoords: Coordinates;
}

const TravelWidget = ({ placeName, placeCoords }: TravelWidgetProps) => {
  const { data: user, isLoading, isError } = useUserLocation();

  const mapsUrl = (() => {
    const dest = `${placeCoords.lat},${placeCoords.lng}`;
    const destLabel = encodeURIComponent(placeName);
    const base = `https://www.google.com/maps/dir/?api=1&destination=${dest}&destination_place_id=&destination_name=${destLabel}`;
    return user
      ? `${base}&origin=${user.lat},${user.lng}`
      : `${base}&origin=My+location`;
  })();

  if (isLoading) {
    return (
      <div className="travel-widget">
        <Skeleton width="80%" height={14} radius={4} />
        <Skeleton width="60%" height={14} radius={4} />
      </div>
    );
  }

  if (isError || !user) {
    // Geolocation blocked / rate-limited — still offer the Maps link so
    // the user can compute directions in Google themselves.
    return (
      <div className="travel-widget">
        <p className="travel-widget-fallback">
          Couldn&rsquo;t detect your location — open in Google Maps to get
          directions from where you are.
        </p>
        <a
          className="travel-widget-maps"
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in Google Maps <OpenInNewRoundedIcon fontSize="small" />
        </a>
      </div>
    );
  }

  const km = haversineKm(user, placeCoords);
  const est = estimateTravel(km);
  const fromLabel =
    [user.city, user.country].filter(Boolean).join(", ") || "your location";

  return (
    <div className="travel-widget">
      <p className="travel-widget-from">From {fromLabel}</p>
      <div className="travel-widget-stats">
        <span className="travel-widget-icon" aria-hidden="true">
          {est.mode === "flight" ? (
            <FlightTakeoffRoundedIcon />
          ) : (
            <DirectionsCarRoundedIcon />
          )}
        </span>
        <span className="travel-widget-distance">{formatKm(est.km)}</span>
        <span className="travel-widget-dot" aria-hidden="true">
          ·
        </span>
        <span className="travel-widget-duration">
          {formatHours(est.hours)} {est.mode}
        </span>
      </div>
      <a
        className="travel-widget-maps"
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open in Google Maps <OpenInNewRoundedIcon fontSize="small" />
      </a>
      <p className="travel-widget-disclaimer">
        Straight-line estimate — actual time depends on routes &amp; layovers.
      </p>
    </div>
  );
};

export default TravelWidget;
