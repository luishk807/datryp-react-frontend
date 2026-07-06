import type { ReactNode } from 'react';
import './index.scss';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import BeachAccessRoundedIcon from '@mui/icons-material/BeachAccessRounded';
import AcUnitRoundedIcon from '@mui/icons-material/AcUnitRounded';
import GrainRoundedIcon from '@mui/icons-material/GrainRounded';
import FilterDramaRoundedIcon from '@mui/icons-material/FilterDramaRounded';
import CloudRoundedIcon from '@mui/icons-material/CloudRounded';
import WbSunnyRoundedIcon from '@mui/icons-material/WbSunnyRounded';
import type { WeatherLive } from 'types';
import { convertTemp, useTempUnit, type TempUnit } from 'hooks/useTempUnit';

const WEATHER_CONDITION = {
    TROPICAL: 'tropical',
    COLD: 'cold',
    RAINY: 'rainy',
    CLOUDY: 'cloudy',
    MILD: 'mild',
    SUNNY: 'sunny',
} as const;

type WeatherCondition = (typeof WEATHER_CONDITION)[keyof typeof WEATHER_CONDITION];

interface WeatherFlavor {
    icon: ReactNode;
    labelKey: string;
    className: string;
}

/** Pick a vibe from the free-text weather paragraph. Order matters — checks
 *  go from most-distinctive keywords to least. Falls back to "sunny". */
const detectCondition = (text: string): WeatherCondition => {
    const t = text.toLowerCase();
    if (/(snow|winter|freezing|sub-?zero|alpine|arctic)/.test(t)) return WEATHER_CONDITION.COLD;
    if (/(monsoon|rainy season|rainfall|wet season|heavy rain)/.test(t)) return WEATHER_CONDITION.RAINY;
    if (/(tropical|humid|equatorial|jungle)/.test(t)) return WEATHER_CONDITION.TROPICAL;
    if (/(overcast|cloudy|foggy|mist)/.test(t)) return WEATHER_CONDITION.CLOUDY;
    if (/(mild|temperate|cool|moderate|pleasant)/.test(t)) return WEATHER_CONDITION.MILD;
    return WEATHER_CONDITION.SUNNY;
};

/** Label key = `detail.common.weatherFlavor.<value>`; className =
 *  `weather-flavor-<value>`. Keeping both derived means renaming a
 *  `WEATHER_CONDITION` value flows everywhere (including the user-facing
 *  pill and the SCSS hook). */
const flavorFor = (c: WeatherCondition, icon: ReactNode): WeatherFlavor => ({
    icon,
    labelKey: `detail.common.weatherFlavor.${c}`,
    className: `weather-flavor-${c}`,
});

const WEATHER_FLAVORS: Record<WeatherCondition, WeatherFlavor> = {
    [WEATHER_CONDITION.TROPICAL]: flavorFor(WEATHER_CONDITION.TROPICAL, <BeachAccessRoundedIcon />),
    [WEATHER_CONDITION.COLD]:     flavorFor(WEATHER_CONDITION.COLD,     <AcUnitRoundedIcon />),
    [WEATHER_CONDITION.RAINY]:    flavorFor(WEATHER_CONDITION.RAINY,    <GrainRoundedIcon />),
    [WEATHER_CONDITION.CLOUDY]:   flavorFor(WEATHER_CONDITION.CLOUDY,   <CloudRoundedIcon />),
    [WEATHER_CONDITION.MILD]:     flavorFor(WEATHER_CONDITION.MILD,     <FilterDramaRoundedIcon />),
    [WEATHER_CONDITION.SUNNY]:    flavorFor(WEATHER_CONDITION.SUNNY,    <WbSunnyRoundedIcon />),
};

/** WMO weather codes (Open-Meteo) → i18n key under `detail.common.weatherCode`.
 *  Lets the live condition badge render in the active language instead of the
 *  backend's English `condition` string. Unmapped codes fall back to that raw
 *  string so we never show a blank tag. */
