import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
} from '../../../../test/renderWithProviders';
import { ACTIVITY_KIND } from 'constants';
import type { Country, FlightInfo, TransitInfo } from 'types';
import type { CountrySource, TransportDraft } from '../types';
import TransportResolver from './index';

// ---- Mocked data hooks (MSW would otherwise error on any real request) ----
let mockAirportData: { items: Array<{ iataCode: string; country: string }> };
let mockCountryMatches:
    | Array<{
          id: number;
          name: string;
          code: string;
          local: string | null;
          image: string | null;
      }>
    | undefined;
let mockRouteMap: Record<string, string>;

vi.mock('api/hooks/useAirports', () => ({
    useAirports: (q: string) => ({ data: q && q.trim() ? mockAirportData : undefined }),
}));
vi.mock('api/hooks/useCountries', () => ({
    useCountries: (
        query: string,
        opts?: { enabled?: boolean; limit?: number }
    ) => ({
        data:
            opts && opts.enabled === false
                ? undefined
                : query && query.trim()
                  ? mockCountryMatches
                  : undefined,
    }),
}));
vi.mock('api/hooks/useDestinationAirport', () => ({
    useDestinationAirport: (q: string | undefined, enabled: boolean) => ({
        data:
            enabled && q
                ? (mockRouteMap[q.trim().toLowerCase()] ?? null)
                : undefined,
    }),
}));

// The lookup watchers pull their own network hooks; stub them to markers that
// expose their result / not-found callbacks so we can drive the apply/clear
// paths without any real fetch.
vi.mock('components/common/AddPlaceBtn/FlightSegmentLookupWatcher', () => ({
    default: ({
        onResult,
        onNotFound,
    }: {
        onResult: (r: Partial<FlightInfo>) => void;
        onNotFound: (n: string) => void;
    }) => (
        <div data-testid="flight-watcher">
            <button
                type="button"
                onClick={() =>
                    onResult({
                        departAirport: 'AAA',
                        arrivalAirport: 'BBB',
                        departDate: '2026-07-01',
                    })
                }
            >
                flw-result
            </button>
            <button
                type="button"
                onClick={() =>
                    onResult({
                        departAirport: 'CCC',
                        arrivalAirport: 'DDD',
                        departDate: '2026-07-02',
                        departTime: '08:00',
                        arrivalDate: '2026-07-02',
                        arrivalTime: '11:00',
                    })
                }
            >
                flw-result-full
            </button>
            <button type="button" onClick={() => onNotFound('UA999')}>
                flw-notfound
            </button>
        </div>
    ),
}));
vi.mock('components/common/AddPlaceBtn/TransitSegmentLookupWatcher', () => ({
    default: ({
        onResult,
    }: {
        onResult: (r: Partial<TransitInfo>) => void;
    }) => (
        <div data-testid="transit-watcher">
            <button
                type="button"
                onClick={() =>
                    onResult({ operator: 'Renfe', number: '3152' })
                }
            >
                tlw-result
            </button>
            <button
                type="button"
                onClick={() =>
                    onResult({
                        operator: 'Amtrak',
                        number: '99',
                        departStation: 'NYP',
                        arrivalStation: 'WAS',
                        departDate: '2026-07-02',
                        departTime: '08:00',
                        arrivalDate: '2026-07-02',
                        arrivalTime: '11:00',
                    })
                }
            >
                tlw-result-full
            </button>
        </div>
    ),
}));

const seg = (date: string): FlightInfo & TransitInfo => ({
    departDate: date,
    arrivalDate: date,
});

const baseDraft = (over: Partial<TransportDraft> = {}): TransportDraft => ({
    kind: ACTIVITY_KIND.FLIGHT,
    smartText: '',
    flightSegments: [],
    transitSegments: [],
    cost: '',
    ...over,
});

