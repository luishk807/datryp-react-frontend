import WbSunnyRoundedIcon from "@mui/icons-material/WbSunnyRounded";
import WeatherWidget from "components/WeatherWidget";
import AsyncDetailSection from "components/PlaceDetail/AsyncDetailSection";

export interface WeatherSectionProps {
  /** Resolved weather summary text. Pass `undefined` while the enriched
   *  query is still loading — `AsyncDetailSection` renders a 3-line
   *  paragraph skeleton in its place. */
  weather: string | undefined;
  /** Whether the enriched query errored. When true, the section shows
   *  an inline "Could not load weather." paragraph instead of the
   *  widget. */
  isError: boolean;
}

/**
 * "Weather" sidebar section. Wraps `AsyncDetailSection` with a sun icon
 * and renders `WeatherWidget` once the weather text resolves.
 */
const WeatherSection = ({ weather, isError }: WeatherSectionProps) => (
  <AsyncDetailSection
    title="Weather"
    icon={<WbSunnyRoundedIcon />}
    data={weather}
    isError={isError}
    errorMessage="Could not load weather."
    loadingHint="Fetching the weather…"
    skeletonLines={3}
  >
    {(text) => <WeatherWidget text={text} />}
  </AsyncDetailSection>
);

export default WeatherSection;
