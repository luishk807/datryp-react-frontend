import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { act, waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import {
    shareEmailRequestFixture,
    shareEmailResponseFixture,
    shareEmailResponseNoCountFixture,
} from '../../test/fixtures/shareEmail';
import { useShareEmail } from './useShareEmail';

const ENDPOINT = 'http://localhost:8000/share/email';

describe('useShareEmail', () => {
    it('POSTs the share payload and returns the recipient count', async () => {
        let sentTo: string[] | undefined;
        server.use(
            http.post(ENDPOINT, async ({ request }) => {
                const body = (await request.json()) as { to?: string[] };
                sentTo = body.to;
                return HttpResponse.json(shareEmailResponseFixture);
            })
        );
        const { result } = renderHookWithProviders(() => useShareEmail());

        await act(async () => {
            await result.current.mutateAsync(shareEmailRequestFixture);
        });

        await waitFor(() =>
            expect(result.current.data).toEqual(shareEmailResponseFixture)
        );
        expect(sentTo).toEqual(shareEmailRequestFixture.to);
    });

    it('returns a success response without the optional recipient count', async () => {
        server.use(
            http.post(ENDPOINT, () =>
                HttpResponse.json(shareEmailResponseNoCountFixture)
            )
        );
        const { result } = renderHookWithProviders(() => useShareEmail());

        await act(async () => {
            await result.current.mutateAsync(shareEmailRequestFixture);
        });

        await waitFor(() =>
            expect(result.current.data).toEqual({ sent: true })
        );
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.post(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() => useShareEmail());

        await act(async () => {
            await expect(
                result.current.mutateAsync(shareEmailRequestFixture)
            ).rejects.toThrow();
        });
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