const WEATHER_CODE_KEY: Record<number, string> = {
    0: 'clear',
    1: 'mainlyClear',
    2: 'partlyCloudy',
    3: 'overcast',
    45: 'fog',
    48: 'fog',
    51: 'lightDrizzle',
    53: 'drizzle',
    55: 'denseDrizzle',
    56: 'freezingDrizzle',
    57: 'freezingDrizzle',
    61: 'slightRain',
    63: 'rain',
    65: 'heavyRain',
    66: 'freezingRain',
    67: 'freezingRain',
    71: 'slightSnow',
    73: 'snow',
    75: 'heavySnow',
    77: 'snowGrains',
    80: 'slightShowers',
    81: 'showers',
    82: 'violentShowers',
    85: 'snowShowers',
    86: 'heavySnowShowers',
    95: 'thunderstorm',
    96: 'thunderstormHail',
    99: 'thunderstormHail',
};

// Main temperature carries the unit so it's never ambiguous ("26°C" / "79°F");
// the high/low range shows bare degrees (same, obviously, as the main reading).
const mainTemp = (c: number, unit: TempUnit) => `${convertTemp(c, unit)}°${unit}`;
const rangeTemp = (c: number, unit: TempUnit) => `${convertTemp(c, unit)}°`;

export interface WeatherWidgetProps {
    /** Free-text climate paragraph. When `current` is absent, the widget
     *  keyword-scans this to pick a visual flavor and renders it as the body.
     *  When `current` IS present, this becomes a muted secondary "typical
     *  climate" line below the live readout. Optional so a live-only render
     *  (prose slice failed but coords resolved) still works. */
    text?: string;
    /** Real current conditions from the `/weather` endpoint. When present, the
     *  widget shows the live temperature + condition + today's range and uses
     *  the live `flavor` for the icon/tag instead of keyword-scanning `text`. */
    current?: WeatherLive;
}

/**
 * Compact weather chip. With `current`, shows real conditions (temperature,
 * condition, today's high/low) from Open-Meteo and keeps the climate `text` as
 * a muted secondary line. Without it, falls back to the legacy keyword-scanned
 * climate paragraph. `detectCondition` runs on every render but the keyword
 * regex is cheap, so no memoization is needed.
 */
const WeatherWidget = ({ text, current }: WeatherWidgetProps) => {
    const { t } = useTranslation();
    const { unit, setUnit } = useTempUnit();
    const flavor = current
        ? WEATHER_FLAVORS[current.flavor]
        : WEATHER_FLAVORS[detectCondition(text ?? '')];
    // Localize the live condition via its WMO code; fall back to the backend's
    // (English) condition string for any code we don't have a label for.
    const conditionLabel = current
        ? WEATHER_CODE_KEY[current.weatherCode]
            ? t(`detail.common.weatherCode.${WEATHER_CODE_KEY[current.weatherCode]}`)
            : current.condition
        : '';
    return (
        <div className={classNames('weather-widget', flavor.className)}>
            <div className="weather-widget-icon" aria-hidden="true">
                {flavor.icon}
            </div>
            <div className="weather-widget-body">
                {current ? (
                    <>
                        <span className="weather-widget-tag">
                            {conditionLabel}
                        </span>
                        <div className="weather-widget-now">
                            <span className="weather-widget-temp">
                                {mainTemp(current.temperatureC, unit)}
                            </span>
                            {(current.highC != null || current.lowC != null) && (
                                <span className="weather-widget-range">
                                    {current.highC != null &&
                                        t('detail.common.weatherFlavor.high', {
                                            temp: rangeTemp(current.highC, unit),
                                        })}
                                    {current.highC != null &&
                                        current.lowC != null &&
                                        ' · '}
                                    {current.lowC != null &&
                                        t('detail.common.weatherFlavor.low', {
                                            temp: rangeTemp(current.lowC, unit),
                                        })}
                                </span>
                            )}
                        </div>
                        {text && <p className="weather-widget-text">{text}</p>}
                    </>
                ) : (
                    <>
                        <span className="weather-widget-tag">
                            {t(flavor.labelKey)}
                        </span>
                        <p className="weather-widget-text">{text}</p>
                    </>
                )}
            </div>
            {current && (
                <div
                    className="weather-widget-unit"
                    role="group"
                    aria-label={t('weatherUnit.label')}
                >
                    {(['C', 'F'] as const).map((u) => (
                        <button
                            key={u}
                            type="button"
                            className={classNames('wu-opt', {
                                'is-on': unit === u,
                            })}
                            aria-pressed={unit === u}
                            onClick={() => setUnit(u)}
                        >
                            °{u}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default WeatherWidget;
