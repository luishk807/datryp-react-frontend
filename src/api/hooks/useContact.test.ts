import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { act, waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import {
    contactRequestFixture,
    contactResponseFixture,
} from '../../test/fixtures/contact';
import { useSendContactForm } from './useContact';

const ENDPOINT = 'http://localhost:8000/contact';

describe('useSendContactForm', () => {
    it('POSTs the form payload and returns the sent confirmation', async () => {
        let body: Record<string, unknown> | undefined;
        server.use(
            http.post(ENDPOINT, async ({ request }) => {
                body = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(contactResponseFixture);
            })
        );
        const { result } = renderHookWithProviders(() =>
            useSendContactForm()
        );

        await act(async () => {
            await result.current.mutateAsync(contactRequestFixture);
        });

        await waitFor(() =>
            expect(result.current.data).toEqual(contactResponseFixture)
        );
        expect(body).toEqual(contactRequestFixture);
    });

    it('rewrites a 429 into a friendly rate-limit message', async () => {
        server.use(
            http.post(ENDPOINT, () => new HttpResponse(null, { status: 429 }))
        );
        const { result } = renderHookWithProviders(() =>
            useSendContactForm()
        );

        await act(async () => {
            await expect(
                result.current.mutateAsync(contactRequestFixture)
            ).rejects.toThrow(/wait a bit/);
        });
        await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.post(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() =>
            useSendContactForm()
        );

        await act(async () => {
            await expect(
                result.current.mutateAsync(contactRequestFixture)
            ).rejects.toThrow();
        });
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
