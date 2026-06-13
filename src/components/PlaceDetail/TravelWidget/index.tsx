import { useEffect, useMemo, useRef } from 'react';
import { Icon, LatLngBoundsExpression, LatLngTuple, Map as LeafletMap } from 'leaflet';
import {
    MapContainer,
    Marker,
    Polyline,
    TileLayer,
    Tooltip,
} from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import FlightTakeoffRoundedIcon from '@mui/icons-material/FlightTakeoffRounded';
import DirectionsCarRoundedIcon from '@mui/icons-material/DirectionsCarRounded';
import DirectionsRailwayRoundedIcon from '@mui/icons-material/DirectionsRailwayRounded';
import DirectionsWalkRoundedIcon from '@mui/icons-material/DirectionsWalkRounded';
import Skeleton from 'components/common/Skeleton';
import { useUserLocation } from 'hooks/useUserLocation';
import { haversineKm } from 'utils/geo';
import type { Coordinates } from 'types';
import 'leaflet/dist/leaflet.css';
import './index.scss';

/** Coarse transport tiers keyed on great-circle distance. Intentionally
 *  rough — the widget is a vibe check, not a routing engine. */
type TravelMode = 'walk' | 'drive' | 'train' | 'flight';

interface TravelEstimate {
    mode: TravelMode;
    hours: number;
    km: number;
}

const estimateTravel = (km: number): TravelEstimate => {
    const rounded = Math.round(km / 10) * 10;
    if (km < 5) {
        return { mode: 'walk', hours: km / 5, km: rounded };
    }
    if (km < 200) {
        return { mode: 'drive', hours: km / 80, km: rounded };
    }
    if (km < 1500) {
        return { mode: 'train', hours: km / 150 + 0.5, km: rounded };
    }
    return { mode: 'flight', hours: km / 800 + 3, km: rounded };
};

const MODE_LABEL_KEY: Record<TravelMode, string> = {
    walk: 'detail.common.travelWidget.onFoot',
    drive: 'detail.common.travelWidget.byCar',
    train: 'detail.common.travelWidget.byTrain',
    flight: 'detail.common.travelWidget.byFlight',
};

