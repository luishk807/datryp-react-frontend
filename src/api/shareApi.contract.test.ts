import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'test/msw/server';
import {
    shareEmailRequestFixture,
    shareEmailResponseFixture,
    shareEmailResponseNoCountFixture,
} from 'test/fixtures/shareEmail';
import { ShareEmailResponseContract } from 'test/contracts/shareEmail.contract';
import { shareEmail } from './shareApi';

const API_BASE = 'http://localhost:8000';
const url = `${API_BASE}/share/email`;

// Contract tests for the REST /share/email boundary: drive the REAL client
// through MSW so request-building + FastAPI-error formatting run, then validate
// the response against the Zod contract.
describe('shareApi contract — POST /share/email', () => {
    it('fixtures satisfy the wire contract (with and without recipients)', () => {
        expect(() =>
            ShareEmailResponseContract.parse(shareEmailResponseFixture)
        ).not.toThrow();
        expect(() =>
            ShareEmailResponseContract.parse(shareEmailResponseNoCountFixture)
        ).not.toThrow();
    });

    it('sends the payload as JSON and returns { sent, recipients }', async () => {
        let body: unknown;
        let contentType: string | null = null;
        let method: string | undefined;
        server.use(
            http.post(url, async ({ request }) => {
                body = await request.json();
                contentType = request.headers.get('content-type');
                method = request.method;
                return HttpResponse.json(shareEmailResponseFixture);
            })
        );
        const res = await shareEmail(shareEmailRequestFixture);
        expect(() => ShareEmailResponseContract.parse(res)).not.toThrow();
        expect(res).toEqual({ sent: true, recipients: 2 });
        expect(method).toBe('POST');
        expect(contentType).toContain('application/json');
        expect(body).toEqual(shareEmailRequestFixture);
    });

    it('surfaces a string `detail` error body', async () => {
        server.use(
            http.post(url, () =>
                HttpResponse.json(
                    { detail: 'Recipient list is empty' },
                    { status: 400 }
                )
            )
        );
        await expect(shareEmail(shareEmailRequestFixture)).rejects.toThrow(
            'Recipient list is empty'
        );
    });

    it('joins a FastAPI validation `detail` array (with a msg-less fallback)', async () => {
        server.use(
            http.post(url, () =>
                HttpResponse.json(
                    {
                        detail: [
                            { msg: 'invalid email', loc: ['body', 'to', 0] },
                            { loc: ['body', 'to', 1] },
                        ],
                    },
                    { status: 422 }
                )
            )
        );
        await expect(shareEmail(shareEmailRequestFixture)).rejects.toThrow(
            /invalid email; /
        );
    });

    it('falls back to status/statusText when `detail` is neither string nor array', async () => {
        server.use(
            http.post(url, () =>
                HttpResponse.json(
                    { detail: { unexpected: 'object' } },
                    { status: 500, statusText: 'Internal Server Error' }
                )
            )
        );
        await expect(shareEmail(shareEmailRequestFixture)).rejects.toThrow(
            '500 Internal Server Error'
        );
    });

    it('falls back to status/statusText when the error body is not JSON', async () => {
        server.use(
            http.post(
                url,
                () =>
                    new HttpResponse('nope', {
                        status: 503,
                        statusText: 'Service Unavailable',
                        headers: { 'content-type': 'text/plain' },
                    })
            )
        );
        await expect(shareEmail(shareEmailRequestFixture)).rejects.toThrow(
            '503 Service Unavailable'
        );
    });

    it('contract catches drift (missing / extra / wrong-typed)', () => {
        expect(() => ShareEmailResponseContract.parse({})).toThrow();
        expect(() =>
            ShareEmailResponseContract.parse({
                ...shareEmailResponseFixture,
                extra: 1,
            })
        ).toThrow();
        expect(() =>
            ShareEmailResponseContract.parse({ sent: 'yes' })
        ).toThrow();
        expect(() =>
            ShareEmailResponseContract.parse({ sent: true, recipients: '2' })
        ).toThrow();
    });
});
