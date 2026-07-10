import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    within,
    act,
    fireEvent,
} from '../../../test/renderWithProviders';

// ── Mapbox GL mock ──────────────────────────────────────────────────────
// mapbox-gl needs WebGL/canvas, which jsdom can't provide. We replace it with
// a stub whose Map records every registered event handler on the instance so
// tests can fire synthetic map events (country/pin/friends clicks + hovers),
// driving the otherwise-imperative interaction handlers. The `load` + `idle`
// lifecycle events are fired explicitly by `renderMap` (post-mount, in act) so
// `mapReady` flips true and the data-sync effects run; the getSource/getLayer
// stubs return "added" once addSource/addLayer ran, so both the create branch
// AND the later setData/setFilter branches execute. The
// module-const MAPBOX_TOKEN is read at import time, so the token is stubbed in
// this hoisted block before the component module evaluates.
const mapbox = vi.hoisted(() => {
    (import.meta as unknown as { env: Record<string, string> }).env
        .VITE_MAPBOX_TOKEN = 'pk.test.token';

    const state: { instance: any } = { instance: null };

    const parse = (a: unknown, b: unknown) => {
        const layer = typeof a === 'string' ? a : '';
        const handler = (typeof a === 'string' ? b : a) as (e?: unknown) => void;
        return { layer, handler };
    };

    const makeMap = () => {
        const handlers = new Map<string, Set<(e?: unknown) => void>>();
        const addedSources = new Set<string>();
        const addedLayers = new Set<string>();
        const map: any = {
            addControl: vi.fn(),
            resize: vi.fn(),
            remove: vi.fn(),
            getCanvas: vi.fn(() => ({ style: {} })),
            getSource: vi.fn((id: string) =>
                addedSources.has(id) ? { setData: vi.fn() } : undefined
            ),
            addSource: vi.fn((id: string) => addedSources.add(id)),
            getLayer: vi.fn((id: string) =>
                addedLayers.has(id) ? { id } : undefined
            ),
            addLayer: vi.fn((layer: any) => {
                const id = typeof layer === 'string' ? layer : layer?.id;
                if (id) addedLayers.add(id);
            }),
            setFilter: vi.fn(),
            setLayoutProperty: vi.fn(),
            setPaintProperty: vi.fn(),
            setProjection: vi.fn(),
            setStyle: vi.fn(),
            setFeatureState: vi.fn(),
            queryRenderedFeatures: vi.fn(() => [] as unknown[]),
            querySourceFeatures: vi.fn(() => [] as unknown[]),
            isStyleLoaded: vi.fn(() => true),
            fitBounds: vi.fn(),
            flyTo: vi.fn(),
            on: vi.fn((type: string, a: unknown, b: unknown) => {
                const { layer, handler } = parse(a, b);
                const key = `${type}::${layer}`;
                let set = handlers.get(key);
                if (!set) {
                    set = new Set();
                    handlers.set(key, set);
                }
                set.add(handler);
                return map;
            }),
            once: vi.fn((type: string, handler: () => void) => {
                if (type === 'style.load') handler();
                return map;
            }),
            off: vi.fn((type: string, a: unknown, b: unknown) => {
                const { layer, handler } = parse(a, b);
                handlers.get(`${type}::${layer}`)?.delete(handler);
                return map;
            }),
            __handlers: handlers,
        };
        state.instance = map;
        return map;
    };

    // NB: named `MapMock`, not `Map` — a `const Map` would shadow the native
    // `Map` constructor that `makeMap` uses for its `handlers` map, turning
    // `new Map()` inside makeMap into infinite self-recursion.
    const MapMock = vi.fn(() => makeMap());
    const NavigationControl = vi.fn();
    const LngLatBounds = vi.fn(() => ({
        extend: vi.fn(),
        getNorthEast: vi.fn(() => ({ lng: 10, lat: 10 })),
        getSouthWest: vi.fn(() => ({ lng: -10, lat: -10 })),
    }));
    const Popup = vi.fn(() => {
        const popup: any = {
            setLngLat: vi.fn(() => popup),
            setHTML: vi.fn(() => popup),
            addTo: vi.fn(() => popup),
            remove: vi.fn(),
        };
        return popup;
    });

    const ctors = { Map: MapMock, NavigationControl, LngLatBounds, Popup };
    const module = {
        default: { accessToken: '', ...ctors },
    };

    const fire = (type: string, layer: string, evt: unknown) => {
        const inst = state.instance;
        if (!inst) return;
        const set = inst.__handlers.get(`${type}::${layer}`);
        if (set) [...set].forEach((fn) => fn(evt));
    };

    return { module, ctors, state, fire };
});

