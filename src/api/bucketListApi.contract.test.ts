import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'test/msw/server';
import {
    bucketListItemRawFixture,
    bucketListItemRawMinimalFixture,
    bucketListResponseRawFixture,
    bucketListEmptyResponseRawFixture,
    bucketTripGenerationRawFixture,
} from 'test/fixtures/bucketList';
import {
    BucketListItemWireContract,
    BucketListResponseWireContract,
    BucketTripGenerationWireContract,
    BucketListPaywallDetailContract,
    BucketListBlockedDetailContract,
} from 'test/contracts/bucketList.contract';
import {
    fetchBucketList,
    addBucketListItem,
    enrichExistingBucketList,
    deleteBucketListItem,
    generateTripFromBucket,
    BucketListPaywallError,
    BucketListBlockedError,
} from './bucketListApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';
const LIST_URL = `${API_BASE}/me/bucket-list`;

// Expected camelCase reshapes of the raw fixtures.
const expectedFullItem = {
    id: 'goal-1',
    text: 'See the northern lights',
    title: 'Chase the Aurora in Tromsø',
    description: 'Winter nights above the Arctic Circle for aurora hunting.',
    emoji: '🌌',
    tags: ['nature', 'winter'],
    enrichmentAttempted: true,
    createdAt: '2026-06-01T10:00:00Z',
    updatedAt: '2026-06-02T10:00:00Z',
};

const expectedMinimalItem = {
    id: 'goal-2',
    text: 'Hike the Inca Trail',
    title: null,
    description: null,
    emoji: null,
    tags: [],
    enrichmentAttempted: false,
    createdAt: '2026-06-03T10:00:00Z',
    updatedAt: '2026-06-03T10:00:00Z',
};

describe('bucketListApi contract — GET /me/bucket-list', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('raw wire fixtures satisfy the contracts', () => {
        expect(() =>
            BucketListResponseWireContract.parse(bucketListResponseRawFixture)
        ).not.toThrow();
        expect(() =>
            BucketListResponseWireContract.parse(
                bucketListEmptyResponseRawFixture
            )
        ).not.toThrow();
        expect(() =>
            BucketListItemWireContract.parse(bucketListItemRawFixture)
        ).not.toThrow();
        expect(() =>
            BucketListItemWireContract.parse(bucketListItemRawMinimalFixture)
        ).not.toThrow();
    });

    it('maps items → camelCase (coalescing enrichment misses) and sends the bearer', async () => {
        let authHeader: string | null = null;
        let method: string | undefined;
        server.use(
            http.get(LIST_URL, ({ request }) => {
                authHeader = request.headers.get('authorization');
                method = request.method;
                return HttpResponse.json(bucketListResponseRawFixture);
            })
        );
        const res = await fetchBucketList();
        expect(res).toEqual([expectedFullItem, expectedMinimalItem]);
        expect(method).toBe('GET');
        expect(authHeader).toBe('Bearer test-token');
    });

    it('returns an empty array when the list is empty', async () => {
        server.use(
            http.get(LIST_URL, () =>
                HttpResponse.json(bucketListEmptyResponseRawFixture)
            )
        );
        expect(await fetchBucketList()).toEqual([]);
    });

    it('omits the Authorization header when no token is stored', async () => {
        setAuthToken(null);
        let authHeader: string | null = 'unset';
        server.use(
            http.get(LIST_URL, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(bucketListEmptyResponseRawFixture);
            })
        );
        await fetchBucketList();
        expect(authHeader).toBeNull();
    });

    it('throws with the backend string detail on a non-OK response', async () => {
        server.use(
            http.get(LIST_URL, () =>
                HttpResponse.json(
                    { detail: 'Server exploded' },
                    { status: 500, statusText: 'Internal Server Error' }
                )
            )
        );
        await expect(fetchBucketList()).rejects.toThrow(
            '/me/bucket-list 500 Internal Server Error — Server exploded'
        );
    });

    it('throws (no detail suffix) when the error body is not JSON', async () => {
        server.use(
            http.get(LIST_URL, () => new HttpResponse('boom', { status: 502 }))
        );
        await expect(fetchBucketList()).rejects.toThrow('/me/bucket-list 502');
    });

    it('contract catches drift (missing / extra / wrong-typed)', () => {
        const missing = { ...bucketListItemRawFixture } as Record<
            string,
            unknown
        >;
        delete missing.text;
        expect(() => BucketListItemWireContract.parse(missing)).toThrow();
        expect(() =>
            BucketListItemWireContract.parse({
                ...bucketListItemRawFixture,
                surprise: true,
            })
        ).toThrow();
        expect(() =>
            BucketListItemWireContract.parse({
                ...bucketListItemRawFixture,
                enrichment_attempted: 'yes',
            })
        ).toThrow();
    });
});

