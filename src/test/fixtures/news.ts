/** Wire fixtures for `GET /news/top`. Raw envelope is private to the module,
 *  so the snake_case shape is pinned inline here. */
export const newsResponseFixture = {
    query: 'Tokyo travel',
    item: {
        title: 'Tokyo reopens historic district to tourists',
        source: 'Reuters',
        published_at: '2026-07-09T10:00:00Z',
        link: 'https://news.google.com/rss/articles/abc123',
    },
    search_url: 'https://news.google.com/search?q=Tokyo%20travel',
} as const;

/** Zero-results response — client maps `item` to null and the caller hides
 *  the widget. */
export const newsNoItemFixture = {
    query: 'zzqx obscure query',
    item: null,
    search_url: 'https://news.google.com/search?q=zzqx%20obscure%20query',
} as const;