const ModeIcon = ({ mode }: { mode: TravelMode }) => {
    switch (mode) {
        case 'walk':
            return <DirectionsWalkRoundedIcon />;
        case 'drive':
            return <DirectionsCarRoundedIcon />;
        case 'train':
            return <DirectionsRailwayRoundedIcon />;
        case 'flight':
        default:
            return <FlightTakeoffRoundedIcon />;
    }
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
    km >= 1000 ? `${(km / 1000).toFixed(1).replace(/\.0$/, '')}k km` : `${km} km`;

/** Leaflet's default marker icons point at relative URLs in the
 *  leaflet npm package, which Vite's bundler doesn't resolve unless
 *  we hand it the icon URLs explicitly. Use the CDN-hosted PNGs so
 *  the markers render without bundler-specific glue. Two icons —
 *  green pin for "you", orange pin for the destination — so the
 *  endpoints read at a glance without a legend. */
const createPinIcon = (color: 'green' | 'orange'): Icon =>
    new Icon({
        // 25x41 default leaflet marker outline, hue-shifted via a
        // hosted variant of the upstream icon. The leaflet-color-
        // markers CDN ships pre-baked color variants of the stock
        // marker so we don't need custom SVG.
        iconUrl: `https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-${color}.png`,
        shadowUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
    });

export interface TravelWidgetProps {
    placeName: string;
    placeCoords: Coordinates;
}

const TravelWidget = ({ placeName, placeCoords }: TravelWidgetProps) => {
    const { t } = useTranslation();
    const { data: user, isLoading, isError } = useUserLocation();

    // Memoize icons so each render doesn't allocate fresh Leaflet
    // Icon instances — react-leaflet diffs by reference identity.
    const destIcon = useMemo(() => createPinIcon('orange'), []);
    const userIcon = useMemo(() => createPinIcon('green'), []);

    // Leaflet measures the container at mount, and if the parent's
    // dimensions weren't fully laid out yet (common with grid layouts
    // and the surrounding AsyncDetailSection), the map renders at a
    // wrong size and gray tile-pane gaps appear. Hold a ref to the
    // map and call `invalidateSize()` after first paint AND on every
    // resize so the canvas always matches its container.
    const mapRef = useRef<LeafletMap | null>(null);
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        // Defer to the next frame so the browser finishes layout
        // before Leaflet re-measures. Without this, invalidateSize
        // sometimes runs before the parent has its final width.
        const handle = window.requestAnimationFrame(() => {
            map.invalidateSize();
        });
        return () => window.cancelAnimationFrame(handle);
    }, [user]);

    if (isLoading) {
        return (
            <div className="travel-widget">
                <div className="travel-widget-map-skeleton" />
                <Skeleton width="80%" height={14} radius={4} />
                <Skeleton width="60%" height={14} radius={4} />
            </div>
        );
    }

    const destPos: LatLngTuple = [placeCoords.lat, placeCoords.lng];
    const userPos: LatLngTuple | null = user
        ? [user.lat, user.lng]
        : null;

    // Bounds covering both endpoints with a small padding factor so
    // neither pin is glued to the map edge. Falls back to a tight
    // zoom on the destination alone when we don't have the user's
    // coords.
    const bounds: LatLngBoundsExpression | null = userPos
        ? [
              [
                  Math.min(userPos[0], destPos[0]),
                  Math.min(userPos[1], destPos[1]),
              ],
              [
                  Math.max(userPos[0], destPos[0]),
                  Math.max(userPos[1], destPos[1]),
              ],
          ]
        : null;

    const km = userPos ? haversineKm(user!, placeCoords) : null;
    const est = km !== null ? estimateTravel(km) : null;
    const fromLabel = user
        ? [user.city, user.country].filter(Boolean).join(', ') ||
          t('detail.common.travelWidget.yourLocation')
        : null;

    return (
        <div className="travel-widget">
            <div className="travel-widget-map">
                <MapContainer
                    // Leaflet needs an explicit initial center / zoom
                    // even when we follow up with fitBounds. Bounds
                    // is applied via the `bounds` prop instead of a
                    // manual `map.fitBounds()` call, which lets
                    // react-leaflet handle the lifecycle for us.
                    {...(bounds
                        ? {
                              bounds,
                              boundsOptions: { padding: [24, 24] },
                          }
                        : {
                              center: destPos,
                              zoom: 9,
                          })}
                    scrollWheelZoom={false}
                    // Inline width/height — Leaflet measures the
                    // container at mount and a CSS-only sizing
                    // sometimes resolves a frame too late, leaving
                    // gray tile gaps. The inline style guarantees the
                    // canvas is correctly sized on first render.
                    style={{ width: '100%', height: '100%' }}
                    attributionControl={false}
                    ref={(instance) => {
                        mapRef.current = instance;
                    }}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />

                    {userPos && (
                        <Marker position={userPos} icon={userIcon}>
                            <Tooltip>
                                {t('detail.common.travelWidget.you', {
                                    name:
                                        fromLabel ??
                                        t(
                                            'detail.common.travelWidget.yourLocation',
                                        ),
                                })}
                            </Tooltip>
                        </Marker>
                    )}

                    <Marker position={destPos} icon={destIcon}>
                        <Tooltip>{placeName}</Tooltip>
                    </Marker>

                    {/* Great-circle straight line between the two
                        endpoints. Not a real road route — the widget
                        is a "how far is it" cue, not a routing
                        engine. Dashed + thick so it reads at a
                        glance over the OSM tile colors. */}
                    {userPos && (
                        <Polyline
                            positions={[userPos, destPos]}
                            pathOptions={{
                                color: '#3cb54b',
                                weight: 4,
                                opacity: 0.85,
                                dashArray: '8 8',
                                lineCap: 'round',
                            }}
                        />
                    )}
                </MapContainer>
            </div>

            {est && (
                <>
                    {fromLabel && (
                        <p className="travel-widget-from">
                            {t('detail.common.travelWidget.from', {
                                name: fromLabel,
                            })}
                        </p>
                    )}
                    <div className="travel-widget-stats">
                        <span
                            className="travel-widget-icon"
                            aria-hidden="true"
                        >
                            <ModeIcon mode={est.mode} />
                        </span>
                        <span className="travel-widget-distance">
                            {formatKm(est.km)}
                        </span>
                        <span className="travel-widget-dot" aria-hidden="true">
                            ·
                        </span>
                        <span className="travel-widget-duration">
                            {formatHours(est.hours)} {t(MODE_LABEL_KEY[est.mode])}
                        </span>
                    </div>
                    <p className="travel-widget-disclaimer">
                        {t('detail.common.travelWidget.disclaimer')}
                    </p>
                </>
            )}

            {!est && (
                <p className="travel-widget-fallback">
                    {isError
                        ? t('detail.common.travelWidget.noLocation')
                        : t('detail.common.travelWidget.dragMap')}
                </p>
            )}
        </div>
    );
};

export default TravelWidget;
