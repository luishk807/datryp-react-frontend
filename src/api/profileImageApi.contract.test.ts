import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'test/msw/server';
import {
    profileImageResponseFixture,
    profileImageNullFixture,
} from 'test/fixtures/profileImage';
import { ProfileImageResponseContract } from 'test/contracts/profileImage.contract';
import { uploadProfileImage, removeProfileImage } from './profileImageApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';
const url = `${API_BASE}/me/profile-image`;

const jpg = () => new File(['jpeg-bytes'], 'avatar.jpg', { type: 'image/jpeg' });

// NOTE: uploadProfileImage sends a multipart `FormData` body. Reading that body
// inside the MSW interceptor hangs under the Node (jsdom + undici) transport (a
// known interop limit), so the upload is exercised by EXECUTION and we assert
// everything observable without draining the body — method, URL, auth,
// content-type, and the parsed response.
describe('profileImageApi contract — POST /me/profile-image', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('fixtures satisfy the wire contract', () => {
        expect(() =>
            ProfileImageResponseContract.parse(profileImageResponseFixture)
        ).not.toThrow();
        expect(() =>
            ProfileImageResponseContract.parse(profileImageNullFixture)
        ).not.toThrow();
    });

    it('POSTs a multipart upload with the bearer and returns the url', async () => {
        let authHeader: string | null = null;
        let contentType: string | null = null;
        let method: string | undefined;
        server.use(
            http.post(url, ({ request }) => {
                authHeader = request.headers.get('authorization');
                contentType = request.headers.get('content-type');
                method = request.method;
                return HttpResponse.json(profileImageResponseFixture);
            })
        );
        const result = await uploadProfileImage(jpg());
        expect(result).toBe(profileImageResponseFixture.profile_image_url);
        expect(method).toBe('POST');
        expect(authHeader).toBe('Bearer test-token');
        // The browser/undici sets multipart with a boundary; the client must
        // NOT force its own Content-Type.
        expect(contentType).toContain('multipart/form-data');
        expect(contentType).toContain('boundary=');
    });

    it('passes a null profile_image_url straight through', async () => {
        server.use(http.post(url, () => HttpResponse.json(profileImageNullFixture)));
        expect(await uploadProfileImage(jpg())).toBeNull();
    });

    it('omits the Authorization header when no token is stored', async () => {
        setAuthToken(null);
        let authHeader: string | null = 'unset';
        server.use(
            http.post(url, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(profileImageResponseFixture);
            })
        );
        await uploadProfileImage(jpg());
        expect(authHeader).toBeNull();
    });

    it('throws with the backend detail on a non-OK response', async () => {
        server.use(
            http.post(url, () =>
                HttpResponse.json(
                    { detail: 'File too large' },
                    { status: 413, statusText: 'Payload Too Large' }
                )
            )
        );
        await expect(uploadProfileImage(jpg())).rejects.toThrow(
            'upload profile image 413 Payload Too Large — File too large'
        );
    });

    it('throws with no detail suffix when the error body has a non-string detail', async () => {
        server.use(
            http.post(url, () =>
                HttpResponse.json(
                    { detail: { code: 42 } },
                    { status: 422, statusText: 'Unprocessable Entity' }
                )
            )
        );
        await expect(uploadProfileImage(jpg())).rejects.toThrow(
            'upload profile image 422 Unprocessable Entity'
        );
    });

    it('throws (no detail suffix) when the error body is not JSON', async () => {
        server.use(
            http.post(
                url,
                () =>
                    new HttpResponse('boom', {
                        status: 500,
                        statusText: 'Internal Server Error',
                    })
            )
        );
        await expect(uploadProfileImage(jpg())).rejects.toThrow(
            'upload profile image 500 Internal Server Error'
        );
    });

    it('contract catches drift (missing / extra / wrong-typed)', () => {
        expect(() => ProfileImageResponseContract.parse({})).toThrow();
        expect(() =>
            ProfileImageResponseContract.parse({
                ...profileImageResponseFixture,
                extra: 1,
            })
        ).toThrow();
        expect(() =>
            ProfileImageResponseContract.parse({ profile_image_url: 42 })
        ).toThrow();
    });
});

describe('profileImageApi contract — DELETE /me/profile-image', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('DELETEs with the bearer and resolves to void', async () => {
        let authHeader: string | null = null;
        let method: string | undefined;
        server.use(
            http.delete(url, ({ request }) => {
                authHeader = request.headers.get('authorization');
                method = request.method;
                return new HttpResponse(null, { status: 204 });
            })
        );
        await expect(removeProfileImage()).resolves.toBeUndefined();
        expect(method).toBe('DELETE');
        expect(authHeader).toBe('Bearer test-token');
    });

    it('throws with the backend detail on a non-OK response', async () => {
        server.use(
            http.delete(url, () =>
                HttpResponse.json(
                    { detail: 'Nothing to remove' },
                    { status: 409, statusText: 'Conflict' }
                )
            )
        );
        await expect(removeProfileImage()).rejects.toThrow(
            'remove profile image 409 Conflict — Nothing to remove'
        );
    });
});
