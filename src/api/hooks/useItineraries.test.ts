import { describe, it, expect, beforeEach, vi } from 'vitest';
import { graphql, HttpResponse } from 'msw';
import { act, waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import {
    renderHookWithProviders,
    makeTestQueryClient,
} from '../../test/renderWithProviders';
import { TripCapReachedError } from '../paywallError';
import {
    useMyItineraries,
    useSaveItinerary,
    useDeleteItinerary,
    isSingleDestination,
    isMultiDestination,
    type ApiItinerary,
} from './useItineraries';

// Itinerary endpoints on the PYTHON GraphQL backend (port 8000).
const pythonGql = graphql.link('http://localhost:8000/graphql');

// `useSaveItinerary.onSuccess` fires a PostHog event — stub the module so the
// test can assert the call without a real analytics client.
vi.mock('lib/posthog', () => ({ capture: vi.fn() }));
import { capture } from 'lib/posthog';

const ITINERARY = {
    id: 'i1',
    name: 'Japan',
    interaryType: { id: 't1', name: 'Single Destination Trip' },
    intenaryDates: [{ id: 'd1' }, { id: 'd2' }],
};

const SAVE_INPUT = {
    interaryTypeId: 't1',
    organizerIds: [],
    participantIds: [],
    days: [],
};

beforeEach(() => {
    vi.mocked(capture).mockClear();
});

describe('useMyItineraries', () => {
    it('unwraps `myItineraries.intineraries` into a flat list', async () => {
        server.use(
            pythonGql.query('MyItineraries', () =>
                HttpResponse.json({
                    data: {
                        myItineraries: { intineraries: [ITINERARY] },
                    },
                })
            )
        );
        const { result } = renderHookWithProviders(() => useMyItineraries());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([ITINERARY]);
    });

    it('is disabled (no request) when enabled is false', () => {
        const { result } = renderHookWithProviders(() =>
            useMyItineraries({ enabled: false })
        );
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('surfaces a GraphQL error', async () => {
        server.use(
            pythonGql.query('MyItineraries', () =>
                HttpResponse.json({ errors: [{ message: 'boom' }] })
            )
        );
        const { result } = renderHookWithProviders(() => useMyItineraries());
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe('useSaveItinerary', () => {
    it('saves, invalidates itineraries + notifications, and captures trip_saved', async () => {
        let variables: Record<string, unknown> | undefined;
        server.use(
            pythonGql.mutation('SaveItinerary', ({ variables: v }) => {
                variables = v;
                return HttpResponse.json({
                    data: { saveItinerary: ITINERARY },
                });
            })
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(() => useSaveItinerary(), {
            client,
        });

        await act(async () => {
            await result.current.mutateAsync(SAVE_INPUT);
        });

        await waitFor(() =>
            expect(result.current.data).toEqual(ITINERARY)
        );
        expect(variables).toEqual({ input: SAVE_INPUT });
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: ['myItineraries'],
        });
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: ['notifications'],
        });
        // create (no input.id) → is_new true; coarse props only.
        expect(capture).toHaveBeenCalledWith('trip_saved', {
            is_new: true,
            trip_type: 'Single Destination Trip',
            day_count: 2,
        });
    });

    it('rethrows a TRIP_CAP_REACHED paywall hit as TripCapReachedError', async () => {
        server.use(
            pythonGql.mutation('SaveItinerary', () =>
                HttpResponse.json({
                    errors: [
                        {
                            message: 'Trip limit reached',
                            extensions: {
                                code: 'TRIP_CAP_REACHED',
                                currentCount: 1,
                                cap: 1,
                            },
                        },
                    ],
                })
            )
        );
        const { result } = renderHookWithProviders(() => useSaveItinerary());

        let caught: unknown;
        await act(async () => {
            caught = await result.current
                .mutateAsync(SAVE_INPUT)
                .catch((e) => e);
        });
        expect(caught).toBeInstanceOf(TripCapReachedError);
        expect((caught as TripCapReachedError).currentCount).toBe(1);
        expect((caught as TripCapReachedError).cap).toBe(1);
    });

    it('rethrows a non-paywall GraphQL error unchanged', async () => {
        server.use(
            pythonGql.mutation('SaveItinerary', () =>
                HttpResponse.json({ errors: [{ message: 'validation' }] })
            )
        );
        const { result } = renderHookWithProviders(() => useSaveItinerary());
        await act(async () => {
            await expect(
                result.current.mutateAsync(SAVE_INPUT)
            ).rejects.toThrow();
        });
        expect(result.current.error).not.toBeInstanceOf(TripCapReachedError);
    });
});

describe('useDeleteItinerary', () => {
    it('accepts the legacy string id form (notifyParticipants defaults true)', async () => {
        let variables: Record<string, unknown> | undefined;
        server.use(
            pythonGql.mutation('DeleteItinerary', ({ variables: v }) => {
                variables = v;
                return HttpResponse.json({ data: { deleteItinerary: true } });
            })
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(
            () => useDeleteItinerary(),
            { client }
        );

        await act(async () => {
            await result.current.mutateAsync('i1');
        });

        await waitFor(() => expect(result.current.data).toBe(true));
        expect(variables).toEqual({ id: 'i1', notifyParticipants: true });
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: ['myItineraries'],
        });
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: ['notifications'],
        });
    });

    it('accepts the object form and forwards notifyParticipants', async () => {
        let variables: Record<string, unknown> | undefined;
        server.use(
            pythonGql.mutation('DeleteItinerary', ({ variables: v }) => {
                variables = v;
                return HttpResponse.json({ data: { deleteItinerary: true } });
            })
        );
        const { result } = renderHookWithProviders(() =>
            useDeleteItinerary()
        );

        await act(async () => {
            await result.current.mutateAsync({
                id: 'i2',
                notifyParticipants: false,
            });
        });

        await waitFor(() => expect(result.current.data).toBe(true));
        expect(variables).toEqual({ id: 'i2', notifyParticipants: false });
    });
});

describe('trip-type discriminators', () => {
    const single = {
        interaryType: { id: 't1', name: 'Single Destination Trip' },
    } as ApiItinerary;
    const multi = {
        interaryType: { id: 't2', name: 'Multi Destination Trip' },
    } as ApiItinerary;

    it('isSingleDestination matches only the single-trip type name', () => {
        expect(isSingleDestination(single)).toBe(true);
        expect(isSingleDestination(multi)).toBe(false);
    });

    it('isMultiDestination matches only the multi-trip type name', () => {
        expect(isMultiDestination(multi)).toBe(true);
        expect(isMultiDestination(single)).toBe(false);
    });
});