const Harness = ({
    initial,
    initialCountry = null,
    countrySource = null,
    onCountryChange,
}: {
    initial: TransportDraft;
    initialCountry?: Country | null;
    countrySource?: CountrySource;
    onCountryChange?: (c: Country, source: 'airport' | 'text') => void;
}) => {
    const [transport, setTransport] = useState<TransportDraft>(initial);
    const [country, setCountry] = useState<Country | null>(initialCountry);
    const [lookupNotFound, setLookupNotFound] = useState<
        Record<number, string>
    >({});
    return (
        <>
            <TransportResolver
                transport={transport}
                setTransport={setTransport}
                country={country}
                countrySource={countrySource}
                isoDefaultDate="2026-06-06"
                emptyFlightSegment={seg}
                emptyTransitSegment={seg}
                setLookupNotFound={setLookupNotFound}
                onCountryChange={(c, source) => {
                    setCountry(c);
                    onCountryChange?.(c, source);
                }}
            />
            <pre data-testid="transport">{JSON.stringify(transport)}</pre>
            <pre data-testid="notfound">{JSON.stringify(lookupNotFound)}</pre>
        </>
    );
};

const transportDump = () =>
    JSON.parse(
        screen.getByTestId('transport').textContent || '{}'
    ) as TransportDraft;
const notFoundDump = () =>
    JSON.parse(screen.getByTestId('notfound').textContent || '{}') as Record<
        number,
        string
    >;

beforeEach(() => {
    mockAirportData = { items: [] };
    mockCountryMatches = undefined;
    mockRouteMap = {};
});