vi.mock('mapbox-gl', () => mapbox.module);

// ── Router ──────────────────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => mockNavigate,
}));

// ── Data hooks + user context ───────────────────────────────────────────
interface HookData<T> {
    data?: T;
}
let mockCountries: HookData<{ items: unknown[]; total: number }>;
let mockCities: HookData<{ items: unknown[]; total: number }>;
let mockPlaces: HookData<{ items: unknown[]; total: number }>;
let mockFriends: HookData<unknown>;
let mockTrips: HookData<unknown[]>;
let mockUser: Record<string, unknown> | null;
let mockIsAdmin: boolean;

vi.mock('api/hooks/useVisitedCountries', () => ({
    useVisitedCountries: () => mockCountries,
}));
vi.mock('api/hooks/useVisitedCities', () => ({
    useVisitedCities: () => mockCities,
}));
vi.mock('api/hooks/useVisitedPlaces', () => ({
    useVisitedPlaces: () => mockPlaces,
}));
vi.mock('api/hooks/useFriendsVisitedAll', () => ({
    useFriendsVisitedAll: () => mockFriends,
}));
vi.mock('api/hooks/useItineraries', () => ({
    useMyItineraries: () => mockTrips,
}));
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser, isAdmin: mockIsAdmin }),
}));

vi.mock('components/common/Layout/SubLayout', () => ({
    default: ({
        title,
        titleAction,
        children,
    }: {
        title?: string;
        titleAction?: ReactNode;
        children: ReactNode;
    }) => (
        <div>
            <h1>{title}</h1>
            {titleAction}
            {children}
        </div>
    ),
}));

const mockOpenPaywall = vi.fn();
vi.mock('components/PaywallModal', async () => {
    const { forwardRef, useImperativeHandle } = await import('react');
    const Stub = forwardRef((_props: unknown, ref) => {
        useImperativeHandle(ref, () => ({
            openModel: mockOpenPaywall,
            closeModal: vi.fn(),
        }));
        return <div data-testid="paywall-modal" />;
    });
    Stub.displayName = 'PaywallModalStub';
    return { default: Stub };
});

import MyMap from './index';

// ── Layer ids (mirror the source constants) ─────────────────────────────
const PLACE_LAYER = 'visited-place-pins-layer';
const CITY_LAYER = 'visited-city-pins-layer';
const FRIENDS_FILL = 'friends-country-fill';
const FRIENDS_PINS = 'friends-visited-pins-layer';

// ── Fixtures ────────────────────────────────────────────────────────────
const country = (over: Record<string, unknown> = {}) => ({
    id: 'co-us',
    countryId: 'cc-us',
    countryName: 'United States',
    countryCode: 'US',
    countryImage: null,
    source: 'manual',
    visitedAt: '2026-01-02T00:00:00Z',
    ...over,
});

const city = (over: Record<string, unknown> = {}) => ({
    id: 'ci-quepos',
    citySlug: 'quepos-cr',
    cityName: 'Quepos',
    countryName: 'Costa Rica',
    countryCode: 'CR',
    latitude: 9.43,
    longitude: -84.16,
    source: 'itinerary',
    visitedAt: '2026-02-03T00:00:00Z',
    ...over,
});

const place = (over: Record<string, unknown> = {}) => ({
    id: 'p-ma',
    placeKey: 'manuel-antonio',
    placeName: 'Manuel Antonio',
    placeCity: 'Quepos',
    placeCountry: 'Costa Rica',
    countryCode: 'CR',
    regionCode: null,
    regionName: null,
    latitude: 9.39,
    longitude: -84.14,
    source: 'itinerary',
    trips: [
        { tripId: 't1', tripName: 'Costa Rica Trip', visitedAt: '2026-02-03T00:00:00Z' },
    ],
    visitedAt: '2026-02-03T00:00:00Z',
    ...over,
});

const friendsPayload = () => ({
    countries: [
        {
            countryCode: 'FR',
            countryName: 'France',
            friends: [{ userId: 'f1', name: 'Luis', profileImageUrl: null }],
        },
    ],
    cities: [
        {
            citySlug: 'paris-fr',
            cityName: 'Paris',
            countryName: 'France',
            countryCode: 'FR',
            latitude: 48.85,
            longitude: 2.35,
            friends: [{ userId: 'f1', name: 'Luis', profileImageUrl: null }],
        },
    ],
    places: [
        {
            placeKey: 'louvre',
            placeName: 'Louvre',
            placeCity: 'Paris',
            placeCountry: 'France',
            latitude: 48.86,
            longitude: 2.33,
            friends: [{ userId: 'f2', name: 'Joanna', profileImageUrl: null }],
        },
    ],
});

