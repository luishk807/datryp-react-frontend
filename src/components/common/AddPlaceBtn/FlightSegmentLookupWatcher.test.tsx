import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, waitFor } from '../../../test/renderWithProviders';
import FlightSegmentLookupWatcher from './FlightSegmentLookupWatcher';

// Mirror the real hook's enable gate (≥3 chars + YYYY-MM-DD) so the watcher's
// on-mount empty state doesn't return data before the debounce settles.
let mockData: unknown = null;
let mockFetching = false;
let mockSuccess = true;

vi.mock('api/hooks/useFlightLookup', () => ({
    useFlightLookup: (number: string, date: string) => {
        const enabled =
            number.trim().length >= 3 && /^\d{4}-\d{2}-\d{2}$/.test(date);
        return {
            data: enabled ? mockData : undefined,
            isFetching: enabled ? mockFetching : false,
            isSuccess: enabled ? mockSuccess : false,
        };
    },
}));

const flightResult = {
    flightNumber: 'UA123',
    departAirport: 'SFO',
    arrivalAirport: 'JFK',
    departDate: '2026-08-15',
    departTime: '08:00',
    arrivalDate: '2026-08-15',
    arrivalTime: '16:30',
    airline: 'United',
};

beforeEach(() => {
    mockData = null;
    mockFetching = false;
    mockSuccess = true;
});

describe('FlightSegmentLookupWatcher', () => {
    it('fires onResult with the mapped lookup once the query settles', async () => {
        mockData = flightResult;
        const onResult = vi.fn();
        renderWithProviders(
            <FlightSegmentLookupWatcher
                flightNumber="UA123"
                departDate="2026-08-15"
                onResult={onResult}
            />
        );
        await waitFor(
            () => expect(onResult).toHaveBeenCalledWith(flightResult),
            { timeout: 2000 }
        );
    });

    it('fires onNotFound with the queried number when the lookup settles empty', async () => {
        mockData = null;
        mockSuccess = true;
        const onResult = vi.fn();
        const onNotFound = vi.fn();
        renderWithProviders(
            <FlightSegmentLookupWatcher
                flightNumber="UA123"
                departDate="2026-08-15"
                onResult={onResult}
                onNotFound={onNotFound}
            />
        );
        await waitFor(
            () => expect(onNotFound).toHaveBeenCalledWith('UA123'),
            { timeout: 2000 }
        );
        expect(onResult).not.toHaveBeenCalled();
    });

    it('forwards isFetching through onLoadingChange', async () => {
        mockData = flightResult;
        mockFetching = true;
        const onLoadingChange = vi.fn();
        renderWithProviders(
            <FlightSegmentLookupWatcher
                flightNumber="UA123"
                departDate="2026-08-15"
                onResult={vi.fn()}
                onLoadingChange={onLoadingChange}
            />
        );
        await waitFor(
            () => expect(onLoadingChange).toHaveBeenCalledWith(true),
            { timeout: 2000 }
        );
    });

    it('stays disabled (no callbacks) for a too-short flight number', async () => {
        mockData = flightResult;
        const onResult = vi.fn();
        const onNotFound = vi.fn();
        renderWithProviders(
            <FlightSegmentLookupWatcher
                flightNumber="AB"
                departDate="2026-08-15"
                onResult={onResult}
                onNotFound={onNotFound}
            />
        );
        await new Promise((r) => setTimeout(r, 900));
        expect(onResult).not.toHaveBeenCalled();
        expect(onNotFound).not.toHaveBeenCalled();
    });

    it('parses natural-language input to extract the flight number', async () => {
        mockData = { ...flightResult, flightNumber: 'BA245' };
        const onResult = vi.fn();
        renderWithProviders(
            <FlightSegmentLookupWatcher
                flightNumber="my flight is BA245 tomorrow"
                departDate="2026-08-15"
                onResult={onResult}
            />
        );
        await waitFor(() => expect(onResult).toHaveBeenCalled(), {
            timeout: 2000,
        });
    });

    it('does not re-fire onResult for the same (number, date) key', async () => {
        mockData = flightResult;
        const onResult = vi.fn();
        const { rerender } = renderWithProviders(
            <FlightSegmentLookupWatcher
                flightNumber="UA123"
                departDate="2026-08-15"
                onResult={onResult}
            />
        );
        await waitFor(() => expect(onResult).toHaveBeenCalledTimes(1), {
            timeout: 2000,
        });
        // New data object identity, same debounced key → dedup guard holds.
        mockData = { ...flightResult };
        rerender(
            <FlightSegmentLookupWatcher
                flightNumber="UA123"
                departDate="2026-08-15"
                onResult={onResult}
            />
        );
        await new Promise((r) => setTimeout(r, 500));
        expect(onResult).toHaveBeenCalledTimes(1);
    });
});
