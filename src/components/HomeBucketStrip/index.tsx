import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import { useBucketList } from 'api/hooks/useBucketList';
import './index.scss';

// Cap the chips so a long bucket list doesn't build a giant off-screen
// scroller — the "See all" link carries the user to the full page.
const MAX_CHIPS = 8;

/**
 * Mobile home bucket-list strip — a horizontally scrollable row of the
 * user's goals as chips, with a count and a jump to /bucket-list. The
 * hook gates on auth, so this self-hides for signed-out users; it also
 * hides when the list is empty.
 */
const HomeBucketStrip = () => {
    const { t } = useTranslation();
    const { data } = useBucketList();

    const items = data ?? [];
    if (items.length === 0) return null;

    return (
        <section className="home-bucket">
            <div className="home-bucket-head">
                <h2 className="home-bucket-title">
                    <FavoriteRoundedIcon className="home-bucket-title-icon" />
                    {t('home.bucket.title')}
                    <span className="home-bucket-count">{items.length}</span>
                </h2>
                <Link to="/bucket-list" className="home-bucket-seeall">
                    {t('home.seeAll')}
                    <ArrowForwardRoundedIcon fontSize="small" />
                </Link>
            </div>
            <div className="home-bucket-chips">
                {items.slice(0, MAX_CHIPS).map((item) => (
                    <Link
                        key={item.id}
                        to="/bucket-list"
                        className="home-bucket-chip"
                    >
                        {item.emoji && (
                            <span
                                className="home-bucket-chip-emoji"
                                aria-hidden="true"
                            >
                                {item.emoji}
                            </span>
                        )}
                        <span className="home-bucket-chip-label">
                            {item.title || item.text}
                        </span>
                    </Link>
                ))}
            </div>
        </section>
    );
};

export default HomeBucketStrip;