const proUser = (over: Record<string, unknown> = {}) => ({
    id: 'u1',
    name: 'Trip Fan',
    isPaidMember: true,
    homeLatitude: 40.71,
    homeLongitude: -74.0,
    ...over,
});

const dataState = (items: unknown[]) => ({ data: { items, total: items.length } });

beforeEach(() => {
    mockCountries = dataState([country()]);
    mockCities = dataState([city()]);
    mockPlaces = dataState([place()]);
    mockFriends = { data: friendsPayload() };
    mockTrips = { data: [{ id: 't1', title: 'Costa Rica Trip' }] };
    mockUser = proUser();
    mockIsAdmin = false;
    mockNavigate.mockClear();
    mockOpenPaywall.mockClear();
    document.body.classList.remove('atlas-night-mode');
    // Projection/theme persist to localStorage; clear so each test starts from
    // the defaults (mercator / day) rather than a prior test's choice.
    localStorage.clear();
});

// Render MyMap, then fire the map's `load` + `idle` lifecycle events (inside
// act) so `mapReady` flips true and the data-sync / interaction effects run.
// Firing post-mount — rather than synchronously inside the mock's `on` — avoids
// re-entrant map construction during React's initial commit.
const renderMap = (
    ...args: Parameters<typeof renderWithProviders>
) => {
    const utils = renderWithProviders(...args);
    act(() => mapbox.fire('load', '', undefined));
    act(() => mapbox.fire('idle', '', undefined));
    return utils;
};

// Convenience: open a top stat dropdown by its trigger accessible name.
const openStat = async (name: RegExp) => {
    await userEvent.click(screen.getByRole('button', { name }));
};

describe('MyMap — Pro stats + layout', () => {
    it('renders the atlas summary card with counts, world %, and explorer level', () => {
        renderMap(<MyMap />, { route: '/atlas-map' });
        const card = screen.getByRole('complementary', {
            name: 'Your travel atlas summary',
        });
        // 2 countries (US + implied CR), 1 city, 1 place.
        expect(within(card).getByText('countries')).toBeInTheDocument();
        expect(within(card).getByText('2/195')).toBeInTheDocument();
        expect(within(card).getByText(/of the world explored/)).toHaveTextContent(
            '1.0%'
        );
        expect(within(card).getByText('Beginner Explorer')).toBeInTheDocument();
    });

    it('shows the furthest-destination stat when home coords are set', () => {
        renderMap(<MyMap />);
        const card = screen.getByRole('complementary', {
            name: 'Your travel atlas summary',
        });
        expect(
            within(card).getByText('Quepos, Costa Rica')
        ).toBeInTheDocument();
        expect(within(card).getByText(/mi from home/)).toBeInTheDocument();
    });

    it('initialises the Mapbox map and adds atlas sources/layers', () => {
        renderMap(<MyMap />);
        expect(mapbox.ctors.Map).toHaveBeenCalledTimes(1);
        const inst = mapbox.state.instance;
        expect(inst.addLayer).toHaveBeenCalled();
        expect(inst.addSource).toHaveBeenCalled();
        // Data-sync effects ran once mapReady flipped true.
        expect(inst.setFilter).toHaveBeenCalled();
    });

    it('renders the four stat dropdown triggers', () => {
        renderMap(<MyMap />);
        expect(screen.getByRole('button', { name: /2\s*countries/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /1\s*cities/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /1\s*places/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /1\s*friends/ })).toBeInTheDocument();
    });
});

describe('MyMap — paywall (free users)', () => {
    it('shows the paywall overlay and routes free users to the visited list', async () => {
        mockUser = proUser({ isPaidMember: false });
        renderMap(<MyMap />);
        expect(
            screen.getByRole('heading', { name: 'Travel Atlas is a Pro feature' })
        ).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'See visited list' })
        );
        expect(mockNavigate).toHaveBeenCalledWith('/visited');
        // Stats chrome is hidden for locked users.
        expect(
            screen.queryByRole('complementary', {
                name: 'Your travel atlas summary',
            })
        ).not.toBeInTheDocument();
    });

    it('opens the paywall modal from the upgrade button', async () => {
        mockUser = null;
        renderMap(<MyMap />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Upgrade to Pro' })
        );
        expect(mockOpenPaywall).toHaveBeenCalledTimes(1);
    });

    it('treats an admin (non-paying) user as Pro', () => {
        mockUser = proUser({ isPaidMember: false });
        mockIsAdmin = true;
        renderMap(<MyMap />);
        expect(
            screen.getByRole('complementary', {
                name: 'Your travel atlas summary',
            })
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('heading', {
                name: 'Travel Atlas is a Pro feature',
            })
        ).not.toBeInTheDocument();
    });
});

