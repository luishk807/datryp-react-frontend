import { describe, it, expect } from 'vitest';
import en from './locales/en.json';
import es from './locales/es.json';

type Json = Record<string, unknown>;

/** All leaf key paths in a locale tree, dot-joined (e.g. `review.inline.save`).
 *  Objects recurse; arrays and primitives are leaves. */
const flattenKeys = (obj: Json, prefix = ''): string[] =>
    Object.entries(obj).flatMap(([k, v]) => {
        const key = prefix ? `${prefix}.${k}` : k;
        return v && typeof v === 'object' && !Array.isArray(v)
            ? flattenKeys(v as Json, key)
            : [key];
    });

// Guards against the class of bug where a feature ships English strings but
// the Spanish translations lag (users then see English fallback mid-UI). Any
// key added to one locale must exist in the other — in BOTH directions.
describe('i18n locale parity (en ↔ es)', () => {
    const enKeys = new Set(flattenKeys(en as Json));
    const esKeys = new Set(flattenKeys(es as Json));

    it('has a Spanish translation for every English key', () => {
        const missingInEs = [...enKeys].filter((k) => !esKeys.has(k)).sort();
        expect(missingInEs).toEqual([]);
    });

    it('has no Spanish-only keys without an English source', () => {
        const missingInEn = [...esKeys].filter((k) => !enKeys.has(k)).sort();
        expect(missingInEn).toEqual([]);
    });
});
