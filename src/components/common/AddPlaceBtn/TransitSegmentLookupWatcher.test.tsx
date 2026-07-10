import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, waitFor } from '../../../test/renderWithProviders';
import TransitSegmentLookupWatcher from './TransitSegmentLookupWatcher';

// Mirror the real hook's enable gate (operator + number both non-empty) so the
// on-mount empty debounced state doesn't return data before the debounce runs.
let mockData: unknown = null;
let mockFetching = false;
let mockSuccess = true;

vi.mock('api/hooks/useTransitLookup', () => ({
    useTransitLookup: (operator: string, number: string) => {
        const enabled =
            operator.trim().length > 0 && number.trim().length > 0;
        return {
            data: enabled ? mockData : undefined,
            isFetching: enabled ? mockFetching : false,
            isSuccess: enabled ? mockSuccess : false,
        };
    },
}));

const transitResult = {
    operator: 'Amtrak',
    number: '2151',
    departStation: 'New York Penn',
    arrivalStation: 'Washington Union',
    departTime: '09:00',
    arrivalTime: '12:30',
    departDate: '2026-08-15',
    arrivalDate: '2026-08-15',
    routeName: 'Northeast Regional',
};

beforeEach(() => {
    mockData = null;
    mockFetching = false;
    mockSuccess = true;
});

describe('TransitSegmentLookupWatcher', () => {
    it('fires onResult with the mapped schedule once the query settles', async () => {
        mockData = transitResult;
        const onResult = vi.fn();
        renderWithProviders(
            <TransitSegmentLookupWatcher
                operator="Amtrak"
                number="2151"
                kind="train"
                onResult={onResult}
            />
        );
        await waitFor(
            () => expect(onResult).toHaveBeenCalledWith(transitResult),
            { timeout: 2000 }
        );
    });

    it('fires onNotFound with "operator number" when the lookup settles empty', async () => {
        mockData = null;
        mockSuccess = true;
        const onResult = vi.fn();
        const onNotFound = vi.fn();
        renderWithProviders(
            <TransitSegmentLookupWatcher
                operator="Amtrak"
                number="2151"
                kind="train"
                onResult={onResult}
                onNotFound={onNotFound}
            />
        );
        await waitFor(
            () => expect(onNotFound).toHaveBeenCalledWith('Amtrak 2151'),
            { timeout: 2000 }
        );
        expect(onResult).not.toHaveBeenCalled();
    });

    it('forwards isFetching through onLoadingChange', async () => {
        mockData = transitResult;
        mockFetching = true;
        const onLoadingChange = vi.fn();
        renderWithProviders(
            <TransitSegmentLookupWatcher
                operator="Amtrak"
                number="2151"
                kind="train"
                onResult={vi.fn()}
                onLoadingChange={onLoadingChange}
            />
        );
        await waitFor(
            () => expect(onLoadingChange).toHaveBeenCalledWith(true),
            { timeout: 2000 }
        );
    });

    it('stays disabled (no callbacks) when the number is empty', async () => {
        mockData = transitResult;
        const onResult = vi.fn();
        const onNotFound = vi.fn();
        renderWithProviders(
            <TransitSegmentLookupWatcher
                operator="Amtrak"
                number=""
                kind="train"
                onResult={onResult}
                onNotFound={onNotFound}
            />
        );
        await new Promise((r) => setTimeout(r, 1000));
        expect(onResult).not.toHaveBeenCalled();
        expect(onNotFound).not.toHaveBeenCalled();
    });

    it('re-fires onResult when the kind (part of the key) changes', async () => {
        mockData = transitResult;
        const onResult = vi.fn();
        const { rerender } = renderWithProviders(
            <TransitSegmentLookupWatcher
                operator="Amtrak"
                number="2151"
                kind="train"
                onResult={onResult}
            />
        );
        await waitFor(() => expect(onResult).toHaveBeenCalledTimes(1), {
            timeout: 2000,
        });
        rerender(
            <TransitSegmentLookupWatcher
                operator="Amtrak"
                number="2151"
                kind="bus"
                onResult={onResult}
            />
        );
        await waitFor(() => expect(onResult).toHaveBeenCalledTimes(2), {
            timeout: 2000,
        });
    });
});
