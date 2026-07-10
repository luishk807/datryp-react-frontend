import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import {
    placeDetailsResponseWire,
    proseWire,
    listsWire,
    factsWire,
} from '../../test/fixtures/placeRecommendations';
import {
    usePlaceDetails,
    usePlaceProse,
    usePlaceLists,
    usePlaceFacts,
    usePlaceDetailsProgressive,
} from './usePlaceDetails';

const BASE = 'http://localhost:8000';

describe('usePlaceDetails', () => {
    it('stays idle (no request) for a blank query', () => {
        const { result } = renderHookWithProviders(() =>
            usePlaceDetails('', 0)
        );
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('stays idle while `ready` is false even with a valid query', () => {
        const { result } = renderHookWithProviders(() =>
            usePlaceDetails('kyoto', 0, false)
        );
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('fetches + reshapes the composed detail payload', async () => {
        server.use(
            http.get(`${BASE}/place-details`, () =>
                HttpResponse.json(placeDetailsResponseWire)
            )
        );
        const { result } = renderHookWithProviders(() =>
            usePlaceDetails('kyoto', 0)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.query).toBe('Kyoto, Japan');
        expect(result.current.data?.index).toBe(0);
        expect(result.current.data?.details.longDescription).toBe(
            'A long description of Kyoto.'
        );
        expect(result.current.data?.details.currency).toMatchObject({
            ratePerUsd: 150,
        });
    });

    it('forwards the query + index as q / i params', async () => {
        let requestUrl = '';
        server.use(
            http.get(`${BASE}/place-details`, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(placeDetailsResponseWire);
            })
        );
        const { result } = renderHookWithProviders(() =>
            usePlaceDetails('kyoto', 2)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        const params = new URL(requestUrl).searchParams;
        expect(params.get('q')).toBe('kyoto');
        expect(params.get('i')).toBe('2');
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.get(
                `${BASE}/place-details`,
                () => new HttpResponse(null, { status: 500 })
            )
        );
        const { result } = renderHookWithProviders(() =>
            usePlaceDetails('kyoto', 0)
        );
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe('usePlaceDetails slice hooks', () => {
    it('usePlaceProse returns the reshaped prose slice', async () => {
        server.use(
            http.get(`${BASE}/place-details/prose`, () =>
                HttpResponse.json({ prose: proseWire })
            )
        );
        const { result } = renderHookWithProviders(() =>
            usePlaceProse('kyoto', 0)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.longDescription).toBe(
            'A long description of Kyoto.'
        );
    });

    it('usePlaceLists returns the reshaped lists slice', async () => {
        server.use(
            http.get(`${BASE}/place-details/lists`, () =>
                HttpResponse.json({ lists: listsWire })
            )
        );
        const { result } = renderHookWithProviders(() =>
            usePlaceLists('kyoto', 0)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.foods?.[0].name).toBe('Sushi');
    });

    it('usePlaceFacts returns the reshaped facts slice', async () => {
        server.use(
            http.get(`${BASE}/place-details/facts`, () =>
                HttpResponse.json({ facts: factsWire })
            )
        );
        const { result } = renderHookWithProviders(() =>
            usePlaceFacts('kyoto', 0)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.currency).toMatchObject({
            ratePerUsd: 150,
        });
    });

    it('slice hook is disabled when not ready', () => {
        const { result } = renderHookWithProviders(() =>
            usePlaceProse('kyoto', 0, false)
        );
        expect(result.current.fetchStatus).toBe('idle');
    });
});

describe('usePlaceDetailsProgressive', () => {
    it('merges prose + lists + facts as the slices resolve', async () => {
        server.use(
            http.get(`${BASE}/place-details/prose`, () =>
                HttpResponse.json({ prose: proseWire })
            ),
            http.get(`${BASE}/place-details/lists`, () =>
                HttpResponse.json({ lists: listsWire })
            ),
            http.get(`${BASE}/place-details/facts`, () =>
                HttpResponse.json({ facts: factsWire })
            )
        );
        const { result } = renderHookWithProviders(() =>
            usePlaceDetailsProgressive('kyoto', 0)
        );
        await waitFor(() => expect(result.current.factsLoading).toBe(false));
        expect(result.current.details.longDescription).toBeTruthy();
        expect(result.current.details.foods?.[0].name).toBe('Sushi');
        expect(result.current.details.currency?.code).toBe('JPY');
        expect(result.current.isError).toBe(false);
    });

    it('fires no request and stays empty when not ready', () => {
        const { result } = renderHookWithProviders(() =>
            usePlaceDetailsProgressive('kyoto', 0, false)
        );
        expect(result.current.details).toEqual({});
        expect(result.current.isError).toBe(false);
    });
});
