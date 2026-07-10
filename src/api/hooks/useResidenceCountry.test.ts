import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import {
    geoLanguageEnFixture,
    geoLanguageNullFixture,
} from '../../test/fixtures/geoLanguage';
import { useResidenceCountry } from './useResidenceCountry';

// Derived hook: reads the saved home country from `useMyPreferences`, else
// falls back to the IP-geolocated country. Mock the preferences dep so a test
// can flip between "home saved" and "no home" without a real UserProvider.
let mockPrefs: { homeCountryCode: string | null } | undefined;
vi.mock('api/hooks/useMyPreferences', () => ({
    useMyPreferences: () => ({ data: mockPrefs }),
}));

const GEO = 'http://localhost:8000/geo/language';

beforeEach(() => {
    mockPrefs = undefined;
});

describe('useResidenceCountry', () => {
    it('returns the saved home country and never fetches geo', () => {
        mockPrefs = { homeCountryCode: 'PA' };
        // No MSW handler for /geo/language — the geo query is disabled
        // (`enabled: !home`), so a leaked request would fail the test.
        const { result } = renderHookWithProviders(() => useResidenceCountry());
        expect(result.current).toBe('PA');
    });

    it('falls back to the IP-geolocated country when no home is set', async () => {
        server.use(http.get(GEO, () => HttpResponse.json(geoLanguageEnFixture)));
        const { result } = renderHookWithProviders(() => useResidenceCountry());
        // geoLanguageEnFixture.country = 'US' (already upper).
        await waitFor(() => expect(result.current).toBe('US'));
    });

    it('resolves to null when neither home nor geo determine a country', async () => {
        let fetched = false;
        server.use(
            http.get(GEO, () => {
                fetched = true;
                return HttpResponse.json(geoLanguageNullFixture);
            })
        );
        const { result } = renderHookWithProviders(() => useResidenceCountry());
        await waitFor(() => expect(fetched).toBe(true));
        expect(result.current).toBeNull();
    });
});
