import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { act, waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import { setAuthToken } from '../authStorage';
import { useDeleteAccount } from './useDeleteAccount';

const BASE = 'http://localhost:8000';

// deleteMyAccount reads the real token store and sends it as a bearer token,
// so a token must be present for the request to fire.
beforeEach(() => {
    setAuthToken('a-token');
});

describe('useDeleteAccount', () => {
    it('DELETEs /me and resolves on 204', async () => {
        let method = '';
        let authHeader: string | null = null;
        server.use(
            http.delete(`${BASE}/me`, ({ request }) => {
                method = request.method;
                authHeader = request.headers.get('authorization');
                return new HttpResponse(null, { status: 204 });
            })
        );
        const { result } = renderHookWithProviders(() => useDeleteAccount());
        await act(async () => {
            await result.current.mutateAsync();
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(method).toBe('DELETE');
        expect(authHeader).toBe('Bearer a-token');
    });

    it('surfaces an error when the backend rejects the deletion', async () => {
        server.use(
            http.delete(`${BASE}/me`, () =>
                HttpResponse.json({ detail: 'nope' }, { status: 400 })
            )
        );
        const { result } = renderHookWithProviders(() => useDeleteAccount());
        await act(async () => {
            await result.current.mutateAsync().catch(() => undefined);
        });
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
