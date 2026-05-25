/**
 * Pro feature — a full-bleed Mapbox world map showing every country the
 * user has visited (shaded green) and every visited place (pin). Cities
 * don't carry lat/lng yet, so they're aggregated into their country's
 * shading; once city coords land in the backend they can join the pin
 * layer here without touching the page.
 *
 * Free users see a blurred preview with the PaywallModal overlay so
 * they can taste the feature before paying. The map still renders
 * underneath the blur — the blur is purely visual.
 *
 * Mapbox token comes from `VITE_MAPBOX_TOKEN`. If unset, the page shows
 * a setup hint instead of breaking — useful in dev.
 */
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import Layout from 'components/common/Layout/SubLayout';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import PaywallModal from 'components/PaywallModal';
import type { ModalButtonHandle } from 'components/ModalButton';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import LocationCityRoundedIcon from '@mui/icons-material/LocationCityRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import { useUser } from 'context/UserContext';
import { useVisitedCountries } from 'api/hooks/useVisitedCountries';
import { useVisitedPlaces } from 'api/hooks/useVisitedPlaces';
import { useVisitedCities } from 'api/hooks/useVisitedCities';
import MyMapStatDropdown, {
    type MyMapStatDropdownOption,
} from './MyMapStatDropdown';
import './index.scss';

type StatDropdownKey = 'countries' | 'cities' | 'places';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? '';

/** Mapbox style URL — light minimal so the green country shading
 *  reads as the dominant signal. Streets / outdoors would compete. */
const MAP_STYLE = 'mapbox://styles/mapbox/light-v11';

/** Mapbox-vendored country boundaries tileset. Polygons keyed by ISO
 *  alpha-2 + alpha-3. Free + part of every Mapbox account, no extra
 *  setup. */
const COUNTRY_BOUNDARIES_SOURCE = 'mapbox-country-boundaries';
const COUNTRY_BOUNDARIES_URL = 'mapbox://mapbox.country-boundaries-v1';

