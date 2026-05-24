/**
 * Build a backend `/share/preview` URL that social crawlers can fetch
 * to read rich OG / Twitter Card tags for a given title / description /
 * image / canonical URL combination.
 *
 * Why this exists: the frontend is a Vite CSR SPA, so every route
 * serves the same `index.html` with static OG tags. When users share
 * place / city / country / trip URLs on WhatsApp / Facebook / X /
 * Slack, the crawlers parse those static tags and show the homepage
 * preview regardless of what was actually shared. The backend's
 * `/share/preview` endpoint accepts the per-share metadata as query
 * params, returns minimal HTML with the right OG tags, and meta-
 * refreshes humans back to the canonical URL.
 *
 * Trip and place surfaces both feed shares through this so the unfurl
 * doesn't fall back to "DaTryp.com homepage" (or, for private trips
 * where the canonical URL 404s for unauthenticated crawlers, to "not
 * found"). The function lives in `utils/` because it's consumed by
 * multiple share surfaces — keeping the URL contract single-sourced
 * prevents drift between trip / place / city share copy.
 */
const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

// Cap for the `description` query param fed to /share/preview. Two
// reasons: (1) Twitter's intent URL packs the full preview URL into
// the tweet compose box — a 500-char description makes the URL run
// off the screen and looks like a wall of text in the editor.
// (2) OG/Twitter cards truncate descriptions around 160-200 chars
// anyway, so paying the URL-length cost for the tail is wasted bytes.
const DESCRIPTION_MAX = 180;

const truncateAtWord = (value: string, max: number): string => {
    if (value.length <= max) return value;
    const cut = value.slice(0, max);
    const lastSpace = cut.lastIndexOf(' ');
    const head = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
    return `${head.trimEnd()}…`;
};

export interface SharePreviewParts {
    /** Headline that becomes `og:title` / `twitter:title`. */
    title: string;
    /** Optional subtitle joined as `${title} — ${subtitle}` when set. */
    subtitle?: string;
    /** 1–2 sentence pitch — `og:description` / `twitter:description`. */
    description?: string;
    /** Hero image for `og:image` / `twitter:image`. */
    imageUrl?: string | null;
    /** Canonical frontend URL. Crawlers see it via `og:url`; humans get
     *  a meta-refresh redirect to it. Must be an http(s) URL on a host
     *  the backend allow-lists (datryp.com / localhost). */
    canonicalUrl: string;
}

export const buildSharePreviewUrl = ({
    title,
    subtitle,
    description,
    imageUrl,
    canonicalUrl,
}: SharePreviewParts): string => {
    const params = new URLSearchParams();
    const fullTitle = subtitle ? `${title} — ${subtitle}` : title;
    params.set('title', fullTitle);
    const trimmedDescription = description?.trim();
    if (trimmedDescription) {
        params.set(
            'description',
            truncateAtWord(trimmedDescription, DESCRIPTION_MAX)
        );
    }
    if (imageUrl) params.set('image', imageUrl);
    params.set('url', canonicalUrl);
    return `${API_BASE}/share/preview?${params.toString()}`;
};
