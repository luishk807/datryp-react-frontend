import { describe, it, expect } from 'vitest';
import { buildSharePreviewUrl } from './sharePreviewUrl';

const paramsOf = (url: string) => new URL(url).searchParams;

describe('buildSharePreviewUrl', () => {
    it('builds an absolute /share/preview URL with the title and canonical url', () => {
        const url = buildSharePreviewUrl({
            title: 'Paris',
            canonicalUrl: 'https://datryp.com/place/paris',
        });
        const parsed = new URL(url);
        expect(parsed.pathname).toBe('/share/preview');
        expect(['http:', 'https:']).toContain(parsed.protocol);
        expect(parsed.origin).toBeTruthy();

        const params = parsed.searchParams;
        expect(params.get('title')).toBe('Paris');
        expect(params.get('url')).toBe('https://datryp.com/place/paris');
        // Optional params absent when not provided.
        expect(params.has('description')).toBe(false);
        expect(params.has('image')).toBe(false);
    });

    it('joins subtitle onto the title with an em dash', () => {
        const url = buildSharePreviewUrl({
            title: 'Paris',
            subtitle: 'City of Light',
            canonicalUrl: 'https://datryp.com/place/paris',
        });
        expect(paramsOf(url).get('title')).toBe('Paris — City of Light');
    });

    it('includes a trimmed description and image when provided', () => {
        const url = buildSharePreviewUrl({
            title: 'Paris',
            description: '  A short pitch.  ',
            imageUrl: 'https://img.example/x.jpg',
            canonicalUrl: 'https://datryp.com/place/paris',
        });
        const params = paramsOf(url);
        expect(params.get('description')).toBe('A short pitch.');
        expect(params.get('image')).toBe('https://img.example/x.jpg');
    });

    it('omits the description when it is only whitespace', () => {
        const url = buildSharePreviewUrl({
            title: 'Paris',
            description: '    ',
            canonicalUrl: 'https://datryp.com/place/paris',
        });
        expect(paramsOf(url).has('description')).toBe(false);
    });

    it('omits the image when imageUrl is null or empty', () => {
        const nullImg = buildSharePreviewUrl({
            title: 'Paris',
            imageUrl: null,
            canonicalUrl: 'https://datryp.com/place/paris',
        });
        expect(paramsOf(nullImg).has('image')).toBe(false);

        const emptyImg = buildSharePreviewUrl({
            title: 'Paris',
            imageUrl: '',
            canonicalUrl: 'https://datryp.com/place/paris',
        });
        expect(paramsOf(emptyImg).has('image')).toBe(false);
    });

    it('truncates a long description at a word boundary with an ellipsis', () => {
        const long = 'lorem ipsum '.repeat(30); // 360 chars
        const url = buildSharePreviewUrl({
            title: 'Paris',
            description: long,
            canonicalUrl: 'https://datryp.com/place/paris',
        });
        const desc = paramsOf(url).get('description') ?? '';
        expect(desc.endsWith('…')).toBe(true);
        expect(desc.length).toBeLessThanOrEqual(181);
        expect(desc.startsWith('lorem ipsum')).toBe(true);
        // Cut fell on a word boundary, so the last visible word is whole.
        expect(desc).not.toMatch(/lore…$/);
    });

    it('hard-cuts a long word with no spaces at the char cap', () => {
        const long = 'x'.repeat(200);
        const url = buildSharePreviewUrl({
            title: 'Paris',
            description: long,
            canonicalUrl: 'https://datryp.com/place/paris',
        });
        expect(paramsOf(url).get('description')).toBe('x'.repeat(180) + '…');
    });

    it('does not cut at an early space (< 60% of the cap)', () => {
        const long = 'ab ' + 'x'.repeat(200);
        const url = buildSharePreviewUrl({
            title: 'Paris',
            description: long,
            canonicalUrl: 'https://datryp.com/place/paris',
        });
        const desc = paramsOf(url).get('description') ?? '';
        // The early space is preserved (head = full cut), then ellipsis added.
        expect(desc.startsWith('ab x')).toBe(true);
        expect(desc.endsWith('…')).toBe(true);
    });
});