describe('MyMap — map controls', () => {
    it('switches projection to globe and persists the choice', async () => {
        renderMap(<MyMap />);
        const globe = screen.getByRole('button', { name: 'Globe' });
        await userEvent.click(globe);
        expect(globe).toHaveAttribute('aria-pressed', 'true');
        expect(mapbox.state.instance.setProjection).toHaveBeenCalledWith('globe');
        expect(localStorage.getItem('datryp.atlas.projection')).toBe('globe');
    });

    it('switches to night theme — restyles the map and dims the chrome', async () => {
        renderMap(<MyMap />);
        await userEvent.click(screen.getByRole('button', { name: 'Night' }));
        expect(mapbox.state.instance.setStyle).toHaveBeenCalledWith(
            'mapbox://styles/mapbox/dark-v11'
        );
        expect(document.body.classList.contains('atlas-night-mode')).toBe(true);
        expect(localStorage.getItem('datryp.atlas.theme')).toBe('night');
    });

    it('uses the mobile single-icon projection + theme toggles both ways', async () => {
        renderMap(<MyMap />);
        // Mobile projection chip: default flat → globe → flat (both label/icon
        // branches of the ternary).
        await userEvent.click(
            screen.getByRole('button', { name: 'Switch to globe view' })
        );
        expect(mapbox.state.instance.setProjection).toHaveBeenCalledWith('globe');
        await userEvent.click(
            screen.getByRole('button', { name: 'Switch to flat map' })
        );
        expect(mapbox.state.instance.setProjection).toHaveBeenCalledWith(
            'mercator'
        );
        // Mobile theme chip: default day → night → day.
        await userEvent.click(
            screen.getByRole('button', { name: 'Switch to night map' })
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Switch to day map' })
        );
        expect(mapbox.state.instance.setStyle).toHaveBeenCalledWith(
            'mapbox://styles/mapbox/light-v11'
        );
    });
});

describe('MyMap — layer visibility', () => {
    it('hides the country layers from the dropdown eye toggle', async () => {
        renderMap(<MyMap />);
        await openStat(/2\s*countries/);
        const eye = screen.getByRole('button', {
            name: 'Hide countries on map',
        });
        await userEvent.click(eye);
        expect(mapbox.state.instance.setLayoutProperty).toHaveBeenCalledWith(
            'visited-country-fill',
            'visibility',
            'none'
        );
    });

    it('toggles the friends overlay layer', async () => {
        renderMap(<MyMap />);
        await openStat(/1\s*friends/);
        await userEvent.click(
            screen.getByRole('button', { name: 'Hide friends on map' })
        );
        expect(mapbox.state.instance.setLayoutProperty).toHaveBeenCalledWith(
            FRIENDS_PINS,
            'visibility',
            'none'
        );
    });

    it('toggles the cities and places layers from their eyes', async () => {
        renderMap(<MyMap />);
        await openStat(/1\s*cities/);
        await userEvent.click(
            screen.getByRole('button', { name: 'Hide cities on map' })
        );
        expect(mapbox.state.instance.setLayoutProperty).toHaveBeenCalledWith(
            CITY_LAYER,
            'visibility',
            'none'
        );
        await openStat(/1\s*places/);
        await userEvent.click(
            screen.getByRole('button', { name: 'Hide places on map' })
        );
        expect(mapbox.state.instance.setLayoutProperty).toHaveBeenCalledWith(
            PLACE_LAYER,
            'visibility',
            'none'
        );
    });

    it('closes an open stat dropdown on Escape', async () => {
        renderMap(<MyMap />);
        await openStat(/2\s*countries/);
        expect(
            screen.getByRole('listbox', { name: 'countries' })
        ).toBeInTheDocument();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(
            screen.queryByRole('listbox', { name: 'countries' })
        ).not.toBeInTheDocument();
    });
});

describe('MyMap — desktop segmented toggles', () => {
    it('activates the Flat and Day segmented buttons', async () => {
        renderMap(<MyMap />);
        // Start on globe so clicking Flat is a real change; Day is already
        // active but its onClick still fires.
        await userEvent.click(screen.getByRole('button', { name: 'Globe' }));
        await userEvent.click(screen.getByRole('button', { name: 'Flat' }));
        expect(mapbox.state.instance.setProjection).toHaveBeenCalledWith(
            'mercator'
        );
        await userEvent.click(screen.getByRole('button', { name: 'Night' }));
        await userEvent.click(screen.getByRole('button', { name: 'Day' }));
        expect(mapbox.state.instance.setStyle).toHaveBeenCalledWith(
            'mapbox://styles/mapbox/light-v11'
        );
    });
});

