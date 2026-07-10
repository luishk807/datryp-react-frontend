import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import { ContactFormResponseContract } from '../test/contracts/contact.contract';
import {
    contactRequestFixture,
    contactResponseFixture,
} from '../test/fixtures/contact';
import { sendContactForm } from './contactApi';

const API_BASE = 'http://localhost:8000';
const URL = `${API_BASE}/contact`;

describe('contactApi contract — POST /contact', () => {
    it('fixture satisfies the wire contract', () => {
        expect(() =>
            ContactFormResponseContract.parse(contactResponseFixture)
        ).not.toThrow();
    });

    it('sends the payload as JSON and returns { sent }', async () => {
        let body: unknown;
        let contentType: string | null = null;
        server.use(
            http.post(URL, async ({ request }) => {
                body = await request.json();
                contentType = request.headers.get('content-type');
                return HttpResponse.json(contactResponseFixture);
            })
        );
        const res = await sendContactForm(contactRequestFixture);
        expect(() => ContactFormResponseContract.parse(res)).not.toThrow();
        expect(res.sent).toBe(true);
        expect(body).toEqual(contactRequestFixture);
        expect(contentType).toContain('application/json');
    });

    it('maps a 429 to a friendly rate-limit message', async () => {
        server.use(
            http.post(
                URL,
                () =>
                    new HttpResponse(null, {
                        status: 429,
                        statusText: 'Too Many Requests',
                    })
            )
        );
        await expect(sendContactForm(contactRequestFixture)).rejects.toThrow(
            /sent a few messages in a row/
        );
    });

    it('surfaces a string `detail` error body', async () => {
        server.use(
            http.post(URL, () =>
                HttpResponse.json(
                    { detail: 'Email service unavailable' },
                    { status: 503 }
                )
            )
        );
        await expect(sendContactForm(contactRequestFixture)).rejects.toThrow(
            'Email service unavailable'
        );
    });

    it('joins a FastAPI validation `detail` array (with a msg-less fallback)', async () => {
        server.use(
            http.post(URL, () =>
                HttpResponse.json(
                    {
                        detail: [
                            { msg: 'field required', loc: ['body', 'email'] },
                            { loc: ['body', 'name'] },
                        ],
                    },
                    { status: 422 }
                )
            )
        );
        await expect(sendContactForm(contactRequestFixture)).rejects.toThrow(
            /field required; /
        );
    });

    it('falls back to the SlowAPI `error` field when there is no `detail`', async () => {
        server.use(
            http.post(URL, () =>
                HttpResponse.json({ error: 'Rate limited' }, { status: 400 })
            )
        );
        await expect(sendContactForm(contactRequestFixture)).rejects.toThrow(
            'Rate limited'
        );
    });

    it('falls back to status/statusText when the error body is not JSON', async () => {
        server.use(
            http.post(
                URL,
                () =>
                    new HttpResponse('nope', {
                        status: 500,
                        statusText: 'Internal Server Error',
                        headers: { 'content-type': 'text/plain' },
                    })
            )
        );
        await expect(sendContactForm(contactRequestFixture)).rejects.toThrow(
            '500 Internal Server Error'
        );
    });

    it('contract catches drift (missing / extra / wrong-typed)', () => {
        expect(() => ContactFormResponseContract.parse({})).toThrow();
        expect(() =>
            ContactFormResponseContract.parse({ sent: true, extra: 1 })
        ).toThrow();
        expect(() =>
            ContactFormResponseContract.parse({ sent: 'yes' })
        ).toThrow();
    });
});
