import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import {
    inviteFriendRequestFixture,
    inviteJoinInvitationFixture,
} from '../test/fixtures/friends';
import { InviteByEmailResponseContract } from '../test/contracts/friends.contract';
import { inviteFriendByEmail, FriendsApiError } from './friendsApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';
const URL = `${API_BASE}/friends/invite-by-email`;

describe('friendsApi contract — POST /friends/invite-by-email', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('returns a friend_request payload that satisfies the contract', async () => {
        let body: unknown;
        let authHeader: string | null = null;
        server.use(
            http.post(URL, async ({ request }) => {
                body = await request.json();
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(inviteFriendRequestFixture);
            })
        );
        const res = await inviteFriendByEmail('traveler@example.com');
        expect(() =>
            InviteByEmailResponseContract.parse(res)
        ).not.toThrow();
        expect(res.kind).toBe('friend_request');
        expect(body).toEqual({ email: 'traveler@example.com' });
        expect(authHeader).toBe('Bearer test-token');
    });

    it('returns a join_invitation payload that satisfies the contract', async () => {
        server.use(
            http.post(URL, () =>
                HttpResponse.json(inviteJoinInvitationFixture)
            )
        );
        const res = await inviteFriendByEmail('newbie@example.com');
        expect(() =>
            InviteByEmailResponseContract.parse(res)
        ).not.toThrow();
        expect(res.kind).toBe('join_invitation');
    });

    it('omits the Authorization header when no token is stored', async () => {
        setAuthToken(null);
        let hasAuth = true;
        server.use(
            http.post(URL, ({ request }) => {
                hasAuth = request.headers.has('authorization');
                return HttpResponse.json(inviteFriendRequestFixture);
            })
        );
        await inviteFriendByEmail('x@y.com');
        expect(hasAuth).toBe(false);
    });

    it('throws a FriendsApiError carrying the backend detail + status', async () => {
        server.use(
            http.post(URL, () =>
                HttpResponse.json(
                    { detail: 'Already friends' },
                    { status: 409 }
                )
            )
        );
        await expect(
            inviteFriendByEmail('dupe@example.com')
        ).rejects.toMatchObject({
            name: 'FriendsApiError',
            status: 409,
            message: 'Already friends',
        });
    });

    it('is an instance of the exported FriendsApiError class', async () => {
        server.use(
            http.post(URL, () =>
                HttpResponse.json({ detail: 'boom' }, { status: 400 })
            )
        );
        const err = await inviteFriendByEmail('e@e.com').catch((e) => e);
        expect(err).toBeInstanceOf(FriendsApiError);
    });

    it('falls back to "status statusText" when the error body is not JSON', async () => {
        server.use(
            http.post(
                URL,
                () => new HttpResponse('nope', { status: 500 })
            )
        );
        await expect(
            inviteFriendByEmail('e@e.com')
        ).rejects.toMatchObject({ status: 500, message: /500/ });
    });
});

describe('friendsApi contract — Zod drift guards', () => {
    it('catches a MISSING required field', () => {
        const missing = { ...inviteFriendRequestFixture } as Record<
            string,
            unknown
        >;
        delete missing.message;
        expect(() =>
            InviteByEmailResponseContract.parse(missing)
        ).toThrow();
    });

    it('catches an UNEXPECTED extra field (strict shape)', () => {
        expect(() =>
            InviteByEmailResponseContract.parse({
                ...inviteFriendRequestFixture,
                surprise: true,
            })
        ).toThrow();
    });

    it('catches a WRONG value for the kind enum', () => {
        expect(() =>
            InviteByEmailResponseContract.parse({
                ...inviteFriendRequestFixture,
                kind: 'unknown_kind',
            })
        ).toThrow();
    });
});
