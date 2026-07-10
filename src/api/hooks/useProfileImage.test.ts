import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { act, waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import {
    renderHookWithProviders,
    makeTestQueryClient,
} from '../../test/renderWithProviders';
import { queryKeys } from 'api/queryKeys';
import {
    profileImageResponseFixture,
    profileImageNullFixture,
} from '../../test/fixtures/profileImage';
import { useUploadProfileImage, useRemoveProfileImage } from './useProfileImage';

const ENDPOINT = 'http://localhost:8000/me/profile-image';

describe('useUploadProfileImage', () => {
    it('POSTs the file, returns the new URL, and invalidates the current user', async () => {
        let method = '';
        server.use(
            http.post(ENDPOINT, ({ request }) => {
                method = request.method;
                return HttpResponse.json(profileImageResponseFixture);
            })
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(
            () => useUploadProfileImage(),
            { client }
        );
        const file = new File(['avatar-bytes'], 'avatar.jpg', {
            type: 'image/jpeg',
        });

        await act(async () => {
            await result.current.mutateAsync(file);
        });

        await waitFor(() =>
            expect(result.current.data).toBe(
                profileImageResponseFixture.profile_image_url
            )
        );
        expect(method).toBe('POST');
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: queryKeys.currentUser,
        });
    });

    it('passes a cleared (null) URL straight through', async () => {
        server.use(
            http.post(ENDPOINT, () =>
                HttpResponse.json(profileImageNullFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useUploadProfileImage()
        );
        const file = new File(['x'], 'x.jpg', { type: 'image/jpeg' });

        await act(async () => {
            await result.current.mutateAsync(file);
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeNull();
    });

    it('surfaces an error when the upload fails', async () => {
        server.use(
            http.post(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() =>
            useUploadProfileImage()
        );
        const file = new File(['x'], 'x.jpg', { type: 'image/jpeg' });

        await act(async () => {
            await expect(result.current.mutateAsync(file)).rejects.toThrow();
        });
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe('useRemoveProfileImage', () => {
    it('DELETEs the image and invalidates the current user', async () => {
        let method = '';
        server.use(
            http.delete(ENDPOINT, ({ request }) => {
                method = request.method;
                return new HttpResponse(null, { status: 204 });
            })
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(
            () => useRemoveProfileImage(),
            { client }
        );

        await act(async () => {
            await result.current.mutateAsync();
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(method).toBe('DELETE');
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: queryKeys.currentUser,
        });
    });

    it('surfaces an error when the delete fails', async () => {
        server.use(
            http.delete(
                ENDPOINT,
                () => new HttpResponse(null, { status: 500 })
            )
        );
        const { result } = renderHookWithProviders(() =>
            useRemoveProfileImage()
        );

        await act(async () => {
            await expect(result.current.mutateAsync()).rejects.toThrow();
        });
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