describe('MyMap — mobile layers menu', () => {
    it('toggles every layer and flies to a selection', async () => {
        renderMap(<MyMap />);
        // Total = 2 countries + 1 city + 1 place + 1 friend = 5.
        await userEvent.click(screen.getByRole('button', { name: /Layers/ }));
        for (const label of ['Countries', 'Cities', 'Places', 'Friends']) {
            await userEvent.click(
                screen.getByRole('button', { name: `Hide ${label}` })
            );
        }
        // Drill into Countries and pick one → fly-to + menu closes.
        await userEvent.click(
            screen.getByRole('button', { name: /Countries 2/ })
        );
        await userEvent.click(
            screen.getByRole('button', { name: /United States/ })
        );
        expect(mapbox.state.instance.querySourceFeatures).toHaveBeenCalled();
    });

    it('flies to a friend country selected from the layers menu', async () => {
        renderMap(<MyMap />);
        await userEvent.click(screen.getByRole('button', { name: /Layers/ }));
        await userEvent.click(
            screen.getByRole('button', { name: /Friends 1/ })
        );
        await userEvent.click(screen.getByRole('button', { name: /France/ }));
        expect(mapbox.state.instance.querySourceFeatures).toHaveBeenCalled();
    });
});

describe('MyMap — dropdown fly-to + selection', () => {
    it('selects a country and opens its trip panel', async () => {
        renderMap(<MyMap />);
        // Return a boundary polygon so flyToCountry uses the bounds path.
        mapbox.state.instance.querySourceFeatures.mockReturnValue([
            {
                geometry: {
                    type: 'Polygon',
                    coordinates: [[[0, 0], [1, 1], [2, 2], [0, 0]]],
                },
            },
        ]);
        await openStat(/2\s*countries/);
        await userEvent.click(
            screen.getByRole('button', { name: /Costa Rica/ })
        );
        expect(mapbox.state.instance.fitBounds).toHaveBeenCalled();
        // Trip panel for Costa Rica (place has a live trip).
        const panel = screen.getByRole('complementary', {
            name: /Costa Rica/,
        });
        const tripLink = within(panel).getByRole('link', {
            name: /Costa Rica Trip/,
        });
        expect(tripLink).toHaveAttribute('href', '/trip-detail?id=t1');
        // Hover previews the trip pin.
        await userEvent.hover(tripLink);
        expect(mapbox.ctors.Popup).toHaveBeenCalled();
        // Close the panel.
        await userEvent.click(
            within(panel).getByRole('button', { name: 'Close trips panel' })
        );
        expect(
            screen.queryByRole('link', { name: /Costa Rica Trip/ })
        ).not.toBeInTheDocument();
    });

    it('surfaces the per-continent completion stat for a selected country', async () => {
        renderMap(<MyMap />);
        await openStat(/2\s*countries/);
        await userEvent.click(
            screen.getByRole('button', { name: /United States/ })
        );
        const card = screen.getByRole('complementary', {
            name: 'Your travel atlas summary',
        });
        expect(within(card).getByText('North America')).toBeInTheDocument();
        expect(within(card).getByText('1/16')).toBeInTheDocument();
    });

    it('flies to a city selected from the cities dropdown', async () => {
        renderMap(<MyMap />);
        await openStat(/1\s*cities/);
        await userEvent.click(screen.getByRole('button', { name: /Quepos/ }));
        expect(mapbox.state.instance.flyTo).toHaveBeenCalledWith(
            expect.objectContaining({ zoom: 10 })
        );
    });

    it('flies to a place and opens its popup after the animation', () => {
        vi.useFakeTimers();
        try {
            renderMap(<MyMap />);
            fireEvent.click(screen.getByRole('button', { name: /1\s*places/ }));
            fireEvent.click(
                screen.getByRole('button', { name: /Manuel Antonio/ })
            );
            expect(mapbox.state.instance.flyTo).toHaveBeenCalledWith(
                expect.objectContaining({ zoom: 13 })
            );
            act(() => {
                vi.advanceTimersByTime(900);
            });
            expect(mapbox.ctors.Popup).toHaveBeenCalled();
        } finally {
            vi.useRealTimers();
        }
    });

    it('flies to a friend country from the friends dropdown', async () => {
        renderMap(<MyMap />);
        await openStat(/1\s*friends/);
        await userEvent.click(screen.getByRole('button', { name: /France/ }));
        expect(mapbox.state.instance.querySourceFeatures).toHaveBeenCalled();
    });
});

