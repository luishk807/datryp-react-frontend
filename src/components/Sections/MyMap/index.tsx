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
import { Link, useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import Layout from 'components/common/Layout/SubLayout';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import PaywallModal from 'components/PaywallModal';
import type { ModalButtonHandle } from 'components/ModalButton';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import LocationCityRoundedIcon from '@mui/icons-material/LocationCityRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useUser } from 'context/UserContext';
import { useVisitedCountries } from 'api/hooks/useVisitedCountries';
import { useVisitedPlaces } from 'api/hooks/useVisitedPlaces';
import { useVisitedCities } from 'api/hooks/useVisitedCities';
import { useMyItineraries } from 'api/hooks/useItineraries';
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

/** Native circle-layer sources + layers for visited place / city pins.
 *  Replaces the previous HTML `mapboxgl.Marker` approach, which
 *  suffered from DOM↔WebGL desync during rotation (the marker's
 *  `transform: translate(...)` rewrites lagged the basemap by a
 *  frame, reading as the pin drifting off its lat/lng). Circle
 *  layers render inside WebGL so the pin is glued to the geography
 *  on every frame. */
const PLACE_PINS_SOURCE = 'visited-place-pins';
const PLACE_PINS_LAYER = 'visited-place-pins-layer';
const CITY_PINS_SOURCE = 'visited-city-pins';
const CITY_PINS_LAYER = 'visited-city-pins-layer';

const MyMap = () => {
    const navigate = useNavigate();
    const { user, isAdmin } = useUser();
    // Admins bypass the paywall — same pattern as Bucket List + the
    // Pro AI features. The user role is server-authoritative, so this
    // can't be spoofed from the client.
    const isPro = Boolean(user && (user.isPaidMember || isAdmin));

    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    // The currently-open popup. Tracked so a fresh click / programmatic
    // open can close the prior one without orphaning DOM. Replaces the
    // previous mapboxgl.Marker[] approach where each marker owned its
    // own popup; with native circle layers there's only one popup at
    // a time.
    const openPopupRef = useRef<mapboxgl.Popup | null>(null);
    // One-shot guard for the initial "fit to my world" camera fly.
    // Once the user has seen their continents framed up, subsequent
    // data refetches (new visited place lands in cache, etc.) must not
    // yank the camera back — they may have already panned somewhere
    // else.
    const didAutoFitRef = useRef(false);
    // Tracks the currently-hovered country feature id so the hover
    // feature-state can be unset when the cursor moves to a new
    // country or off the layer entirely.
    const hoveredCountryRef = useRef<number | string | null>(null);
    // Currently-hovered pin feature id (place or city). Same role as
    // hoveredCountryRef — toggles the `hover` feature-state that the
    // circle layer's `circle-radius` expression reads to grow the pin
    // on hover.
    const hoveredPinRef = useRef<{
        source: string;
        id: string | null;
    } | null>(null);

    const [mapReady, setMapReady] = useState(false);
    const [openDropdown, setOpenDropdown] = useState<StatDropdownKey | null>(
        null
    );
    // Active map selection — populates the left-side trips panel.
    // Set when the user clicks a country shading, a city pin, or a
    // place pin (and when those targets are chosen from the
    // dropdowns above). null collapses the panel. Country uses
    // ISO-2 code, city uses citySlug, place uses the place id.
    type SelectionKind = 'country' | 'city' | 'place';
    interface MapSelection {
        kind: SelectionKind;
        id: string;
        label: string;
        /** Sub-line under the title — e.g. "ISO PA · Country" or
         *  "Quepos, Costa Rica" for a city. */
        sublabel?: string;
    }
    const [selection, setSelection] = useState<MapSelection | null>(null);
    const handleClearSelection = useCallback(() => setSelection(null), []);
    // Intro panel open/closed. First visit shows it (educational
    // moment); subsequent visits start collapsed so the map gets the
    // full canvas. The little floating "i" pill on the map always
    // lets the user re-open it. Persisted in localStorage so the
    // dismiss survives reloads.
    const INTRO_STORAGE_KEY = 'my-map-intro-dismissed';
    const [introOpen, setIntroOpen] = useState<boolean>(() => {
        if (typeof window === 'undefined') return true;
        try {
            return window.localStorage.getItem(INTRO_STORAGE_KEY) !== '1';
        } catch {
            return true;
        }
    });
    const handleCloseIntro = useCallback(() => {
        setIntroOpen(false);
        try {
            window.localStorage.setItem(INTRO_STORAGE_KEY, '1');
        } catch {
            /* localStorage unavailable (private mode / quota) —
             * fall back to in-memory dismiss only. */
        }
    }, []);
    const handleOpenIntro = useCallback(() => {
        setIntroOpen(true);
    }, []);

    const paywallRef = useRef<ModalButtonHandle>(null);

    const { data: countriesData } = useVisitedCountries();
    const { data: citiesData } = useVisitedCities();
    const { data: placesData } = useVisitedPlaces();
    // Live trips list — drives the stale-trip filter below.
    // visited_place_trips join rows aren't cascade-deleted when a
    // trip is removed today, so the visitedPlaces[].trips array
    // can carry tripIds that no longer exist. Cross-referencing
    // against the live trips list strips those out so deleted
    // trips don't ghost-appear on Mapper pin popups or pump up
    // the trip-count dot.
    const { data: myTrips } = useMyItineraries();
    const liveTripIds = useMemo<Set<string>>(() => {
        const ids = new Set<string>();
        for (const t of myTrips ?? []) {
            if (t.id) ids.add(t.id);
        }
        return ids;
    }, [myTrips]);

    const visitedCountries = countriesData?.items ?? [];
    const visitedCities = citiesData?.items ?? [];
    const rawVisitedPlaces = placesData?.items ?? [];
    // Filter each visited place's `trips` array to only include
    // trips that still exist on the server. Deleted itineraries
    // leave their visited_place_trips join rows behind today, so
    // without this every page (popup, dropdown dot, trips panel,
    // trip-count aggregator) would surface ghosted trip names.
    // Skip the filter while the trips list is still loading
    // (myTrips === undefined) so we don't briefly strip every
    // trip from every place pin on first paint.
    const visitedPlaces = useMemo(() => {
        if (!myTrips) return rawVisitedPlaces;
        return rawVisitedPlaces.map((p) => ({
            ...p,
            trips: (p.trips ?? []).filter((t) => liveTripIds.has(t.tripId)),
        }));
    }, [rawVisitedPlaces, myTrips, liveTripIds]);

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
                    // Trip list comes from the new join table — pass
                    // through as-is so the popup can render 0 / 1 / 2+
                    // trip behavior without re-walking the original
                    // visited-place row.
                    trips: p.trips,
                })),
        [visitedPlaces]
    );

    // City-level pins. A city pin sits at the city centroid (geocoded
    // by the backend at mark-visited time) and is visually distinct
    // from a place pin — green ring instead of an orange dot — so the
    // user can tell "I've been to this city" (broader) from "I've
    // been to this specific spot" (narrower). Pre-geocoder rows
    // without lat/lng are filtered out; the dropdown still lists
    // them so the user can see them in the cities count.
    const cityPins = useMemo(
        () =>
            visitedCities
                .filter(
                    (c) =>
                        typeof c.latitude === 'number' &&
                        typeof c.longitude === 'number'
                )
                .map((c) => ({
                    id: c.id,
                    citySlug: c.citySlug,
                    cityName: c.cityName,
                    countryName: c.countryName,
                    countryCode: c.countryCode,
                    lat: c.latitude as number,
                    lng: c.longitude as number,
                    source: c.source,
                    visitedAt: c.visitedAt,
                })),
        [visitedCities]
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
                            // Brighten on hover via feature-state.
                            // mapbox.country-boundaries-v1 provides a
                            // unique numeric feature.id per polygon, so
                            // feature-state lookups work without us
                            // promoting an id property.
                            'fill-opacity': [
                                'case',
                                ['boolean', ['feature-state', 'hover'], false],
                                0.65,
                                0.45,
                            ],
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
            // Native pin sources / layers. GeoJSON sources start
            // empty; the data sync effects below repopulate them as
            // the visited lists resolve. `promoteId: 'id'` makes
            // feature-state lookups + queryRenderedFeatures keying
            // by our own place / city id work without an extra map.
            if (!map.getSource(CITY_PINS_SOURCE)) {
                map.addSource(CITY_PINS_SOURCE, {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: [] },
                    promoteId: 'id',
                });
            }
            if (!map.getLayer(CITY_PINS_LAYER)) {
                map.addLayer({
                    id: CITY_PINS_LAYER,
                    source: CITY_PINS_SOURCE,
                    type: 'circle',
                    paint: {
                        'circle-radius': [
                            'case',
                            ['boolean', ['feature-state', 'hover'], false],
                            10,
                            8,
                        ],
                        'circle-color': '#ffffff',
                        'circle-stroke-color': '#3cb54b',
                        'circle-stroke-width': 2.5,
                        // Hard surface — soft fade-in around the
                        // dot would blur it against light tiles.
                        'circle-opacity': 1,
                    },
                });
            }
            if (!map.getSource(PLACE_PINS_SOURCE)) {
                map.addSource(PLACE_PINS_SOURCE, {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: [] },
                    promoteId: 'id',
                });
            }
            if (!map.getLayer(PLACE_PINS_LAYER)) {
                map.addLayer({
                    id: PLACE_PINS_LAYER,
                    source: PLACE_PINS_SOURCE,
                    type: 'circle',
                    paint: {
                        'circle-radius': [
                            'case',
                            ['boolean', ['feature-state', 'hover'], false],
                            9,
                            7,
                        ],
                        'circle-color': '#f6891f',
                        'circle-stroke-color': '#ffffff',
                        'circle-stroke-width': 2.5,
                        'circle-opacity': 1,
                    },
                });
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

    // Sync place pins into the GeoJSON source backing the circle
    // layer. Replaces the old `mapboxgl.Marker` loop — features are
    // rendered inside WebGL, so the dot stays glued to its lat/lng
    // on every frame regardless of how fast the user rotates. The
    // popup is opened imperatively in the layer's click handler
    // below; we stash the input shape needed for the popup HTML on
    // `feature.properties` so the click handler can rebuild it
    // without re-walking the visitedPlaces array.
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !mapReady) return;
        const source = map.getSource(PLACE_PINS_SOURCE) as
            | mapboxgl.GeoJSONSource
            | undefined;
        if (!source) return;
        source.setData({
            type: 'FeatureCollection',
            features: placePins.map((pin) => ({
                type: 'Feature',
                id: pin.id,
                geometry: {
                    type: 'Point',
                    coordinates: [pin.lng, pin.lat],
                },
                properties: {
                    id: pin.id,
                    name: pin.name,
                    city: pin.city,
                    country: pin.country,
                    source: pin.source,
                    visitedAt: pin.visitedAt,
                    // Trips ride along as JSON-encoded so it
                    // round-trips through Mapbox's properties bag
                    // (which serializes via JSON internally — nested
                    // arrays survive as references in modern versions
                    // but stringifying is the safe path).
                    trips: JSON.stringify(pin.trips ?? []),
                },
            })),
        });
    }, [placePins, mapReady]);

    // Sync city pins into the GeoJSON source — same pattern as
    // places above. Cities don't carry trip joins today, so the
    // properties bag is lighter.
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !mapReady) return;
        const source = map.getSource(CITY_PINS_SOURCE) as
            | mapboxgl.GeoJSONSource
            | undefined;
        if (!source) return;
        source.setData({
            type: 'FeatureCollection',
            features: cityPins.map((pin) => ({
                type: 'Feature',
                id: pin.citySlug,
                geometry: {
                    type: 'Point',
                    coordinates: [pin.lng, pin.lat],
                },
                properties: {
                    id: pin.citySlug,
                    cityName: pin.cityName,
                    countryName: pin.countryName,
                    countryCode: pin.countryCode,
                    source: pin.source,
                    visitedAt: pin.visitedAt,
                },
            })),
        });
    }, [cityPins, mapReady]);

    // Frame the camera so every visited country polygon AND every
    // visited place pin is inside the viewport. Used twice:
    // 1. one-shot on initial load, so the user lands on "their world"
    //    instead of the default world view, and
    // 2. by the "Fit to my world" button so they can return to that
    //    framing after exploring.
    const fitToVisitedWorld = useCallback(() => {
        const map = mapRef.current;
        if (!map) return;
        const bounds = new mapboxgl.LngLatBounds();
        let extended = false;

        if (map.getLayer('visited-country-fill')) {
            // queryRenderedFeatures only returns features whose tiles
            // are currently drawn — relies on the caller having waited
            // for the map to be idle (the auto-fit effect uses 'idle';
            // the reset button is fine because tiles are already up
            // by then).
            const features = map.queryRenderedFeatures(undefined, {
                layers: ['visited-country-fill'],
            });
            for (const f of features) {
                const geom = f.geometry as
                    | { type: string; coordinates: unknown }
                    | undefined;
                if (!geom) continue;
                extendBoundsFromGeometry(bounds, geom);
                extended = true;
            }
        }

        // Pins extend bounds too, so a country with no shaded polygon
        // (rare — code missing from the boundaries tileset) still
        // contributes a coordinate, AND so a city-less place pin
        // inside a country whose other half wraps the antimeridian
        // (Russia, US/AK) gets pulled into the frame.
        for (const p of placePins) {
            bounds.extend([p.lng, p.lat]);
            extended = true;
        }
        // City pins contribute too — a user who's only marked cities
        // (no specific places) inside a never-shaded country still
        // gets framed when they hit "Fit to my world".
        for (const c of cityPins) {
            bounds.extend([c.lng, c.lat]);
            extended = true;
        }

        if (!extended) return;
        map.fitBounds(bounds, {
            padding: { top: 80, bottom: 80, left: 80, right: 80 },
            maxZoom: 5,
            duration: 1500,
        });
    }, [placePins, cityPins]);

    // One-shot auto-fit on initial load. Waits for the country layer's
    // tiles to actually render (the 'idle' event) before measuring —
    // queryRenderedFeatures returns nothing until then, so a naive
    // "fire after mapReady" would fitBounds with an empty box and the
    // camera wouldn't move.
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !mapReady) return;
        if (didAutoFitRef.current) return;
        if (
            countryCodes.length === 0 &&
            placePins.length === 0 &&
            cityPins.length === 0
        ) {
            return;
        }

        const tryFit = () => {
            if (didAutoFitRef.current) return;
            if (!map.isStyleLoaded()) return;
            fitToVisitedWorld();
            didAutoFitRef.current = true;
            map.off('idle', tryFit);
        };

        map.on('idle', tryFit);
        return () => {
            map.off('idle', tryFit);
        };
    }, [mapReady, countryCodes, placePins, cityPins, fitToVisitedWorld]);

    const handleOpenPaywall = () => paywallRef.current?.openModel();

    /** Derive the trip list for the current selection. Trips live on
     *  `visitedPlaces[].trips`; a country / city's trip list is the
     *  union of trips across every place inside that region. Returns
     *  an array sorted newest-visit-first; each entry carries a
     *  `places` array of which places were visited on that trip (so
     *  the panel can show "Tokyo trip · 4 places" with the list of
     *  place names).
     *
     *  Returns null when no selection is active. */
    interface SelectionTripPlace {
        id: string;
        name: string;
    }
    interface SelectionTrip {
        tripId: string;
        tripName: string | null;
        /** Newest visit date across the places visited on this trip
         *  within the selected region. */
        visitedAt: string;
        places: SelectionTripPlace[];
    }
    const selectionTrips = useMemo<SelectionTrip[] | null>(() => {
        if (!selection) return null;
        // Filter the visited-places pool down to those matching the
        // selected region. Place selection narrows to a single row;
        // city / country aggregate.
        const placesInScope = visitedPlaces.filter((p) => {
            if (selection.kind === 'place') return p.id === selection.id;
            if (selection.kind === 'city') {
                // Cities are keyed by slug; visited-place rows store
                // city + country code. Match on lowercased name +
                // country code (mirroring how cityOptions builds the
                // borrowed-coords fallback).
                const cityMatch = visitedCities.find(
                    (c) => c.citySlug === selection.id,
                );
                if (!cityMatch) return false;
                return (
                    (p.placeCity ?? '').toLowerCase() ===
                        cityMatch.cityName.toLowerCase() &&
                    (p.countryCode ?? '').toUpperCase() ===
                        cityMatch.countryCode.toUpperCase()
                );
            }
            return (p.countryCode ?? '').toUpperCase() === selection.id;
        });

        const byTrip = new Map<string, SelectionTrip>();
        for (const p of placesInScope) {
            for (const t of p.trips ?? []) {
                const existing = byTrip.get(t.tripId);
                const placeEntry: SelectionTripPlace = {
                    id: p.id,
                    name: p.placeName,
                };
                if (existing) {
                    // Dedupe by place id in case the same place was
                    // visited twice on the same trip.
                    if (!existing.places.some((x) => x.id === p.id)) {
                        existing.places.push(placeEntry);
                    }
                    // Keep the newest visit date as the trip's
                    // visited-at headline.
                    if (
                        new Date(t.visitedAt).getTime() >
                        new Date(existing.visitedAt).getTime()
                    ) {
                        existing.visitedAt = t.visitedAt;
                    }
                } else {
                    byTrip.set(t.tripId, {
                        tripId: t.tripId,
                        tripName: t.tripName,
                        visitedAt: t.visitedAt,
                        places: [placeEntry],
                    });
                }
            }
        }
        return Array.from(byTrip.values()).sort(
            (a, b) =>
                new Date(b.visitedAt).getTime() -
                new Date(a.visitedAt).getTime(),
        );
    }, [selection, visitedPlaces, visitedCities]);

    /** Aggregate trip counts per region — drives the "has trips" dot
     *  on each dropdown option. Built off `visitedPlaces[].trips`
     *  since that's the only source carrying trip joins today.
     *  - Countries: deduped trip count across every place in the
     *    country.
     *  - Cities: same, scoped to places whose city matches.
     *  - Places: just the row's own trips array length.
     *  All three return Maps so the option-builder useMemos below
     *  can do a single O(1) lookup per option. */
    const tripCountByCountry = useMemo<Map<string, number>>(() => {
        const byCode = new Map<string, Set<string>>();
        for (const p of visitedPlaces) {
            const code = (p.countryCode ?? '').toUpperCase();
            if (!code) continue;
            for (const t of p.trips ?? []) {
                let set = byCode.get(code);
                if (!set) {
                    set = new Set();
                    byCode.set(code, set);
                }
                set.add(t.tripId);
            }
        }
        const counts = new Map<string, number>();
        for (const [code, set] of byCode) counts.set(code, set.size);
        return counts;
    }, [visitedPlaces]);

    const tripCountByCity = useMemo<Map<string, number>>(() => {
        // City keying uses citySlug. We look up each visited place's
        // (placeCity, countryCode) against the visitedCities list to
        // find a matching slug.
        const counts = new Map<string, number>();
        for (const city of visitedCities) {
            const slug = city.citySlug;
            if (!slug) continue;
            const tripIds = new Set<string>();
            for (const p of visitedPlaces) {
                if (
                    (p.placeCity ?? '').toLowerCase() ===
                        city.cityName.toLowerCase() &&
                    (p.countryCode ?? '').toUpperCase() ===
                        city.countryCode.toUpperCase()
                ) {
                    for (const t of p.trips ?? []) tripIds.add(t.tripId);
                }
            }
            counts.set(slug, tripIds.size);
        }
        return counts;
    }, [visitedCities, visitedPlaces]);

    const tripCountByPlace = useMemo<Map<string, number>>(() => {
        const counts = new Map<string, number>();
        for (const p of visitedPlaces) {
            counts.set(p.id, p.trips?.length ?? 0);
        }
        return counts;
    }, [visitedPlaces]);

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
                tripCount: tripCountByCountry.get(c.code) ?? 0,
            }));
    }, [visitedCountries, visitedCities, visitedPlaces, tripCountByCountry]);

    const cityOptions = useMemo<MyMapStatDropdownOption[]>(() => {
        return visitedCities
            .slice()
            .sort((a, b) => a.cityName.localeCompare(b.cityName))
            .map((c) => {
                // Native city coords (geocoded at mark-visited time)
                // are the primary source. Older rows from before the
                // geocoder shipped don't have them — fall back to
                // borrowing coords from a visited place in that city
                // so existing data still flies on the map until a
                // backfill runs.
                const hasNative =
                    typeof c.latitude === 'number' &&
                    typeof c.longitude === 'number';
                const borrowedFromPlace = !hasNative && visitedPlaces.some(
                    (p) =>
                        typeof p.latitude === 'number' &&
                        typeof p.longitude === 'number' &&
                        (p.placeCity ?? '').toLowerCase() ===
                            c.cityName.toLowerCase() &&
                        (p.countryCode ?? '').toUpperCase() ===
                            c.countryCode.toUpperCase()
                );
                const hasCoords = hasNative || borrowedFromPlace;
                return {
                    id: c.citySlug,
                    label: c.cityName,
                    sublabel: `${c.countryName} (${c.countryCode})`,
                    disabled: !hasCoords,
                    disabledReason: hasCoords
                        ? undefined
                        : 'No coordinates yet for this city',
                    tripCount: tripCountByCity.get(c.citySlug) ?? 0,
                };
            });
    }, [visitedCities, visitedPlaces, tripCountByCity]);

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
                    tripCount: tripCountByPlace.get(p.id) ?? 0,
                    disabledReason: hasCoords
                        ? undefined
                        : 'No coordinates for this place yet',
                };
            });
    }, [visitedPlaces, tripCountByPlace]);

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

    // Click + hover interactions on the visited-country fill layer.
    // Click flies in (same code path the dropdown uses). Hover sets a
    // feature-state flag the layer's paint expression reads to bump
    // opacity, plus a cursor change so users discover the country is
    // interactive.
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !mapReady) return;

        const setHover = (id: number | string | null) => {
            const prev = hoveredCountryRef.current;
            if (prev !== null && prev !== id) {
                map.setFeatureState(
                    {
                        source: COUNTRY_BOUNDARIES_SOURCE,
                        sourceLayer: 'country_boundaries',
                        id: prev,
                    },
                    { hover: false }
                );
            }
            hoveredCountryRef.current = id;
            if (id !== null) {
                map.setFeatureState(
                    {
                        source: COUNTRY_BOUNDARIES_SOURCE,
                        sourceLayer: 'country_boundaries',
                        id,
                    },
                    { hover: true }
                );
            }
        };

        const onClick = (e: mapboxgl.MapLayerMouseEvent) => {
            // Pins sit on top of the country fill; a click on a pin
            // also lands inside the country polygon, which would fire
            // this handler and re-frame the camera via `flyToCountry`.
            // The user clicked the pin specifically (they're already
            // zoomed in on the pin layer), so suppress the country
            // re-frame when a pin is at the same point — the pin's
            // own click handler still runs and opens the popup.
            const pinHit = map.queryRenderedFeatures(e.point, {
                layers: [PLACE_PINS_LAYER, CITY_PINS_LAYER],
            });
            if (pinHit.length > 0) return;

            const feat = e.features?.[0];
            if (!feat) return;
            const code =
                (feat.properties?.iso_3166_1 as string | undefined) ?? '';
            if (!code) return;
            flyToCountry(code);
            // Surface a trip list for this country in the left panel.
            // Look up the display name from any source that has it
            // (visited countries / cities / places all carry country
            // labels), falling back to the ISO code so the panel
            // always has a usable title.
            const meta = countryOptions.find((o) => o.id === code);
            setSelection({
                kind: 'country',
                id: code,
                label: meta?.label ?? code,
                sublabel: `Country · ${code}`,
            });
        };
        const onMove = (e: mapboxgl.MapLayerMouseEvent) => {
            const id = e.features?.[0]?.id;
            if (id === undefined || id === null) return;
            if (id !== hoveredCountryRef.current) {
                map.getCanvas().style.cursor = 'pointer';
                setHover(id);
            }
        };
        const onLeave = () => {
            map.getCanvas().style.cursor = '';
            setHover(null);
        };

        map.on('click', 'visited-country-fill', onClick);
        map.on('mousemove', 'visited-country-fill', onMove);
        map.on('mouseleave', 'visited-country-fill', onLeave);
        return () => {
            map.off('click', 'visited-country-fill', onClick);
            map.off('mousemove', 'visited-country-fill', onMove);
            map.off('mouseleave', 'visited-country-fill', onLeave);
            // Clear any lingering hover state so the next mount
            // (e.g. after a HMR reload in dev) doesn't see a stuck
            // brightened country.
            setHover(null);
        };
    }, [mapReady, flyToCountry, countryOptions]);

    // Pin layer interactions — click to open popup, mousemove to
    // grow the dot via feature-state. Same wiring for both place
    // and city layers; the popup builder branches on which layer
    // fired. Pointer cursor on hover so users discover the pin is
    // interactive.
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !mapReady) return;

        const setPinHover = (
            source: string,
            id: string | null,
        ) => {
            const prev = hoveredPinRef.current;
            if (prev && (prev.source !== source || prev.id !== id)) {
                if (prev.id !== null) {
                    map.setFeatureState(
                        { source: prev.source, id: prev.id },
                        { hover: false },
                    );
                }
            }
            hoveredPinRef.current = id !== null ? { source, id } : null;
            if (id !== null) {
                map.setFeatureState(
                    { source, id },
                    { hover: true },
                );
            }
        };

        const openPopupAt = (
            lngLat: mapboxgl.LngLat | [number, number],
            html: string,
            offset: number,
        ) => {
            openPopupRef.current?.remove();
            const popup = new mapboxgl.Popup({
                offset,
                closeButton: true,
                maxWidth: '260px',
                className: 'my-map-pin-popup',
            })
                .setLngLat(lngLat)
                .setHTML(html)
                .addTo(map);
            openPopupRef.current = popup;
        };

        const onPlaceClick = (e: mapboxgl.MapLayerMouseEvent) => {
            const feat = e.features?.[0];
            if (!feat) return;
            const props = feat.properties ?? {};
            // `properties.trips` was JSON-stringified into the
            // source so we can parse it back to the popup shape.
            let trips: PinPopupTrip[] = [];
            try {
                const raw = props.trips;
                if (typeof raw === 'string') {
                    trips = JSON.parse(raw) as PinPopupTrip[];
                }
            } catch {
                /* malformed — fall through with no trips. */
            }
            const html = renderPinPopupHtml({
                name: String(props.name ?? ''),
                city: String(props.city ?? ''),
                country: String(props.country ?? ''),
                source: props.source ? String(props.source) : undefined,
                visitedAt: props.visitedAt
                    ? String(props.visitedAt)
                    : undefined,
                trips,
            });
            openPopupAt(e.lngLat, html, 8);
            const placeId = String(feat.id ?? props.id ?? '');
            if (placeId) {
                setSelection({
                    kind: 'place',
                    id: placeId,
                    label: String(props.name ?? ''),
                    sublabel: [props.city, props.country]
                        .filter(Boolean)
                        .map(String)
                        .join(', ') || 'Place',
                });
            }
        };

        const onCityClick = (e: mapboxgl.MapLayerMouseEvent) => {
            const feat = e.features?.[0];
            if (!feat) return;
            const props = feat.properties ?? {};
            const html = renderCityPopupHtml({
                cityName: String(props.cityName ?? ''),
                countryName: String(props.countryName ?? ''),
                countryCode: String(props.countryCode ?? ''),
                source: props.source ? String(props.source) : undefined,
                visitedAt: props.visitedAt
                    ? String(props.visitedAt)
                    : undefined,
            });
            openPopupAt(e.lngLat, html, 10);
            const citySlug = String(feat.id ?? props.id ?? '');
            if (citySlug) {
                setSelection({
                    kind: 'city',
                    id: citySlug,
                    label: String(props.cityName ?? ''),
                    sublabel: `${String(props.countryName ?? '')} · City`,
                });
            }
        };

        const onPinMove = (source: string) =>
            (e: mapboxgl.MapLayerMouseEvent) => {
                const id = e.features?.[0]?.id;
                if (id === undefined || id === null) return;
                map.getCanvas().style.cursor = 'pointer';
                setPinHover(source, String(id));
            };
        const onPinLeave = () => {
            map.getCanvas().style.cursor = '';
            setPinHover('', null);
        };

        const onPlaceMove = onPinMove(PLACE_PINS_SOURCE);
        const onCityMove = onPinMove(CITY_PINS_SOURCE);

        map.on('click', PLACE_PINS_LAYER, onPlaceClick);
        map.on('click', CITY_PINS_LAYER, onCityClick);
        map.on('mousemove', PLACE_PINS_LAYER, onPlaceMove);
        map.on('mousemove', CITY_PINS_LAYER, onCityMove);
        map.on('mouseleave', PLACE_PINS_LAYER, onPinLeave);
        map.on('mouseleave', CITY_PINS_LAYER, onPinLeave);
        return () => {
            map.off('click', PLACE_PINS_LAYER, onPlaceClick);
            map.off('click', CITY_PINS_LAYER, onCityClick);
            map.off('mousemove', PLACE_PINS_LAYER, onPlaceMove);
            map.off('mousemove', CITY_PINS_LAYER, onCityMove);
            map.off('mouseleave', PLACE_PINS_LAYER, onPinLeave);
            map.off('mouseleave', CITY_PINS_LAYER, onPinLeave);
            setPinHover('', null);
        };
    }, [mapReady]);

    const flyToCity = useCallback(
        (citySlug: string) => {
            const map = mapRef.current;
            if (!map) return;
            const city = visitedCities.find((c) => c.citySlug === citySlug);
            if (!city) return;
            // Primary: the city row's own lat/lng (geocoded at
            // mark-visited time by the backend). Fallback: average the
            // coords of any visited places in that city — keeps the
            // dropdown working for pre-geocoder city rows until a
            // backfill catches up.
            let lat: number | null = null;
            let lng: number | null = null;
            if (
                typeof city.latitude === 'number' &&
                typeof city.longitude === 'number'
            ) {
                lat = city.latitude;
                lng = city.longitude;
            } else {
                const places = visitedPlaces.filter(
                    (p) =>
                        typeof p.latitude === 'number' &&
                        typeof p.longitude === 'number' &&
                        (p.placeCity ?? '').toLowerCase() ===
                            city.cityName.toLowerCase() &&
                        (p.countryCode ?? '').toUpperCase() ===
                            city.countryCode.toUpperCase()
                );
                if (places.length > 0) {
                    lat =
                        places.reduce((s, p) => s + (p.latitude as number), 0) /
                        places.length;
                    lng =
                        places.reduce((s, p) => s + (p.longitude as number), 0) /
                        places.length;
                }
            }
            if (lat === null || lng === null) return;
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
            const lng = place.longitude;
            const lat = place.latitude;
            map.flyTo({
                center: [lng, lat],
                zoom: 13,
                duration: 1200,
            });
            // Open the popup imperatively once the camera has
            // settled — opening immediately makes it feel
            // disconnected from the fly motion. Build it from the
            // visited-place row directly since there's no marker ref
            // anymore (native circle layer = no DOM element to
            // toggle).
            window.setTimeout(() => {
                openPopupRef.current?.remove();
                const popup = new mapboxgl.Popup({
                    offset: 8,
                    closeButton: true,
                    maxWidth: '260px',
                    className: 'my-map-pin-popup',
                })
                    .setLngLat([lng, lat])
                    .setHTML(
                        renderPinPopupHtml({
                            name: place.placeName,
                            city: place.placeCity ?? '',
                            country: place.placeCountry ?? '',
                            source: place.source,
                            visitedAt: place.visitedAt,
                            trips: place.trips,
                        }),
                    )
                    .addTo(map);
                openPopupRef.current = popup;
            }, 900);
        },
        [visitedPlaces]
    );

    /** Open the pin-detail popup for the first place in a trip — used
     *  on hover over the left-panel trip cards so the user can preview
     *  the trip's detail without the map moving or zooming. Clicking
     *  the card still navigates to /trip-detail (the card is a <Link>).
     *
     *  No `flyTo` / `fitBounds` here on purpose: the user keeps the
     *  current map view (the selected country / city) and the popup
     *  surfaces at the place's actual coords. If the place is off-
     *  screen for the current zoom, the popup is offscreen too —
     *  acceptable because the user is hovering, not navigating. */
    const showTripPin = useCallback(
        (trip: SelectionTrip) => {
            const map = mapRef.current;
            if (!map) return;
            let place: (typeof visitedPlaces)[number] | undefined;
            for (const tp of trip.places) {
                const vp = visitedPlaces.find((p) => p.id === tp.id);
                if (
                    vp &&
                    typeof vp.latitude === 'number' &&
                    typeof vp.longitude === 'number'
                ) {
                    place = vp;
                    break;
                }
            }
            if (
                !place ||
                typeof place.latitude !== 'number' ||
                typeof place.longitude !== 'number'
            ) {
                return;
            }
            const lng = place.longitude;
            const lat = place.latitude;
            openPopupRef.current?.remove();
            const popup = new mapboxgl.Popup({
                offset: 8,
                closeButton: true,
                maxWidth: '260px',
                className: 'my-map-pin-popup',
            })
                .setLngLat([lng, lat])
                .setHTML(
                    renderPinPopupHtml({
                        name: place.placeName,
                        city: place.placeCity ?? '',
                        country: place.placeCountry ?? '',
                        source: place.source,
                        visitedAt: place.visitedAt,
                        trips: place.trips,
                    }),
                )
                .addTo(map);
            openPopupRef.current = popup;
        },
        [visitedPlaces]
    );

    const handleSelectFromDropdown = (
        key: StatDropdownKey,
        id: string
    ) => {
        if (key === 'countries') {
            flyToCountry(id);
            const meta = countryOptions.find((o) => o.id === id);
            setSelection({
                kind: 'country',
                id,
                label: meta?.label ?? id,
                sublabel: `Country · ${id}`,
            });
        } else if (key === 'cities') {
            flyToCity(id);
            const meta = visitedCities.find((c) => c.citySlug === id);
            setSelection({
                kind: 'city',
                id,
                label: meta?.cityName ?? id,
                sublabel: meta
                    ? `${meta.countryName} · City`
                    : 'City',
            });
        } else {
            flyToPlace(id);
            const meta = visitedPlaces.find((p) => p.id === id);
            setSelection({
                kind: 'place',
                id,
                label: meta?.placeName ?? id,
                sublabel:
                    meta &&
                    [meta.placeCity, meta.placeCountry]
                        .filter(Boolean)
                        .join(', ')
                        ? [meta.placeCity, meta.placeCountry]
                              .filter(Boolean)
                              .join(', ')
                        : 'Place',
            });
        }
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

                    {/* Stats dropdowns — absolute-positioned at the
                     *  top-center of the map canvas. Hidden in the locked
                     *  (non-Pro) state so the upgrade panel isn't crowded
                     *  by chrome that doesn't do anything yet. */}
                    {isPro && (
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
                    )}

                    {/* Intro panel + collapsed pill — absolute-
                     *  positioned overlay on the map canvas so the
                     *  map's height never shifts between states.
                     *  First visit opens the panel; localStorage
                     *  flag dismisses it for subsequent visits. The
                     *  "ⓘ" pill always reopens it. */}
                    {isPro && (introOpen ? (
                        <section
                            className="my-map-intro"
                            aria-labelledby="my-map-intro-title"
                        >
                            <button
                                type="button"
                                className="my-map-intro-close"
                                onClick={handleCloseIntro}
                                aria-label="Hide intro"
                            >
                                <CloseRoundedIcon fontSize="small" />
                            </button>
                            <div className="my-map-intro-headline">
                                <span
                                    className="my-map-intro-icon"
                                    aria-hidden="true"
                                >
                                    <PublicRoundedIcon />
                                </span>
                                <div className="my-map-intro-headline-text">
                                    <h2
                                        id="my-map-intro-title"
                                        className="my-map-intro-title"
                                    >
                                        Your travel atlas
                                    </h2>
                                    <p className="my-map-intro-sub">
                                        Every country, city, and place
                                        you&rsquo;ve visited — on one
                                        living world map.
                                    </p>
                                </div>
                            </div>
                            <ul className="my-map-intro-legend">
                                <li className="my-map-intro-legend-item">
                                    <span
                                        className="my-map-intro-legend-dot is-country"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        <strong>Countries</strong> shaded green.
                                    </span>
                                </li>
                                <li className="my-map-intro-legend-item">
                                    <span
                                        className="my-map-intro-legend-dot is-city"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        <strong>Cities</strong> as green rings.
                                    </span>
                                </li>
                                <li className="my-map-intro-legend-item">
                                    <span
                                        className="my-map-intro-legend-dot is-place"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        <strong>Places</strong> as orange pins.
                                    </span>
                                </li>
                            </ul>
                            <p className="my-map-intro-tip">
                                Tap a country, pin, or dropdown to fly
                                anywhere on the globe.
                            </p>
                        </section>
                    ) : (
                        <button
                            type="button"
                            className="my-map-intro-pill"
                            onClick={handleOpenIntro}
                            aria-label="About Mapper"
                            title="About Mapper"
                        >
                            <InfoOutlinedIcon fontSize="small" />
                            <span>About</span>
                        </button>
                    ))}

                    {/* Trips panel — slides in from the left side
                     *  when the user clicks a country / city / place
                     *  (or picks one from the dropdowns). Shows every
                     *  trip whose itinerary touched the selected
                     *  region, with the places visited on each trip
                     *  and a click-through to /trip-detail. Skipped
                     *  entirely when there are zero trips — the
                     *  pin popup + camera fly already confirm the
                     *  click, no need for a panel that just says
                     *  "nothing to show here." */}
                    {selection &&
                        selectionTrips &&
                        selectionTrips.length > 0 && (
                        <aside
                            className="my-map-trips-panel"
                            aria-labelledby="my-map-trips-panel-title"
                        >
                            <div className="my-map-trips-panel-summary">
                                <header className="my-map-trips-panel-header">
                                    <div className="my-map-trips-panel-heading">
                                        <span
                                            className={`my-map-trips-panel-icon is-${selection.kind}`}
                                            aria-hidden="true"
                                        >
                                            {selection.kind === 'country' ? (
                                                <PublicRoundedIcon fontSize="small" />
                                            ) : selection.kind === 'city' ? (
                                                <LocationCityRoundedIcon fontSize="small" />
                                            ) : (
                                                <PlaceRoundedIcon fontSize="small" />
                                            )}
                                        </span>
                                        <div className="my-map-trips-panel-heading-text">
                                            <h2
                                                id="my-map-trips-panel-title"
                                                className="my-map-trips-panel-title"
                                            >
                                                {selection.label}
                                            </h2>
                                            {selection.sublabel && (
                                                <p className="my-map-trips-panel-sub">
                                                    {selection.sublabel}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="my-map-trips-panel-close"
                                        onClick={handleClearSelection}
                                        aria-label="Close trips panel"
                                    >
                                        <CloseRoundedIcon fontSize="small" />
                                    </button>
                                </header>
                                <div className="my-map-trips-panel-stat">
                                    <strong>{selectionTrips.length}</strong>{' '}
                                    trip{selectionTrips.length === 1 ? '' : 's'}
                                </div>
                            </div>
                            <div className="my-map-trips-panel-list">
                                {selectionTrips.map((trip) => {
                                        const visitedOn = formatVisitedAt(
                                            trip.visitedAt,
                                        );
                                        return (
                                            <Link
                                                key={trip.tripId}
                                                to={`/trip-detail?id=${encodeURIComponent(
                                                    trip.tripId,
                                                )}`}
                                                className="my-map-trips-panel-trip"
                                                onMouseEnter={() => showTripPin(trip)}
                                            >
                                                <div className="my-map-trips-panel-trip-head">
                                                    <span className="my-map-trips-panel-trip-name">
                                                        {trip.tripName?.trim() ||
                                                            'Untitled trip'}
                                                    </span>
                                                    {visitedOn && (
                                                        <span className="my-map-trips-panel-trip-date">
                                                            {visitedOn}
                                                        </span>
                                                    )}
                                                </div>
                                                {trip.places.length > 0 && (
                                                    <ul className="my-map-trips-panel-trip-places">
                                                        {trip.places
                                                            .slice(0, 6)
                                                            .map((pl) => (
                                                                <li
                                                                    key={pl.id}
                                                                    className="my-map-trips-panel-trip-place"
                                                                >
                                                                    <PlaceRoundedIcon className="my-map-trips-panel-trip-place-icon" />
                                                                    <span>
                                                                        {pl.name}
                                                                    </span>
                                                                </li>
                                                            ))}
                                                        {trip.places.length >
                                                            6 && (
                                                            <li className="my-map-trips-panel-trip-place is-more">
                                                                +{' '}
                                                                {trip.places
                                                                    .length -
                                                                    6}{' '}
                                                                more
                                                            </li>
                                                        )}
                                                    </ul>
                                                )}
                                            </Link>
                                        );
                                    })}
                            </div>
                        </aside>
                    )}

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

interface PinPopupTrip {
    tripId: string;
    tripName: string | null;
    visitedAt: string;
}

interface PinPopupInput {
    name: string;
    city: string;
    country: string;
    source?: string;
    visitedAt?: string | null;
    /** Trips that visited this place. The popup branches on length:
     *  0 → details-only; 1 → single "View trip" CTA; 2+ → inline list. */
    trips?: PinPopupTrip[];
}

/** Render the Mapbox popup body for a visited place. All values
 *  flow through `escapeHtml` since Mapbox injects this as innerHTML.
 *
 *  Trip-rendering branches:
 *  - **No trips** (`source='manual'` only): just "View detail".
 *  - **One trip**: header line "From <trip>" + a green primary CTA +
 *    an orange "View trip" CTA. Mirrors the pre-multi-trip behavior.
 *  - **Multiple trips**: an inline list of trips with per-row visit
 *    dates and one link per trip. The primary CTA still goes to the
 *    place page; the orange single-CTA is replaced by the list so
 *    the popup doesn't grow two competing affordances.
 *
 *  All `target="_blank"` so the user keeps the map context. */
const renderPinPopupHtml = (pin: PinPopupInput): string => {
    const detailHref = `/place?q=${encodeURIComponent(pin.name)}&i=0`;
    const trips = pin.trips ?? [];
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

    let tripBlock = '';
    let tripCta = '';
    if (trips.length === 1) {
        const trip = trips[0];
        const tripHref = `/trip-detail?id=${encodeURIComponent(trip.tripId)}`;
        if (trip.tripName) {
            tripBlock = `<div class="my-map-pin-popup-trip">From <strong>${escapeHtml(
                trip.tripName
            )}</strong></div>`;
        }
        tripCta = `<a
                class="my-map-pin-popup-cta my-map-pin-popup-cta-trip"
                href="${tripHref}"
                target="_blank"
                rel="noopener noreferrer"
            >View trip</a>`;
    } else if (trips.length > 1) {
        // Inline list — one row per trip with its own date. Replaces
        // the single orange CTA; the popup wraps if there are many.
        const rows = trips
            .map((t) => {
                const tripHref = `/trip-detail?id=${encodeURIComponent(t.tripId)}`;
                const name = t.tripName?.trim() || 'Untitled trip';
                const visitedOn = formatVisitedAt(t.visitedAt);
                const dateBit = visitedOn
                    ? `<span class="my-map-pin-popup-trip-row-date">${escapeHtml(
                          visitedOn
                      )}</span>`
                    : '';
                return `<a
                    class="my-map-pin-popup-trip-row"
                    href="${tripHref}"
                    target="_blank"
                    rel="noopener noreferrer"
                ><span class="my-map-pin-popup-trip-row-name">${escapeHtml(
                    name
                )}</span>${dateBit}</a>`;
            })
            .join('');
        tripBlock = `<div class="my-map-pin-popup-trip-list">
            <div class="my-map-pin-popup-trip-list-label">Visited on ${trips.length} trips</div>
            ${rows}
        </div>`;
    }

    return `
        <div class="my-map-pin-popup-inner">
            <div class="my-map-pin-popup-title">${escapeHtml(pin.name)}</div>
            ${
                locationLine
                    ? `<div class="my-map-pin-popup-loc">${locationLine}</div>`
                    : ''
            }
            ${tripBlock}
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
            <div class="my-map-pin-popup-actions">
                <a
                    class="my-map-pin-popup-cta"
                    href="${detailHref}"
                    target="_blank"
                    rel="noopener noreferrer"
                >View detail</a>
                ${tripCta}
            </div>
        </div>
    `;
};

interface CityPopupInput {
    cityName: string;
    countryName: string;
    countryCode: string;
    source?: string;
    visitedAt?: string | null;
}

/** Render the Mapbox popup body for a visited city pin. Distinct from
 *  the place popup — cities don't carry the trips[] join today (the
 *  cascade only writes places + countries), so the popup is simpler:
 *  name, country, when visited, and one CTA to the /city page.
 *
 *  Same escapeHtml + target=_blank conventions as the place popup so
 *  the user keeps the map context when they jump out. */
const renderCityPopupHtml = (pin: CityPopupInput): string => {
    const cityHref =
        `/city?name=${encodeURIComponent(pin.cityName)}` +
        `&country=${encodeURIComponent(pin.countryName)}` +
        `&code=${encodeURIComponent(pin.countryCode)}` +
        `&mode=single`;
    const visited = formatVisitedAt(pin.visitedAt);
    const sourceLabel =
        pin.source === 'itinerary' ? 'From a trip' : 'Marked visited';
    return `
        <div class="my-map-pin-popup-inner">
            <div class="my-map-pin-popup-title">${escapeHtml(pin.cityName)}</div>
            <div class="my-map-pin-popup-loc">${escapeHtml(
                `${pin.countryName} (${pin.countryCode})`,
            )}</div>
            ${
                visited || sourceLabel
                    ? `<div class="my-map-pin-popup-meta">${
                          sourceLabel
                              ? `<span class="my-map-pin-popup-chip">${escapeHtml(
                                    sourceLabel,
                                )}</span>`
                              : ''
                      }${
                          visited
                              ? `<span class="my-map-pin-popup-date">Visited ${escapeHtml(
                                    visited,
                                )}</span>`
                              : ''
                      }</div>`
                    : ''
            }
            <div class="my-map-pin-popup-actions">
                <a
                    class="my-map-pin-popup-cta"
                    href="${cityHref}"
                    target="_blank"
                    rel="noopener noreferrer"
                >View city</a>
            </div>
        </div>
    `;
};

export default MyMap;
