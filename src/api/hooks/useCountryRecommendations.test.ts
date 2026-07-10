import { describe, it, expect } from 'vitest';
import { graphql, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import { QueryBlockedError } from '../moderationError';
import { useCountryRecommendations } from './useCountryRecommendations';

// Recommender resolver on the PYTHON GraphQL backend (port 8000).
const pythonGql = graphql.link('http://localhost:8000/graphql');

const RESPONSE = {
    modelVersion: 'v3',
    items: [
        {
            id: 'c1',
            name: 'Portugal',
            code: 'PT',
            local: 'Portugal',
            image: null,
            score: 0.92,
            reason: 'Great beaches and food.',
        },
    ],
};

describe('useCountryRecommendations', () => {
    it('returns the unwrapped `recommendCountries` payload', async () => {
        server.use(
            pythonGql.query('RecommendCountries', () =>
                HttpResponse.json({ data: { recommendCountries: RESPONSE } })
            )
        );
        const { result } = renderHookWithProviders(() =>
            useCountryRecommendations({ query: 'beach trip' })
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(RESPONSE);
    });

    it('forwards the whole payload as the `input` variable', async () => {
        let variables: Record<string, unknown> | undefined;
        server.use(
            pythonGql.query('RecommendCountries', ({ variables: v }) => {
                variables = v;
                return HttpResponse.json({
                    data: { recommendCountries: RESPONSE },
                });
            })
        );
        const payload = {
            query: 'ski',
            interests: ['snow'],
            budget: 'mid',
            limit: 5,
        };
        const { result } = renderHookWithProviders(() =>
            useCountryRecommendations(payload)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(variables).toEqual({ input: payload });
    });

    it('stays idle (no request) for a blank query', () => {
        const { result } = renderHookWithProviders(() =>
            useCountryRecommendations({ query: '   ' })
        );
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('stays idle when disabled via options even with a query', () => {
        const { result } = renderHookWithProviders(() =>
            useCountryRecommendations({ query: 'beach' }, { enabled: false })
        );
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('rethrows a QUERY_BLOCKED moderation hit as QueryBlockedError', async () => {
        server.use(
            pythonGql.query('RecommendCountries', () =>
                HttpResponse.json({
                    errors: [
                        {
                            message: 'blocked',
                            extensions: {
                                code: 'QUERY_BLOCKED',
                                category: 'nsfw',
                            },
                        },
                    ],
                })
            )
        );
        const { result } = renderHookWithProviders(() =>
            useCountryRecommendations({ query: 'not travel' })
        );
        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error).toBeInstanceOf(QueryBlockedError);
        expect((result.current.error as QueryBlockedError).category).toBe(
            'nsfw'
        );
    });
});