describe('AddDestination/TransportResolver', () => {
    it('renders nothing for the "add later" (no kind) draft', () => {
        const onCountryChange = vi.fn();
        renderWithProviders(
            <Harness
                initial={baseDraft({ kind: null })}
                onCountryChange={onCountryChange}
            />
        );
        expect(screen.queryByTestId('flight-watcher')).not.toBeInTheDocument();
        expect(screen.queryByTestId('transit-watcher')).not.toBeInTheDocument();
        expect(onCountryChange).not.toHaveBeenCalled();
    });

    it('mounts one flight watcher per segment', () => {
        renderWithProviders(
            <Harness
                initial={baseDraft({
                    flightSegments: [{ flightNumber: 'UA1' }, {}],
                })}
                countrySource="user"
            />
        );
        expect(screen.getAllByTestId('flight-watcher')).toHaveLength(2);
        expect(screen.queryByTestId('transit-watcher')).not.toBeInTheDocument();
    });

    it('derives the destination country from a flight arrival airport', async () => {
        const onCountryChange = vi.fn();
        mockAirportData = { items: [{ iataCode: 'NRT', country: 'Japan' }] };
        mockCountryMatches = [
            { id: 1, name: 'Japan', code: 'JP', local: null, image: null },
        ];
        renderWithProviders(
            <Harness
                initial={baseDraft({
                    flightSegments: [
                        { flightNumber: 'CM123', arrivalAirport: 'NRT' },
                    ],
                })}
                onCountryChange={onCountryChange}
            />
        );
        await waitFor(() =>
            expect(onCountryChange).toHaveBeenCalledWith(
                expect.objectContaining({ id: 1, name: 'Japan' }),
                'airport'
            )
        );
    });

    it('derives the destination country from transit smart text', async () => {
        const onCountryChange = vi.fn();
        mockCountryMatches = [
            { id: 1, name: 'Japan', code: 'JP', local: null, image: null },
        ];
        renderWithProviders(
            <Harness
                initial={baseDraft({
                    kind: ACTIVITY_KIND.TRAIN,
                    smartText: 'trip to Japan',
                    transitSegments: [seg('2026-06-06')],
                })}
                onCountryChange={onCountryChange}
            />
        );
        await waitFor(() =>
            expect(onCountryChange).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'Japan' }),
                'text'
            )
        );
        expect(screen.getByTestId('transit-watcher')).toBeInTheDocument();
    });

    it('fills the arrival airport for a single typed destination', async () => {
        mockRouteMap = { bogota: 'BOG' };
        renderWithProviders(
            <Harness
                initial={baseDraft({
                    smartText: 'Bogota',
                    flightSegments: [{}],
                })}
            />
        );
        await waitFor(() =>
            expect(transportDump().flightSegments[0].arrivalAirport).toBe('BOG')
        );
    });

    it('builds a leg from a typed two-stop route', async () => {
        mockRouteMap = { panama: 'PTY', colombia: 'BOG' };
        renderWithProviders(
            <Harness
                initial={baseDraft({
                    smartText: 'Panama to Colombia',
                    flightSegments: [{}],
                })}
            />
        );
        await waitFor(() => {
            const seg0 = transportDump().flightSegments[0];
            expect(seg0.departAirport).toBe('PTY');
            expect(seg0.arrivalAirport).toBe('BOG');
        });
    });

    it('renders no watchers for a rental car (no lookup)', () => {
        renderWithProviders(
            <Harness
                initial={baseDraft({
                    kind: ACTIVITY_KIND.RENTAL_CAR,
                    transitSegments: [{}],
                })}
            />
        );
        expect(screen.queryByTestId('flight-watcher')).not.toBeInTheDocument();
        expect(screen.queryByTestId('transit-watcher')).not.toBeInTheDocument();
    });

    it('mounts a transit watcher for a bus', () => {
        renderWithProviders(
            <Harness
                initial={baseDraft({
                    kind: ACTIVITY_KIND.BUS,
                    transitSegments: [{}],
                })}
                countrySource="user"
            />
        );
        expect(screen.getByTestId('transit-watcher')).toBeInTheDocument();
    });

    it('leaves an already-resolved arrival airport untouched', async () => {
        mockRouteMap = { bogota: 'BOG' };
        renderWithProviders(
            <Harness
                initial={baseDraft({
                    smartText: 'Bogota',
                    flightSegments: [{ arrivalAirport: 'EOH' }],
                })}
                countrySource="user"
            />
        );
        // The single-stop resolver bails when the arrival side is already set.
        await new Promise((r) => setTimeout(r, 0));
        expect(transportDump().flightSegments[0].arrivalAirport).toBe('EOH');
    });

    it('applies a partial two-stop route (only the depart side resolves)', async () => {
        mockRouteMap = { bangkok: 'BKK' }; // "hoi an" has no airport
        renderWithProviders(
            <Harness
                initial={baseDraft({
                    smartText: 'Bangkok to Hoi An',
                    flightSegments: [{}],
                })}
                countrySource="user"
            />
        );
        await waitFor(() =>
            expect(transportDump().flightSegments[0].departAirport).toBe('BKK')
        );
        expect(
            transportDump().flightSegments[0].arrivalAirport
        ).toBeUndefined();
    });

    it('applies flight lookup results (partial + full) and tracks / clears not-found', async () => {
        renderWithProviders(
            <Harness
                initial={baseDraft({ flightSegments: [{}] })}
                countrySource="user"
            />
        );
        // Settled-empty first → tracked under the segment index.
        await userEvent.click(
            screen.getByRole('button', { name: 'flw-notfound' })
        );
        expect(notFoundDump()).toEqual({ 0: 'UA999' });

        // A partial result applies the route AND clears the not-found hint.
        await userEvent.click(
            screen.getByRole('button', { name: 'flw-result' })
        );
        expect(transportDump().flightSegments[0].departAirport).toBe('AAA');
        expect(transportDump().flightSegments[0].arrivalAirport).toBe('BBB');
        expect(notFoundDump()).toEqual({});

        // A full result overwrites every field (covers the non-fallback sides).
        await userEvent.click(
            screen.getByRole('button', { name: 'flw-result-full' })
        );
        expect(transportDump().flightSegments[0].arrivalTime).toBe('11:00');
    });

    it('applies transit lookup results (partial + full) to the segment', async () => {
        renderWithProviders(
            <Harness
                initial={baseDraft({
                    kind: ACTIVITY_KIND.TRAIN,
                    transitSegments: [{}],
                })}
                countrySource="user"
            />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'tlw-result' })
        );
        expect(transportDump().transitSegments[0].operator).toBe('Renfe');
        expect(transportDump().transitSegments[0].number).toBe('3152');

        await userEvent.click(
            screen.getByRole('button', { name: 'tlw-result-full' })
        );
        expect(transportDump().transitSegments[0].departStation).toBe('NYP');
        expect(transportDump().transitSegments[0].arrivalTime).toBe('11:00');
    });
});