const MyMap = () => {
    const navigate = useNavigate();
    const { user, isAdmin } = useUser();
    // Admins bypass the paywall — same pattern as Bucket List + the
    // Pro AI features. The user role is server-authoritative, so this
    // can't be spoofed from the client.
    const isPro = Boolean(user && (user.isPaidMember || isAdmin));

    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const markersRef = useRef<mapboxgl.Marker[]>([]);
    // Keyed by visited-place id so a dropdown selection can target the
    // exact marker to open its popup. Lives alongside `markersRef`
    // (which keeps a plain list for cleanup) — the two are written and
    // cleared in lock-step in the marker-sync effect.
    const markersByPlaceIdRef = useRef<Map<string, mapboxgl.Marker>>(
        new Map()
    );

    const [mapHidden, setMapHidden] = useState(false);
    const [mapReady, setMapReady] = useState(false);
    const [openDropdown, setOpenDropdown] = useState<StatDropdownKey | null>(
        null
    );

    const paywallRef = useRef<ModalButtonHandle>(null);

    const { data: countriesData } = useVisitedCountries();
    const { data: citiesData } = useVisitedCities();
    const { data: placesData } = useVisitedPlaces();

    const visitedCountries = countriesData?.items ?? [];
    const visitedCities = citiesData?.items ?? [];
    const visitedPlaces = placesData?.items ?? [];

    // Country shading is the UNION of:
    //   1. countries the user explicitly marked as visited
    //   2. countries implied by a visited city
    //   3. countries implied by a visited place
    // A visited place/city must imply the country was visited too, so we
    // dedupe codes across all three sources to drive the fill filter.
    const countryCodes = useMemo<string[]>(() => {
        const seen = new Set<string>();
        const push = (raw: string | null | undefined) => {
            if (!raw) return;
            seen.add(raw.toUpperCase());
        };
        for (const c of visitedCountries) push(c.countryCode);
        for (const c of visitedCities) push(c.countryCode);
        for (const p of visitedPlaces) push(p.countryCode);
        return Array.from(seen);
    }, [visitedCountries, visitedCities, visitedPlaces]);

    const placePins = useMemo(
        () =>
            visitedPlaces
                .filter(
                    (p) =>
                        typeof p.latitude === 'number' &&
                        typeof p.longitude === 'number'
                )
                .map((p) => ({
                    id: p.id,
                    name: p.placeName,
                    city: p.placeCity ?? '',
                    country: p.placeCountry ?? '',
                    lat: p.latitude as number,
                    lng: p.longitude as number,
                    source: p.source,
                    visitedAt: p.visitedAt,
                })),
        [visitedPlaces]
    );

    // Initialize the Mapbox map. Runs once — subsequent data changes
    // are handled by separate effects that mutate the existing map.
    useEffect(() => {
        if (!MAPBOX_TOKEN) return;
        const container = mapContainerRef.current;
        if (!container) return;
        if (mapRef.current) return;

        mapboxgl.accessToken = MAPBOX_TOKEN;
        const map = new mapboxgl.Map({
            container,
            style: MAP_STYLE,
            center: [0, 20],
            zoom: 1.4,
            projection: 'globe',
            attributionControl: true,
        });
        map.addControl(
            new mapboxgl.NavigationControl({ visualizePitch: true }),
            'top-right'
        );

        // Container size can grow AFTER init when the surrounding
        // flex layout settles (e.g. hero-image-less /my-map page
        // expanding to fill remaining viewport). Mapbox locks the
        // canvas dimensions at construction time, so a post-init
        // resize leaves the canvas smaller than its wrap and the
        // background bleeds through. ResizeObserver fires `resize()`
        // whenever the container's box changes — handles tab swaps,
        // Hide-map toggles, and orientation changes alike.
        const observer = new ResizeObserver(() => {
            // Guard against the map being mid-removal.
            if (mapRef.current) mapRef.current.resize();
        });
        observer.observe(container);

        map.on('load', () => {
            // Country boundaries source — Mapbox-hosted vector tiles
            // with the ISO 3166-1 alpha-2/-3 codes as feature
            // properties. We filter the fill layer by alpha-2 so only
            // visited countries are shaded.
            if (!map.getSource(COUNTRY_BOUNDARIES_SOURCE)) {
                map.addSource(COUNTRY_BOUNDARIES_SOURCE, {
                    type: 'vector',
                    url: COUNTRY_BOUNDARIES_URL,
                });
            }
            if (!map.getLayer('visited-country-fill')) {
                map.addLayer(
                    {
                        id: 'visited-country-fill',
                        source: COUNTRY_BOUNDARIES_SOURCE,
                        'source-layer': 'country_boundaries',
                        type: 'fill',
                        paint: {
                            'fill-color': '#3cb54b',
                            'fill-opacity': 0.45,
                        },
                        // Start with an impossible filter so nothing
                        // shows until the visited list resolves.
                        filter: ['in', 'iso_3166_1', ''],
                    },
                    // Insert below the country labels layer so the
                    // country name still reads on top of the shading.
                    'country-label'
                );
            }
            if (!map.getLayer('visited-country-line')) {
                map.addLayer(
                    {
                        id: 'visited-country-line',
                        source: COUNTRY_BOUNDARIES_SOURCE,
                        'source-layer': 'country_boundaries',
                        type: 'line',
                        paint: {
                            'line-color': '#2d8f37',
                            'line-width': 1.5,
                        },
                        filter: ['in', 'iso_3166_1', ''],
                    },
                    'country-label'
                );
            }
            setMapReady(true);
            // Trigger a resize once layout has settled (style + sources
            // applied), in case the container grew between construction
            // and load. ResizeObserver also fires it, but this is the
            // belt for the suspenders.
            map.resize();
        });

        mapRef.current = map;

        return () => {
            observer.disconnect();
            map.remove();
            mapRef.current = null;
            setMapReady(false);
        };
    }, []);

    // Push the visited country filter into the existing layers any
    // time the list changes (after the map has loaded).
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !mapReady) return;
        const filter =
            countryCodes.length === 0
                ? ['in', 'iso_3166_1', '']
                : ['in', 'iso_3166_1', ...countryCodes];
        if (map.getLayer('visited-country-fill')) {
            map.setFilter('visited-country-fill', filter as any);
        }
        if (map.getLayer('visited-country-line')) {
            map.setFilter('visited-country-line', filter as any);
        }
    }, [countryCodes, mapReady]);

    // Sync place markers — clear, then add one per place with lat/lng.
    // The popup carries enough context to recognize the place (name +
    // city) and a primary CTA that opens the full place-detail page in
    // a new tab. Visited-places don't carry a tripId, so we can't link
    // back to a specific trip — the place page is the closest anchor.
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !mapReady) return;
        for (const m of markersRef.current) m.remove();
        markersRef.current = [];
        markersByPlaceIdRef.current.clear();
        for (const pin of placePins) {
            const el = document.createElement('div');
            el.className = 'my-map-pin';
            const popup = new mapboxgl.Popup({
                offset: 18,
                closeButton: true,
                maxWidth: '260px',
                className: 'my-map-pin-popup',
            }).setHTML(renderPinPopupHtml(pin));
            const marker = new mapboxgl.Marker({
                element: el,
                anchor: 'bottom',
            })
                .setLngLat([pin.lng, pin.lat])
                .setPopup(popup)
                .addTo(map);
            markersRef.current.push(marker);
            markersByPlaceIdRef.current.set(pin.id, marker);
        }
    }, [placePins, mapReady]);

    const handleToggleMap = () => setMapHidden((h) => !h);

    const handleOpenPaywall = () => paywallRef.current?.openModel();

    // Build dropdown options. Each is keyed by a stable id (code / slug
    // / place-id) so the onSelect handler can look up coords or markers
    // without re-deriving from the option label.
    const countryOptions = useMemo<MyMapStatDropdownOption[]>(() => {
        const byCode = new Map<
            string,
            { name: string; code: string }
        >();
        for (const c of visitedCountries) {
            const code = c.countryCode?.toUpperCase();
            if (!code) continue;
            byCode.set(code, { name: c.countryName, code });
        }
        // Surface countries the user has only marked implicitly via
        // city/place so the dropdown matches the country-shading union.
        for (const c of visitedCities) {
            const code = c.countryCode?.toUpperCase();
            if (!code || byCode.has(code)) continue;
            byCode.set(code, { name: c.countryName, code });
        }
        for (const p of visitedPlaces) {
            const code = p.countryCode?.toUpperCase();
            if (!code || byCode.has(code)) continue;
            byCode.set(code, {
                name: p.placeCountry || code,
                code,
            });
        }
        return Array.from(byCode.values())
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((c) => ({
                id: c.code,
                label: c.name,
                sublabel: c.code,
            }));
    }, [visitedCountries, visitedCities, visitedPlaces]);

    const cityOptions = useMemo<MyMapStatDropdownOption[]>(() => {
        return visitedCities
            .slice()
            .sort((a, b) => a.cityName.localeCompare(b.cityName))
            .map((c) => {
                const hasCoords = visitedPlaces.some(
                    (p) =>
                        typeof p.latitude === 'number' &&
                        typeof p.longitude === 'number' &&
                        (p.placeCity ?? '').toLowerCase() ===
                            c.cityName.toLowerCase() &&
                        (p.countryCode ?? '').toUpperCase() ===
                            c.countryCode.toUpperCase()
                );
                return {
                    id: c.citySlug,
                    label: c.cityName,
                    sublabel: `${c.countryName} (${c.countryCode})`,
                    disabled: !hasCoords,
                    disabledReason: hasCoords
                        ? undefined
                        : 'No place coordinates yet for this city',
                };
            });
    }, [visitedCities, visitedPlaces]);

    const placeOptions = useMemo<MyMapStatDropdownOption[]>(() => {
        return visitedPlaces
            .slice()
            .sort((a, b) => a.placeName.localeCompare(b.placeName))
            .map((p) => {
                const hasCoords =
                    typeof p.latitude === 'number' &&
                    typeof p.longitude === 'number';
                return {
                    id: p.id,
                    label: p.placeName,
                    sublabel: [p.placeCity, p.placeCountry]
                        .filter(Boolean)
                        .join(', '),
                    disabled: !hasCoords,
                    disabledReason: hasCoords
                        ? undefined
                        : 'No coordinates for this place yet',
                };
            });
    }, [visitedPlaces]);

    // Compute a bounding box from the country-boundaries source. Mapbox
    // returns the feature(s) only after the relevant tiles have loaded;
    // we expand the same `LngLatBounds` across every feature so multi-
    // polygon countries (Russia, US, etc.) get a tight overall fit.
    const flyToCountry = useCallback(
        (code: string) => {
            const map = mapRef.current;
            if (!map) return;
            const features = map.querySourceFeatures(
                COUNTRY_BOUNDARIES_SOURCE,
                {
                    sourceLayer: 'country_boundaries',
                    filter: ['==', 'iso_3166_1', code],
                }
            );
            if (features.length > 0) {
                const bounds = new mapboxgl.LngLatBounds();
                for (const f of features) {
                    const geom = f.geometry as
                        | { type: string; coordinates: unknown }
                        | undefined;
                    if (!geom) continue;
                    extendBoundsFromGeometry(bounds, geom);
                }
                if (
                    bounds.getNorthEast() &&
                    bounds.getSouthWest()
                ) {
                    map.fitBounds(bounds, {
                        padding: 60,
                        maxZoom: 6,
                        duration: 1200,
                    });
                    return;
                }
            }
            // Fallback — average lat/lng of any visited places in this
            // country. Better than nothing when source tiles haven't
            // resolved yet (rare after first interaction).
            const places = visitedPlaces.filter(
                (p) =>
                    (p.countryCode ?? '').toUpperCase() === code &&
                    typeof p.latitude === 'number' &&
                    typeof p.longitude === 'number'
            );
            if (places.length > 0) {
                const lat =
                    places.reduce((s, p) => s + (p.latitude as number), 0) /
                    places.length;
                const lng =
                    places.reduce((s, p) => s + (p.longitude as number), 0) /
                    places.length;
                map.flyTo({ center: [lng, lat], zoom: 4, duration: 1200 });
            }
        },
        [visitedPlaces]
    );

    const flyToCity = useCallback(
        (citySlug: string) => {
            const map = mapRef.current;
            if (!map) return;
            const city = visitedCities.find((c) => c.citySlug === citySlug);
            if (!city) return;
            const places = visitedPlaces.filter(
                (p) =>
                    typeof p.latitude === 'number' &&
                    typeof p.longitude === 'number' &&
                    (p.placeCity ?? '').toLowerCase() ===
                        city.cityName.toLowerCase() &&
                    (p.countryCode ?? '').toUpperCase() ===
                        city.countryCode.toUpperCase()
            );
            if (places.length === 0) return;
            const lat =
                places.reduce((s, p) => s + (p.latitude as number), 0) /
                places.length;
            const lng =
                places.reduce((s, p) => s + (p.longitude as number), 0) /
                places.length;
            map.flyTo({ center: [lng, lat], zoom: 10, duration: 1200 });
        },
        [visitedCities, visitedPlaces]
    );

    const flyToPlace = useCallback(
        (placeId: string) => {
            const map = mapRef.current;
            if (!map) return;
            const place = visitedPlaces.find((p) => p.id === placeId);
            if (
                !place ||
                typeof place.latitude !== 'number' ||
                typeof place.longitude !== 'number'
            ) {
                return;
            }
            map.flyTo({
                center: [place.longitude, place.latitude],
                zoom: 13,
                duration: 1200,
            });
            // Open the matching marker's popup once the camera has
            // settled — opening immediately makes the popup feel
            // disconnected from the fly motion.
            const marker = markersByPlaceIdRef.current.get(placeId);
            if (marker) {
                window.setTimeout(() => {
                    if (!marker.getPopup()?.isOpen()) {
                        marker.togglePopup();
                    }
                }, 900);
            }
        },
        [visitedPlaces]
    );

    const handleSelectFromDropdown = (
        key: StatDropdownKey,
        id: string
    ) => {
        if (key === 'countries') flyToCountry(id);
        else if (key === 'cities') flyToCity(id);
        else flyToPlace(id);
        setOpenDropdown(null);
    };

    if (!MAPBOX_TOKEN) {
        return (
            <Layout title="Mapper">
                <div className="my-map-setup-missing">
                    <h2>Map setup needed</h2>
                    <p>
                        Set <code>VITE_MAPBOX_TOKEN</code> in your
                        environment to enable the map. Grab a free token
                        at{' '}
                        <a
                            href="https://account.mapbox.com/access-tokens/"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            mapbox.com/access-tokens
                        </a>
                        .
                    </p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Mapper" fullBleed>
            <div className="my-map-page">
                <header className="my-map-header">
                    <div className="my-map-stats">
                        <MyMapStatDropdown
                            icon={<PublicRoundedIcon fontSize="small" />}
                            count={countryOptions.length}
                            label="countries"
                            options={countryOptions}
                            isOpen={openDropdown === 'countries'}
                            onToggle={() =>
                                setOpenDropdown((cur) =>
                                    cur === 'countries' ? null : 'countries'
                                )
                            }
                            onClose={() => setOpenDropdown(null)}
                            onSelect={(id) =>
                                handleSelectFromDropdown('countries', id)
                            }
                            emptyHint="No visited countries yet."
                        />
                        <MyMapStatDropdown
                            icon={
                                <LocationCityRoundedIcon fontSize="small" />
                            }
                            count={cityOptions.length}
                            label="cities"
                            options={cityOptions}
                            isOpen={openDropdown === 'cities'}
                            onToggle={() =>
                                setOpenDropdown((cur) =>
                                    cur === 'cities' ? null : 'cities'
                                )
                            }
                            onClose={() => setOpenDropdown(null)}
                            onSelect={(id) =>
                                handleSelectFromDropdown('cities', id)
                            }
                            emptyHint="No visited cities yet."
                        />
                        <MyMapStatDropdown
                            icon={<PlaceRoundedIcon fontSize="small" />}
                            count={placeOptions.length}
                            label="places"
                            options={placeOptions}
                            isOpen={openDropdown === 'places'}
                            onToggle={() =>
                                setOpenDropdown((cur) =>
                                    cur === 'places' ? null : 'places'
                                )
                            }
                            onClose={() => setOpenDropdown(null)}
                            onSelect={(id) =>
                                handleSelectFromDropdown('places', id)
                            }
                            emptyHint="No visited places yet."
                        />
                    </div>
                    <div className="my-map-controls">
                        <button
                            type="button"
                            className="my-map-toggle-btn"
                            onClick={handleToggleMap}
                            aria-pressed={mapHidden}
                        >
                            {mapHidden ? (
                                <VisibilityRoundedIcon fontSize="small" />
                            ) : (
                                <VisibilityOffRoundedIcon fontSize="small" />
                            )}
                            <span>{mapHidden ? 'Show map' : 'Hide map'}</span>
                        </button>
                    </div>
                </header>

                {!mapHidden && (
                    <div
                        className={
                            isPro
                                ? 'my-map-canvas-wrap'
                                : 'my-map-canvas-wrap is-locked'
                        }
                    >
                        <div
                            ref={mapContainerRef}
                            className="my-map-canvas"
                            aria-label="World map of places you have visited"
                        />
                        {!isPro && (
                            <div className="my-map-paywall-overlay">
                                <LockRoundedIcon
                                    className="my-map-paywall-icon"
                                />
                                <h3 className="my-map-paywall-title">
                                    Mapper is a Pro feature
                                </h3>
                                <p className="my-map-paywall-body">
                                    Visualize every country and place
                                    you&rsquo;ve visited, with shaded
                                    regions and pinpoints. Upgrade to
                                    unlock the full map.
                                </p>
                                <div className="my-map-paywall-actions">
                                    <ButtonCustom
                                        type="standard"
                                        capitalizeType="none"
                                        onClick={handleOpenPaywall}
                                        label="Upgrade to Pro"
                                    />
                                    <ButtonCustom
                                        type="line"
                                        capitalizeType="none"
                                        onClick={() => navigate('/visited')}
                                        label="See visited list"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {mapHidden && (
                    <div className="my-map-list-view">
                        <h2 className="my-map-list-title">
                            Visited countries
                        </h2>
                        {visitedCountries.length === 0 ? (
                            <p className="my-map-list-empty">
                                No countries marked yet. Mark a country
                                visited from any country page to see it
                                here.
                            </p>
                        ) : (
                            <ul className="my-map-list">
                                {visitedCountries.map((c) => (
                                    <li
                                        className="my-map-list-row"
                                        key={c.id}
                                    >
                                        <span className="my-map-list-flag">
                                            {flagEmojiFromCode(
                                                c.countryCode
                                            )}
                                        </span>
                                        <span className="my-map-list-name">
                                            {c.countryName}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>

            <PaywallModal
                ref={paywallRef}
                currentCount={visitedCountries.length}
                cap={0}
                title="Unlock Mapper"
                headline={
                    <>
                        Take your travel history out of a list and onto
                        a beautiful world map.
                    </>
                }
                body="Mapper shades every country you've visited and pins every place — a living record of your travels. Available on every Pro plan."
            />
        </Layout>
    );
};

/** Walk a GeoJSON Polygon / MultiPolygon geometry and extend the given
 *  `LngLatBounds` to include every coordinate. Used to fit-bounds a
 *  country whose polygons come from the Mapbox boundaries source —
 *  multi-polygon countries (Russia, US, Indonesia) need every ring
 *  included for the fit to look right. */
const extendBoundsFromGeometry = (
    bounds: mapboxgl.LngLatBounds,
    geom: { type: string; coordinates: unknown }
): void => {
    const walk = (coords: unknown): void => {
        if (!Array.isArray(coords)) return;
        if (
            coords.length >= 2 &&
            typeof coords[0] === 'number' &&
            typeof coords[1] === 'number'
        ) {
            bounds.extend([coords[0] as number, coords[1] as number]);
            return;
        }
        for (const c of coords) walk(c);
    };
    walk(geom.coordinates);
};

/** Convert ISO-2 country code to the regional-indicator flag emoji
 *  ("US" → 🇺🇸). Falls back to an empty string for malformed codes. */
const flagEmojiFromCode = (code: string | null | undefined): string => {
    if (!code || code.length !== 2) return '';
    const base = 0x1f1e6;
    const A = 'A'.charCodeAt(0);
    const up = code.toUpperCase();
    const c1 = up.charCodeAt(0) - A + base;
    const c2 = up.charCodeAt(1) - A + base;
    return String.fromCodePoint(c1, c2);
};

const escapeHtml = (s: string): string =>
    s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

/** Friendly "Visited Jun 14, 2024" line; returns '' for missing/invalid
 *  timestamps so the popup just skips the row instead of rendering
 *  "Invalid Date". */
const formatVisitedAt = (iso: string | null | undefined): string => {
    if (!iso) return '';
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return '';
    return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

interface PinPopupInput {
    name: string;
    city: string;
    country: string;
    source?: string;
    visitedAt?: string | null;
}

/** Render the Mapbox popup body for a visited place. All values
 *  flow through `escapeHtml` since Mapbox injects this as innerHTML.
 *  The "View details" link is plain HTML — `target="_blank"` opens it
 *  in a new tab so the user keeps the map context. */
const renderPinPopupHtml = (pin: PinPopupInput): string => {
    const detailHref = `/place?q=${encodeURIComponent(pin.name)}&i=0`;
    const locationLine = [pin.city, pin.country]
        .filter(Boolean)
        .map(escapeHtml)
        .join(', ');
    const visited = formatVisitedAt(pin.visitedAt);
    const sourceLabel =
        pin.source === 'itinerary'
            ? 'From a trip'
            : pin.source === 'manual'
              ? 'Marked visited'
              : '';
    return `
        <div class="my-map-pin-popup-inner">
            <div class="my-map-pin-popup-title">${escapeHtml(pin.name)}</div>
            ${
                locationLine
                    ? `<div class="my-map-pin-popup-loc">${locationLine}</div>`
                    : ''
            }
            ${
                visited || sourceLabel
                    ? `<div class="my-map-pin-popup-meta">${
                          sourceLabel
                              ? `<span class="my-map-pin-popup-chip">${escapeHtml(
                                    sourceLabel
                                )}</span>`
                              : ''
                      }${
                          visited
                              ? `<span class="my-map-pin-popup-date">Visited ${escapeHtml(
                                    visited
                                )}</span>`
                              : ''
                      }</div>`
                    : ''
            }
            <a
                class="my-map-pin-popup-cta"
                href="${detailHref}"
                target="_blank"
                rel="noopener noreferrer"
            >View details</a>
        </div>
    `;
};

export default MyMap;