describe('MyMap — map event handlers', () => {
    const render = () => renderMap(<MyMap />);

    it('handles a country shading click (selection + fly)', () => {
        render();
        act(() =>
            mapbox.fire('click', 'visited-country-fill', {
                point: { x: 1, y: 1 },
                lngLat: { lng: -100, lat: 40 },
                features: [{ id: 1, properties: { iso_3166_1: 'US' } }],
            })
        );
        const card = screen.getByRole('complementary', {
            name: 'Your travel atlas summary',
        });
        expect(within(card).getByText('North America')).toBeInTheDocument();
    });

    it('ignores a country click that lands on a pin', () => {
        render();
        const inst = mapbox.state.instance;
        inst.queryRenderedFeatures.mockReturnValueOnce([{ id: 'p-ma' }]);
        act(() =>
            mapbox.fire('click', 'visited-country-fill', {
                point: { x: 1, y: 1 },
                lngLat: { lng: -100, lat: 40 },
                features: [{ id: 1, properties: { iso_3166_1: 'US' } }],
            })
        );
        // No continent stat — the click was suppressed.
        const card = screen.getByRole('complementary', {
            name: 'Your travel atlas summary',
        });
        expect(within(card).queryByText('North America')).not.toBeInTheDocument();
    });

    it('handles country hover + leave feature-state', () => {
        render();
        const inst = mapbox.state.instance;
        act(() =>
            mapbox.fire('mousemove', 'visited-country-fill', {
                features: [{ id: 7 }],
            })
        );
        act(() => mapbox.fire('mouseleave', 'visited-country-fill', {}));
        expect(inst.setFeatureState).toHaveBeenCalled();
    });

    it('opens a place popup from a pin click (single-trip branch)', () => {
        render();
        act(() =>
            mapbox.fire('click', PLACE_LAYER, {
                lngLat: { lng: -84, lat: 9 },
                features: [
                    {
                        id: 'p-ma',
                        properties: {
                            id: 'p-ma',
                            name: 'Manuel Antonio',
                            city: 'Quepos',
                            country: 'Costa Rica',
                            source: 'itinerary',
                            visitedAt: '2026-02-03T00:00:00Z',
                            trips: JSON.stringify([
                                { tripId: 't1', tripName: 'CR Trip', visitedAt: '2026-02-03T00:00:00Z' },
                            ]),
                        },
                    },
                ],
            })
        );
        expect(mapbox.ctors.Popup).toHaveBeenCalled();
    });

    it('renders the multi-trip, no-trip, and malformed-trip popup branches', () => {
        render();
        const clickPlace = (props: Record<string, unknown>) =>
            act(() =>
                mapbox.fire('click', PLACE_LAYER, {
                    lngLat: { lng: -84, lat: 9 },
                    features: [{ id: props.id, properties: props }],
                })
            );
        // 2+ trips → inline list.
        clickPlace({
            id: 'p-ma',
            name: 'Manuel Antonio',
            city: 'Quepos',
            country: 'Costa Rica',
            source: 'manual',
            visitedAt: '2026-02-03T00:00:00Z',
            trips: JSON.stringify([
                { tripId: 't1', tripName: 'Trip A', visitedAt: '2026-02-03T00:00:00Z' },
                { tripId: 't2', tripName: '', visitedAt: 'not-a-date' },
            ]),
        });
        // 0 trips + no location/source → bare popup.
        clickPlace({ id: 'p2', name: 'Nowhere', city: '', country: '', trips: JSON.stringify([]) });
        // Malformed trips JSON → catch branch.
        clickPlace({ id: 'p3', name: 'Broken', city: 'X', country: 'Y', trips: 'not-json' });
        expect(mapbox.ctors.Popup).toHaveBeenCalledTimes(3);
    });

    it('opens a city popup from a city pin click', () => {
        render();
        act(() =>
            mapbox.fire('click', CITY_LAYER, {
                lngLat: { lng: -84, lat: 9 },
                features: [
                    {
                        id: 'quepos-cr',
                        properties: {
                            id: 'quepos-cr',
                            cityName: 'Quepos',
                            countryName: 'Costa Rica',
                            countryCode: 'CR',
                            source: 'manual',
                            visitedAt: '2026-02-03T00:00:00Z',
                        },
                    },
                ],
            })
        );
        expect(mapbox.ctors.Popup).toHaveBeenCalled();
    });

    it('handles pin hover + leave', () => {
        render();
        const inst = mapbox.state.instance;
        act(() =>
            mapbox.fire('mousemove', PLACE_LAYER, { features: [{ id: 'p-ma' }] })
        );
        act(() => mapbox.fire('mouseleave', PLACE_LAYER, {}));
        expect(inst.setFeatureState).toHaveBeenCalled();
    });

    it('handles a friends country click (you-visited branch)', () => {
        render();
        // US is in the user's own visited set → "You" prefix branch.
        act(() =>
            mapbox.fire('click', FRIENDS_FILL, {
                point: { x: 1, y: 1 },
                lngLat: { lng: -100, lat: 40 },
                features: [{ properties: { iso_3166_1: 'US' } }],
            })
        );
        // FR has a friends group → names branch.
        act(() =>
            mapbox.fire('click', FRIENDS_FILL, {
                point: { x: 1, y: 1 },
                lngLat: { lng: 2, lat: 48 },
                features: [{ properties: { iso_3166_1: 'FR' } }],
            })
        );
        expect(mapbox.ctors.Popup).toHaveBeenCalledTimes(2);
    });

    it('handles a friends pin click + enter/leave', () => {
        render();
        act(() =>
            mapbox.fire('click', FRIENDS_PINS, {
                lngLat: { lng: 2, lat: 48 },
                features: [
                    {
                        properties: {
                            title: 'Paris',
                            sub: 'France',
                            friendNames: 'Luis, Joanna',
                        },
                    },
                ],
            })
        );
        act(() => mapbox.fire('mouseenter', FRIENDS_PINS, {}));
        act(() => mapbox.fire('mouseleave', FRIENDS_PINS, {}));
        expect(mapbox.ctors.Popup).toHaveBeenCalled();
    });

    it('guards against malformed / empty map events', () => {
        render();
        const inst = mapbox.state.instance;
        const fires = [
            // country click: no feature, then a feature with no ISO code.
            () => mapbox.fire('click', 'visited-country-fill', {
                point: { x: 1, y: 1 }, lngLat: { lng: 0, lat: 0 }, features: [],
            }),
            () => mapbox.fire('click', 'visited-country-fill', {
                point: { x: 1, y: 1 }, lngLat: { lng: 0, lat: 0 },
                features: [{ id: 9, properties: {} }],
            }),
            // country move with no feature id.
            () => mapbox.fire('mousemove', 'visited-country-fill', { features: [{}] }),
            // place + city clicks with no feature / minimal (all-nullish) props.
            () => mapbox.fire('click', PLACE_LAYER, { lngLat: { lng: 0, lat: 0 }, features: [] }),
            () => mapbox.fire('click', PLACE_LAYER, {
                lngLat: { lng: 0, lat: 0 }, features: [{ properties: {} }],
            }),
            () => mapbox.fire('click', CITY_LAYER, { lngLat: { lng: 0, lat: 0 }, features: [] }),
            () => mapbox.fire('click', CITY_LAYER, {
                lngLat: { lng: 0, lat: 0 }, features: [{ properties: {} }],
            }),
            // pin move with no id.
            () => mapbox.fire('mousemove', PLACE_LAYER, { features: [{}] }),
            // friends country + pin clicks with no feature / no iso.
            () => mapbox.fire('click', FRIENDS_FILL, {
                point: { x: 1, y: 1 }, lngLat: { lng: 0, lat: 0 }, features: [],
            }),
            () => mapbox.fire('click', FRIENDS_FILL, {
                point: { x: 1, y: 1 }, lngLat: { lng: 0, lat: 0 },
                features: [{ properties: {} }],
            }),
            () => mapbox.fire('click', FRIENDS_PINS, { lngLat: { lng: 0, lat: 0 }, features: [] }),
        ];
        act(() => fires.forEach((f) => f()));
        expect(inst.setFeatureState).toBeDefined();
    });

    it('flies to a country via the coordinate-average fallback', () => {
        render();
        // querySourceFeatures returns [] (default) → flyToCountry falls back to
        // averaging the visited-place coords in that country (Costa Rica).
        act(() =>
            mapbox.fire('click', 'visited-country-fill', {
                point: { x: 9, y: 9 },
                lngLat: { lng: -84, lat: 9 },
                features: [{ id: 2, properties: { iso_3166_1: 'CR' } }],
            })
        );
        expect(mapbox.state.instance.flyTo).toHaveBeenCalled();
    });

    it('opens a city popup from an itinerary-sourced pin', () => {
        render();
        act(() =>
            mapbox.fire('click', CITY_LAYER, {
                lngLat: { lng: -84, lat: 9 },
                features: [
                    {
                        id: 'quepos-cr',
                        properties: {
                            id: 'quepos-cr',
                            cityName: 'Quepos',
                            countryName: 'Costa Rica',
                            countryCode: 'CR',
                            source: 'itinerary',
                            visitedAt: '2026-02-03T00:00:00Z',
                        },
                    },
                ],
            })
        );
        expect(mapbox.ctors.Popup).toHaveBeenCalled();
    });
});

