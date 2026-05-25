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
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import { useUser } from 'context/UserContext';
import { useVisitedCountries } from 'api/hooks/useVisitedCountries';
import { useVisitedPlaces } from 'api/hooks/useVisitedPlaces';
import { useVisitedCities } from 'api/hooks/useVisitedCities';
import './index.scss';

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

    const [mapHidden, setMapHidden] = useState(false);
    const [mapReady, setMapReady] = useState(false);

    const paywallRef = useRef<ModalButtonHandle>(null);

    const { data: countriesData } = useVisitedCountries();
    const { data: citiesData } = useVisitedCities();
    const { data: placesData } = useVisitedPlaces();

    const visitedCountries = countriesData?.items ?? [];
    const visitedCities = citiesData?.items ?? [];
    const visitedPlaces = placesData?.items ?? [];

    const countryCodes = useMemo<string[]>(
        () =>
            visitedCountries
                .map((c) => c.countryCode?.toUpperCase())
                .filter((c): c is string => Boolean(c)),
        [visitedCountries]
    );

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
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !mapReady) return;
        for (const m of markersRef.current) m.remove();
        markersRef.current = [];
        for (const pin of placePins) {
            const el = document.createElement('div');
            el.className = 'my-map-pin';
            const popup = new mapboxgl.Popup({
                offset: 16,
                closeButton: false,
            }).setHTML(
                `<strong>${escapeHtml(pin.name)}</strong>${
                    pin.city
                        ? `<br/><span class="my-map-pin-meta">${escapeHtml(
                              pin.city
                          )}${
                              pin.country
                                  ? `, ${escapeHtml(pin.country)}`
                                  : ''
                          }</span>`
                        : ''
                }`
            );
            const marker = new mapboxgl.Marker(el)
                .setLngLat([pin.lng, pin.lat])
                .setPopup(popup)
                .addTo(map);
            markersRef.current.push(marker);
        }
    }, [placePins, mapReady]);

    const handleToggleMap = () => setMapHidden((h) => !h);

    const handleOpenPaywall = () => paywallRef.current?.openModel();

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
                        <span className="my-map-stat">
                            <PublicRoundedIcon
                                fontSize="small"
                                className="my-map-stat-icon"
                            />
                            <span>
                                <strong>{visitedCountries.length}</strong>{' '}
                                countries
                            </span>
                        </span>
                        <span className="my-map-stat">
                            <PlaceRoundedIcon
                                fontSize="small"
                                className="my-map-stat-icon"
                            />
                            <span>
                                <strong>{visitedCities.length}</strong> cities
                            </span>
                        </span>
                        <span className="my-map-stat">
                            <PlaceRoundedIcon
                                fontSize="small"
                                className="my-map-stat-icon"
                            />
                            <span>
                                <strong>{visitedPlaces.length}</strong> places
                            </span>
                        </span>
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

export default MyMap;
