import NewspaperRoundedIcon from '@mui/icons-material/NewspaperRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import DetailSection from 'components/PlaceDetail/DetailSection';
import Skeleton from 'components/common/Skeleton';
import { useLatestNews } from 'api/hooks/useLatestNews';
import './index.scss';

export interface LatestNewsSectionProps {
    /** Country name — used as the news query when no place is set. */
    country?: string | null;
    /** Place / city name — biases the query toward the specific
     *  destination rather than country-wide stories. */
    placeName?: string | null;
}

/** Human-friendly "X hours ago" / "X days ago" style. Falls back to
 *  the raw date when too old to be relevant; returns empty string
 *  when the timestamp is missing. */
const formatRelative = (iso: string | null, t: TFunction): string => {
    if (!iso) return '';
    const ts = Date.parse(iso);
    if (!Number.isFinite(ts)) return '';
    const diffMs = Date.now() - ts;
    const diffMin = Math.round(diffMs / 60_000);
    if (diffMin < 1) return t('detail.common.news.justNow');
    if (diffMin < 60) return t('detail.common.news.minutesAgo', { n: diffMin });
    const diffHr = Math.round(diffMin / 60);
    if (diffHr < 24) return t('detail.common.news.hoursAgo', { n: diffHr });
    const diffDay = Math.round(diffHr / 24);
    if (diffDay <= 7) return t('detail.common.news.daysAgo', { n: diffDay });
    try {
        return new Date(ts).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return '';
    }
};

/**
 * "Latest news" sidebar card. Shows the actual #1 headline from
 * Google News for the destination — title, publisher, age — and a
 * "Go to source" button that opens the article directly. Replaces the
 * previous link-out-to-Google placeholder which made the user do the
 * search themselves.
 *
 * Falls back gracefully on every degraded state:
 *   - Empty query  → renders nothing.
 *   - Loading      → 2 skeleton bars (title + meta).
 *   - 502 / no item → renders the "see more" link to the search page.
 */
const LatestNewsSection = ({ country, placeName }: LatestNewsSectionProps) => {
    const { t } = useTranslation();
    const region = (country ?? '').trim();
    const place = (placeName ?? '').trim();
    if (!region && !place) return null;

    // Bias toward the specific destination; append `travel` so the
    // recommender prioritizes travel-relevant stories (weather,
    // advisories, transit disruptions) over generic geopolitical
    // noise. Mirrors the previous query construction.
    const queryParts = [place, region].filter(Boolean);
    const query = `${queryParts.join(' ')} travel`.trim();

    const { data, isLoading } = useLatestNews(query);
    const item = data?.item ?? null;

    // Hide the entire section when there's no top story (zero results,
    // 502 from the news service, etc). A "no news" placeholder card
    // is noise on a destination detail page — silent omission keeps
    // the sidebar focused on info the user can actually act on. The
    // loading skeleton still renders so the layout doesn't jump if a
    // headline does load a beat later.
    if (!isLoading && !item) return null;

    return (
        <DetailSection
            title={t('detail.common.news.title')}
            icon={<NewspaperRoundedIcon />}
        >
            <div className="latest-news">
                {isLoading && (
                    <>
                        <Skeleton width="92%" height={18} radius={4} />
                        <Skeleton width="55%" height={12} radius={4} />
                    </>
                )}

                {!isLoading && item && (
                    <>
                        <p className="latest-news-headline">
                            <span className="latest-news-headline-quote">
                                &ldquo;
                            </span>
                            {item.title}
                            <span className="latest-news-headline-quote">
                                &rdquo;
                            </span>
                        </p>
                        <p className="latest-news-meta">
                            {item.source && (
                                <span className="latest-news-source">
                                    {item.source}
                                </span>
                            )}
                            {item.publishedAt && (
                                <>
                                    {item.source && (
                                        <span className="latest-news-meta-sep">
                                            ·
                                        </span>
                                    )}
                                    <span className="latest-news-time">
                                        {formatRelative(item.publishedAt, t)}
                                    </span>
                                </>
                            )}
                        </p>
                        <a
                            className="latest-news-cta"
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <span>{t('detail.common.news.goToSource')}</span>
                            <OpenInNewRoundedIcon
                                className="latest-news-cta-icon"
                                fontSize="small"
                            />
                        </a>
                    </>
                )}
            </div>
        </DetailSection>
    );
};

export default LatestNewsSection;