describe('MyMap — About panel + toggle pills', () => {
    it('opens the About intro from the title help button', async () => {
        renderMap(<MyMap />);
        await userEvent.click(
            screen.getByRole('button', { name: 'About Travel Atlas' })
        );
        expect(
            screen.getByRole('heading', { name: 'Your travel atlas' })
        ).toBeInTheDocument();
    });

    it('swaps between the Stats card and the About card via the pills', async () => {
        renderMap(<MyMap />);
        // Stats open by default → close it to reveal the pills.
        await userEvent.click(screen.getByRole('button', { name: 'Hide stats' }));
        // Pills now visible. Two buttons share the "About Travel Atlas" name
        // (the title-bar help icon + the About pill); the pill is the one that
        // also renders the visible "About" text.
        const aboutButtons = screen.getAllByRole('button', {
            name: 'About Travel Atlas',
        });
        const aboutPill = aboutButtons.find((b) =>
            b.textContent?.includes('About')
        );
        await userEvent.click(aboutPill as HTMLElement);
        expect(
            screen.getByRole('heading', { name: 'Your travel atlas' })
        ).toBeInTheDocument();
        // Dismiss the About card.
        await userEvent.click(screen.getByRole('button', { name: 'Hide intro' }));
        // Reopen the stats from its pill.
        await userEvent.click(screen.getByRole('button', { name: 'Travel stats' }));
        expect(
            screen.getByRole('complementary', {
                name: 'Your travel atlas summary',
            })
        ).toBeInTheDocument();
    });
});

