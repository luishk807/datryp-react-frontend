import NewspaperRoundedIcon from '@mui/icons-material/NewspaperRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import DetailSection from 'components/PlaceDetail/DetailSection';
import './index.scss';

export interface LatestNewsSectionProps {
    /** Country name — drives the Google News search query. Falls back to
     *  the place name if the country isn't available. */
    country?: string | null;
    /** Place / city name — appended to the query to bias toward results
     *  about the specific destination rather than country-wide stories. */
    placeName?: string | null;
}

/**
 * "Latest news" sidebar card. Sends the reader to a Google News search
 * for the country (and optionally the specific place) in a new tab.
 * Intentionally lightweight — no API key, no proxy, no rate-limiting —
 * just a curated outbound link so trip-planners can spot active issues
 * (weather, unrest, advisories) before they commit.
 */
const LatestNewsSection = ({ country, placeName }: LatestNewsSectionProps) => {
    const region = (country ?? '').trim();
    const place = (placeName ?? '').trim();
    if (!region && !place) return null;

    const queryParts = [place, region].filter(Boolean);
    const headline = region || place;
    const newsUrl = `https://news.google.com/search?q=${encodeURIComponent(
        `${queryParts.join(' ')} travel`
    )}&hl=en-US&gl=US&ceid=US:en`;

    return (
        <DetailSection title="Latest news" icon={<NewspaperRoundedIcon />}>
            <div className="latest-news">
                <p className="latest-news-lead">
                    Top stories from{' '}
                    <span className="latest-news-region">{headline}</span> —
                    weather, unrest, travel advisories.
                </p>
                <a
                    className="latest-news-cta"
                    href={newsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <span>Open in Google News</span>
                    <OpenInNewRoundedIcon
                        className="latest-news-cta-icon"
                        fontSize="small"
                    />
                </a>
                <p className="latest-news-hint">
                    Free & live — opens in a new tab.
                </p>
            </div>
        </DetailSection>
    );
};

export default LatestNewsSection;