describe('bucketListApi contract — POST /me/bucket-list (add)', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('posts { text } and reshapes the created row', async () => {
        let method: string | undefined;
        let contentType: string | null = null;
        let body: unknown;
        server.use(
            http.post(LIST_URL, async ({ request }) => {
                method = request.method;
                contentType = request.headers.get('content-type');
                body = await request.json();
                return HttpResponse.json(bucketListItemRawFixture);
            })
        );
        const res = await addBucketListItem('See the northern lights');
        expect(method).toBe('POST');
        expect(contentType).toContain('application/json');
        expect(body).toEqual({ text: 'See the northern lights' });
        expect(res).toEqual(expectedFullItem);
    });

    it('surfaces a 402 cap paywall as a typed BucketListPaywallError', async () => {
        server.use(
            http.post(LIST_URL, () =>
                HttpResponse.json(
                    {
                        detail: {
                            kind: 'bucket_list_cap',
                            message: 'Free plan is capped at 10 goals',
                            cap: 10,
                            current_count: 10,
                        },
                    },
                    { status: 402 }
                )
            )
        );
        let err: unknown;
        try {
            await addBucketListItem('one too many');
        } catch (e) {
            err = e;
        }
        expect(err).toBeInstanceOf(BucketListPaywallError);
        const pe = err as BucketListPaywallError;
        expect(pe.kind).toBe('bucket_list_cap');
        expect(pe.cap).toBe(10);
        expect(pe.currentCount).toBe(10);
        expect(pe.message).toBe('Free plan is capped at 10 goals');
    });

    it('surfaces a 422 moderation block as a typed BucketListBlockedError', async () => {
        server.use(
            http.post(LIST_URL, () =>
                HttpResponse.json(
                    {
                        detail: {
                            message: "We can't add that one — try rephrasing",
                            category: 'violence',
                        },
                    },
                    { status: 422 }
                )
            )
        );
        let err: unknown;
        try {
            await addBucketListItem('something nasty');
        } catch (e) {
            err = e;
        }
        expect(err).toBeInstanceOf(BucketListBlockedError);
        const be = err as BucketListBlockedError;
        expect(be.category).toBe('violence');
        expect(be.message).toBe("We can't add that one — try rephrasing");
    });

    it('falls back to a generic error on a 402 whose detail lacks kind', async () => {
        server.use(
            http.post(LIST_URL, () =>
                HttpResponse.json(
                    { detail: 'Payment required' },
                    { status: 402, statusText: 'Payment Required' }
                )
            )
        );
        const call = addBucketListItem('x');
        await expect(call).rejects.toThrow(
            'add bucket-list item 402 Payment Required — Payment required'
        );
        await expect(call).rejects.not.toBeInstanceOf(BucketListPaywallError);
    });

    it('falls back to a generic error on a 422 whose detail lacks category', async () => {
        server.use(
            http.post(LIST_URL, () =>
                HttpResponse.json(
                    { detail: { message: 'no category here' } },
                    { status: 422, statusText: 'Unprocessable Entity' }
                )
            )
        );
        const call = addBucketListItem('x');
        // detail is an object (not a string), so no `— …` suffix is appended.
        await expect(call).rejects.toThrow(
            'add bucket-list item 422 Unprocessable Entity'
        );
        await expect(call).rejects.not.toBeInstanceOf(BucketListBlockedError);
    });
});

describe('bucketListApi contract — POST /me/bucket-list/enrich-existing', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('POSTs (no body) and returns the reshaped, updated list', async () => {
        let method: string | undefined;
        let path: string | undefined;
        server.use(
            http.post(
                `${API_BASE}/me/bucket-list/enrich-existing`,
                ({ request }) => {
                    method = request.method;
                    path = new URL(request.url).pathname;
                    return HttpResponse.json(bucketListResponseRawFixture);
                }
            )
        );
        const res = await enrichExistingBucketList();
        expect(res).toEqual([expectedFullItem, expectedMinimalItem]);
        expect(method).toBe('POST');
        expect(path).toBe('/me/bucket-list/enrich-existing');
    });

    it('surfaces a 402 Pro paywall as a typed error', async () => {
        server.use(
            http.post(`${API_BASE}/me/bucket-list/enrich-existing`, () =>
                HttpResponse.json(
                    {
                        detail: {
                            kind: 'bucket_list_generate',
                            message: 'Enrichment is a Pro feature',
                        },
                    },
                    { status: 402 }
                )
            )
        );
        await expect(enrichExistingBucketList()).rejects.toBeInstanceOf(
            BucketListPaywallError
        );
    });
});

describe('bucketListApi contract — DELETE /me/bucket-list/:id', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('DELETEs the encoded id with the bearer and resolves on 204', async () => {
        let method: string | undefined;
        let authHeader: string | null = null;
        let path: string | undefined;
        server.use(
            http.delete(`${API_BASE}/me/bucket-list/:id`, ({ request }) => {
                method = request.method;
                authHeader = request.headers.get('authorization');
                path = new URL(request.url).pathname;
                return new HttpResponse(null, { status: 204 });
            })
        );
        await expect(deleteBucketListItem('a/b')).resolves.toBeUndefined();
        expect(method).toBe('DELETE');
        expect(authHeader).toBe('Bearer test-token');
        expect(path).toBe('/me/bucket-list/a%2Fb');
    });

    it('throws with the backend detail on a non-OK response', async () => {
        server.use(
            http.delete(`${API_BASE}/me/bucket-list/:id`, () =>
                HttpResponse.json(
                    { detail: 'Not found' },
                    { status: 404, statusText: 'Not Found' }
                )
            )
        );
        await expect(deleteBucketListItem('goal-9')).rejects.toThrow(
            'delete bucket-list item 404 Not Found — Not found'
        );
    });
});