describe('MyMap — trips panel place overflow', () => {
    it('collapses a trip with more than six places into "+N more"', async () => {
        const many = Array.from({ length: 7 }, (_, i) =>
            place({ id: `p${i}`, placeName: `Place ${i + 1}`, placeKey: `place-${i}` })
        );
        mockPlaces = dataState(many);
        renderMap(<MyMap />);
        // Default US country + the 7 Costa Rica places → 2 country options.
        await openStat(/2\s*countries/);
        await userEvent.click(
            screen.getByRole('button', { name: /Costa Rica/ })
        );
        expect(screen.getByText('+ 1 more')).toBeInTheDocument();
    });
});

describe('MyMap — empty + edge states', () => {
    it('renders zeroed stats and empty dropdown hints with no visits', async () => {
        mockCountries = dataState([]);
        mockCities = dataState([]);
        mockPlaces = dataState([]);
        mockFriends = { data: { countries: [], cities: [], places: [] } };
        mockTrips = { data: undefined };
        mockUser = proUser({ homeLatitude: null, homeLongitude: null });
        renderMap(<MyMap />);
        const card = screen.getByRole('complementary', {
            name: 'Your travel atlas summary',
        });
        expect(within(card).getByText('0/195')).toBeInTheDocument();
        expect(within(card).getByText('New Explorer')).toBeInTheDocument();
        // No furthest row without home coords.
        expect(within(card).queryByText(/mi from home/)).not.toBeInTheDocument();
        await openStat(/0\s*countries/);
        expect(
            screen.getByText('No visited countries yet.')
        ).toBeInTheDocument();
    });

    it('disables city/place dropdown options that lack coordinates', async () => {
        mockCities = dataState([
            city({ id: 'c-borrow', citySlug: 'borrow-cr', cityName: 'Jaco', latitude: null, longitude: null }),
            city({ id: 'c-none', citySlug: 'none-cr', cityName: 'Limon', countryCode: 'CR', latitude: null, longitude: null }),
        ]);
        // A place in Jaco lends coordinates to that city (borrowed-coords path).
        mockPlaces = dataState([
            place({ id: 'p-jaco', placeName: 'Jaco Beach', placeCity: 'Jaco', countryCode: 'CR' }),
            place({ id: 'p-noco', placeName: 'No Coords', latitude: null, longitude: null }),
        ]);
        renderMap(<MyMap />);
        await openStat(/2\s*cities/);
        // Limon has neither native nor borrowed coords → disabled.
        expect(
            screen.getByRole('button', { name: /Limon/ })
        ).toBeDisabled();
        // Jaco borrowed coords → enabled + flies on select.
        await userEvent.click(screen.getByRole('button', { name: /Jaco/ }));
        expect(mapbox.state.instance.flyTo).toHaveBeenCalled();
    });

    it('renders the setup hint when the Mapbox token is missing', async () => {
        vi.resetModules();
        vi.stubEnv('VITE_MAPBOX_TOKEN', '');
        const { default: MyMapNoToken } = await import('./index');
        renderWithProviders(<MyMapNoToken />);
        expect(screen.getByText('Map setup needed')).toBeInTheDocument();
        expect(screen.getByText('VITE_MAPBOX_TOKEN')).toBeInTheDocument();
        vi.unstubAllEnvs();
    });
});
