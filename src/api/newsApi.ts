/**
 * Fetch wrapper for `GET /news/top` on the Python backend. Returns the
 * single top Google News story for a query, with publisher attribution
 * and a direct (Google-News-redirect) link to the source article.
 *
 * Powers the `LatestNewsSection` widget on country / city / place
 * detail pages — replaces the old "Open in Google News" CTA with a
 * real headline + source so trip planners can read the actual story
 * instead of being dumped on a search results page.
 */
const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface LatestNewsItem {
    title: string;
    /** Publisher name (e.g. "Reuters", "Fox News"). May be null when the
     *  upstream RSS item didn't carry a `<source>` element. */
    source: string | null;
    /** ISO 8601 UTC timestamp, or null when pubDate failed to parse. */
    publishedAt: string | null;
    /** Direct link to the article (Google News redirect). */
    link: string;
}

export interface LatestNewsResult {
    /** Echo of the query, for client-side cache keying. */
    query: string;
    /** Null when Google returned zero results — caller hides the widget. */
    item: LatestNewsItem | null;
    /** Google News search URL for the same query. Used as the "see more"
     *  fallback CTA. */
    searchUrl: string;
}

interface NewsItemRaw {
    title: string;
    source: string | null;
    published_at: string | null;
    link: string;
}

interface NewsTopResponseRaw {
    query: string;
    item: NewsItemRaw | null;
    search_url: string;
}

export const fetchTopNews = async (query: string): Promise<LatestNewsResult> => {
    const resp = await fetch(
        `${API_BASE}/news/top?q=${encodeURIComponent(query)}`
    );
    if (!resp.ok) {
        throw new Error(`/news/top failed: ${resp.status} ${resp.statusText}`);
    }
    const body = (await resp.json()) as NewsTopResponseRaw;
    return {
        query: body.query,
        searchUrl: body.search_url,
        item: body.item
            ? {
                  title: body.item.title,
                  source: body.item.source,
                  publishedAt: body.item.published_at,
                  link: body.item.link,
              }
            : null,
    };
};
