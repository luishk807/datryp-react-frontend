import { useQuery } from '@tanstack/react-query';

/**
 * Resolve a Google Maps short link (`maps.app.goo.gl/...`,
 * `goo.gl/maps/...`) to its final URL by asking the backend to
 * follow the redirect chain. Browsers can't follow opaque short
 * links directly (no CORS, no Location header access), so the smart
 * entry needs server help to unwrap them.
 *
 * Cached aggressively (24h) since short links are immutable —
 * `maps.app.goo.gl/X` always points to the same final URL.
 *
 * Returns `null` when the input isn't a recognized short link or
 * the resolve failed — the smart entry's URL parser then handles
 * the original input directly and shows the standard "couldn't
 * read that link" warning if needed.
 */
const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

interface ResolveResponse {
    url: string | null;
}

export const SHORT_LINK_HOSTS = new Set([
    'maps.app.goo.gl',
    'goo.gl',
    'g.co',
]);

export const isShortLinkUrl = (input: string): boolean => {
    if (!/^https?:\/\//i.test(input)) return false;
    try {
        const u = new URL(input);
        return SHORT_LINK_HOSTS.has(u.hostname.toLowerCase());
    } catch {
        return false;
    }
};

const fetchResolveShortLink = async (
    url: string,
): Promise<string | null> => {
    const params = new URLSearchParams({ url });
    const resp = await fetch(
        `${API_BASE}/places/resolve-link?${params.toString()}`,
    );
    if (!resp.ok) return null;
    const body = (await resp.json()) as ResolveResponse;
    return body.url;
};

export const useResolveShortLink = (
    input: string,
    options: { enabled?: boolean } = {},
) => {
    const { enabled = true } = options;
    const isShort = isShortLinkUrl(input);
    return useQuery<string | null>({
        queryKey: ['resolve-short-link', input],
        queryFn: () => fetchResolveShortLink(input),
        enabled: enabled && isShort,
        staleTime: 24 * 60 * 60 * 1000,
        retry: 0,
    });
};
