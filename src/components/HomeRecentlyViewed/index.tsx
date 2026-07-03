import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import moment from 'moment';
import { useSearchHistory } from 'api/hooks/useSearchHistory';
import './index.scss';

/**
 * Mobile home "Recently viewed" strip — horizontally scrollable cards of
 * the user's recent searches, each re-running the query via /search
 * (same target the /history page uses). The hook is enabled only when
 * logged in, so this self-hides for signed-out users; it also hides when
 * there's no history.
 */
const HomeRecentlyViewed = () => {
    const { t } = useTranslation();
    const { data } = useSearchHistory({ limit: 8 });

    const items = data?.items ?? [];
    if (items.length === 0) return null;

    return (
        <section className="home-recent">
            <div className="home-recent-head">
                <h2 className="home-recent-title">
                    <HistoryRoundedIcon className="home-recent-title-icon" />
                    {t('home.recent.title')}
                </h2>
                <Link to="/history" className="home-recent-seeall">
                    {t('home.seeAll')}
                </Link>
            </div>
            <div className="home-recent-cards">
                {items.map((item) => (
                    <Link
                        key={`${item.query}-${item.lastSearchedAt}`}
                        to={`/search?q=${encodeURIComponent(item.query)}`}
                        className="home-recent-card"
                    >
                        <HistoryRoundedIcon className="home-recent-card-icon" />
                        <span className="home-recent-card-query" title={item.query}>
                            {item.query}
                        </span>
                        <span className="home-recent-card-time">
                            {moment(item.lastSearchedAt).fromNow()}
                        </span>
                    </Link>
                ))}
            </div>
        </section>
    );
};

export default HomeRecentlyViewed;
