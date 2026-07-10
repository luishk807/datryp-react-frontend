import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import {
    transitLookupResponseFixture,
    transitLookupNoMatchFixture,
} from '../../test/fixtures/transitLookup';
import { useTransitLookup } from './useTransitLookup';

const ENDPOINT = 'http://localhost:8000/transit/lookup';

describe('useTransitLookup', () => {
    it('stays idle when the operator is empty', () => {
        const { result } = renderHookWithProviders(() =>
            useTransitLookup('   ', '2151', 'train')
        );
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('stays idle when the number is empty', () => {
        const { result } = renderHookWithProviders(() =>
            useTransitLookup('Amtrak', '  ', 'train')
        );
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('stays idle when the caller-controlled enabled flag is false', () => {
        const { result } = renderHookWithProviders(() =>
            useTransitLookup('Amtrak', '2151', 'train', undefined, undefined, false)
        );
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('fetches + reshapes a matched transit leg', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(transitLookupResponseFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useTransitLookup('Amtrak', '2151', 'train')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toMatchObject({
            operator: 'Amtrak',
            number: '2151',
            departStation: 'New York Penn',
            arrivalStation: 'Washington Union',
            routeName: 'Acela',
        });
    });

    it('forwards operator, number, kind, country + depart_date params', async () => {
        let requestUrl = '';
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(transitLookupResponseFixture);
            })
        );
        const { result } = renderHookWithProviders(() =>
            useTransitLookup('Amtrak', '2151', 'train', 'US', '2026-09-01')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        const params = new URL(requestUrl).searchParams;
        expect(params.get('operator')).toBe('Amtrak');
        expect(params.get('number')).toBe('2151');
        expect(params.get('kind')).toBe('train');
        expect(params.get('country')).toBe('US');
        expect(params.get('depart_date')).toBe('2026-09-01');
    });

    it('resolves to null on a no-match response', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(transitLookupNoMatchFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useTransitLookup('Amtrak', '9999', 'train')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeNull();
    });

    it('fails soft (null, not error) when the backend fails', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() =>
            useTransitLookup('Amtrak', '2151', 'train')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeNull();
    });
});