describe('bucketListApi contract — POST /me/bucket-list/:id/itinerary (generate)', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('raw wire fixture satisfies the contract', () => {
        expect(() =>
            BucketTripGenerationWireContract.parse(
                bucketTripGenerationRawFixture
            )
        ).not.toThrow();
    });

    it('sends the full body (+ lang) and reshapes the generation result', async () => {
        let method: string | undefined;
        let path: string | undefined;
        let body: Record<string, unknown> = {};
        server.use(
            http.post(
                `${API_BASE}/me/bucket-list/:id/itinerary`,
                async ({ request }) => {
                    method = request.method;
                    path = new URL(request.url).pathname;
                    body = (await request.json()) as Record<string, unknown>;
                    return HttpResponse.json(bucketTripGenerationRawFixture);
                }
            )
        );
        const res = await generateTripFromBucket('goal-1', {
            partySize: 3,
            durationDays: 6,
            travelerStyles: ['adventurer', 'foodie'],
        });
        expect(method).toBe('POST');
        expect(path).toBe('/me/bucket-list/goal-1/itinerary');
        expect(body).toEqual({
            party_size: 3,
            duration_days: 6,
            traveler_styles: ['adventurer', 'foodie'],
            lang: expect.any(String),
        });
        expect(res).toEqual({
            itineraryId: 'trip-77',
            tripType: 'single',
            tripName: 'Aurora Week in Tromsø',
            countryName: 'Norway',
            durationDays: 6,
            rationale: 'Built around your aurora goal and Adventurer style.',
        });
    });

    it('defaults omitted input fields to null (input undefined)', async () => {
        let body: Record<string, unknown> = {};
        server.use(
            http.post(
                `${API_BASE}/me/bucket-list/:id/itinerary`,
                async ({ request }) => {
                    body = (await request.json()) as Record<string, unknown>;
                    return HttpResponse.json(bucketTripGenerationRawFixture);
                }
            )
        );
        await generateTripFromBucket('goal-1');
        expect(body).toEqual({
            party_size: null,
            duration_days: null,
            traveler_styles: null,
            lang: expect.any(String),
        });
    });

    it('surfaces a 402 generate paywall as a typed error', async () => {
        server.use(
            http.post(`${API_BASE}/me/bucket-list/:id/itinerary`, () =>
                HttpResponse.json(
                    {
                        detail: {
                            kind: 'bucket_list_generate',
                            message: 'Creating trips from goals is Pro-only',
                        },
                    },
                    { status: 402 }
                )
            )
        );
        await expect(
            generateTripFromBucket('goal-1')
        ).rejects.toBeInstanceOf(BucketListPaywallError);
    });

    it('throws (no detail suffix) when the error body is not JSON', async () => {
        server.use(
            http.post(
                `${API_BASE}/me/bucket-list/:id/itinerary`,
                () => new HttpResponse('down', { status: 503 })
            )
        );
        await expect(generateTripFromBucket('goal-1')).rejects.toThrow(
            'generate trip from bucket-list 503'
        );
    });

    it('contract catches drift (wrong trip_type enum / missing field)', () => {
        expect(() =>
            BucketTripGenerationWireContract.parse({
                ...bucketTripGenerationRawFixture,
                trip_type: 'round-trip',
            })
        ).toThrow();
        const missing = { ...bucketTripGenerationRawFixture } as Record<
            string,
            unknown
        >;
        delete missing.itinerary_id;
        expect(() =>
            BucketTripGenerationWireContract.parse(missing)
        ).toThrow();
    });
});

describe('bucketListApi contract — paywall / blocked detail contracts', () => {
    it('valid paywall + blocked detail bodies satisfy their contracts', () => {
        expect(() =>
            BucketListPaywallDetailContract.parse({
                kind: 'bucket_list_cap',
                message: 'capped',
                cap: 10,
                current_count: 10,
            })
        ).not.toThrow();
        expect(() =>
            BucketListBlockedDetailContract.parse({
                message: 'blocked',
                category: 'violence',
            })
        ).not.toThrow();
    });

    it('reject an unknown paywall kind / missing blocked category', () => {
        expect(() =>
            BucketListPaywallDetailContract.parse({
                kind: 'some_other_wall',
                message: 'nope',
            })
        ).toThrow();
        expect(() =>
            BucketListBlockedDetailContract.parse({ message: 'no category' })
        ).toThrow();
    });
});
