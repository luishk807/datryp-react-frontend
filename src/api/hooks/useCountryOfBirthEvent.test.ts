import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import { countryOfBirthEventWireFixture } from '../../test/fixtures/countryOfBirthEvent';
import { activeLang } from 'i18n';
import { useCountryOfBirthEvent } from './useCountryOfBirthEvent';

// Gated on a signed-in user whose `countryOfBirthCode` is set.
let mockUser: { id: string; countryOfBirthCode?: string | null } | null = {
    id: 'u1',
    countryOfBirthCode: 'CO',
};
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

const ENDPOINT = 'http://localhost:8000/me/country-of-birth-event';

beforeEach(() => {
    mockUser = { id: 'u1', countryOfBirthCode: 'CO' };
});

describe('useCountryOfBirthEvent', () => {
    it('fetches + reshapes the event payload', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(countryOfBirthEventWireFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useCountryOfBirthEvent()
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.event).toMatchObject({
            name: 'Carnaval de Barranquilla',
            startDate: '2027-02-13',
            hostCountry: 'Colombia',
        });
        expect(result.current.data?.places[0]).toMatchObject({
            name: 'Barranquilla',
            countryCode: 'CO',
        });
    });

    it('maps a 204 (no event) to null data', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 204 }))
        );
        const { result } = renderHookWithProviders(() =>
            useCountryOfBirthEvent()
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeNull();
    });

    it('forwards the active language to the backend', async () => {
        let requestUrl = '';
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(countryOfBirthEventWireFixture);
            })
        );
        const { result } = renderHookWithProviders(() =>
            useCountryOfBirthEvent()
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(new URL(requestUrl).searchParams.get('lang')).toBe(activeLang());
    });

    it('is disabled when the user has no country of birth (no request)', () => {
        mockUser = { id: 'u1', countryOfBirthCode: null };
        const { result } = renderHookWithProviders(() =>
            useCountryOfBirthEvent()
        );
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('is disabled when logged out (no request)', () => {
        mockUser = null;
        const { result } = renderHookWithProviders(() =>
            useCountryOfBirthEvent()
        );
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('surfaces an error on a non-204 failure', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() =>
            useCountryOfBirthEvent()
        );
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
