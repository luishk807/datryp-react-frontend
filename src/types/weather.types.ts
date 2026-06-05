/** Coarse visual buckets for the weather chip — mirrors backend
 *  `WeatherFlavor` and the `WeatherWidget` flavor classes. Live current
 *  weather only ever resolves to these four. */
export type WeatherFlavor = "sunny" | "cloudy" | "rainy" | "cold";

/** Real current conditions for a coordinate, from the backend `/weather`
 *  endpoint (Open-Meteo). Replaces the AI-hallucinated climate sentence on
 *  the detail pages when coordinates are available. */
export interface WeatherLive {
  temperatureC: number;
  apparentTemperatureC: number | null;
  highC: number | null;
  lowC: number | null;
  windKph: number | null;
  isDay: boolean;
  weatherCode: number;
  condition: string;
  flavor: WeatherFlavor;
  observedAt: string | null;
}
