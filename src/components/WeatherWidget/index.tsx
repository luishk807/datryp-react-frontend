import type { ReactNode } from 'react';
import './index.scss';
import classNames from 'classnames';
import BeachAccessRoundedIcon from '@mui/icons-material/BeachAccessRounded';
import AcUnitRoundedIcon from '@mui/icons-material/AcUnitRounded';
import GrainRoundedIcon from '@mui/icons-material/GrainRounded';
import FilterDramaRoundedIcon from '@mui/icons-material/FilterDramaRounded';
import CloudRoundedIcon from '@mui/icons-material/CloudRounded';
import WbSunnyRoundedIcon from '@mui/icons-material/WbSunnyRounded';
import type { WeatherLive } from 'types';

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
    label: string;
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

/** Label = capitalized form of the condition value; className = `weather-flavor-<value>`.
 *  Keeping both derived means renaming a `WEATHER_CONDITION` value flows
 *  everywhere (including the user-facing pill and the SCSS hook). */
const flavorFor = (c: WeatherCondition, icon: ReactNode): WeatherFlavor => ({
    icon,
    label: c.charAt(0).toUpperCase() + c.slice(1),
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

const roundTemp = (c: number) => `${Math.round(c)}°`;

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
    const flavor = current
        ? WEATHER_FLAVORS[current.flavor]
        : WEATHER_FLAVORS[detectCondition(text ?? '')];
    return (
        <div className={classNames('weather-widget', flavor.className)}>
            <div className="weather-widget-icon" aria-hidden="true">
                {flavor.icon}
            </div>
            <div className="weather-widget-body">
                {current ? (
                    <>
                        <span className="weather-widget-tag">
                            {current.condition}
                        </span>
                        <div className="weather-widget-now">
                            <span className="weather-widget-temp">
                                {roundTemp(current.temperatureC)}
                            </span>
                            {(current.highC != null || current.lowC != null) && (
                                <span className="weather-widget-range">
                                    {current.highC != null &&
                                        `H ${roundTemp(current.highC)}`}
                                    {current.highC != null &&
                                        current.lowC != null &&
                                        ' · '}
                                    {current.lowC != null &&
                                        `L ${roundTemp(current.lowC)}`}
                                </span>
                            )}
                        </div>
                        {text && <p className="weather-widget-text">{text}</p>}
                    </>
                ) : (
                    <>
                        <span className="weather-widget-tag">{flavor.label}</span>
                        <p className="weather-widget-text">{text}</p>
                    </>
                )}
            </div>
        </div>
    );
};

export default WeatherWidget;
