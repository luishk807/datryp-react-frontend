import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { useAtlasStats } from 'hooks/useAtlasStats';
import './index.scss';

/**
 * Travel Atlas summary banner for the My Trips page — shows the user's
 * explorer level + visited countries/places + "% explored" and jumps into the
 * full `/atlas-map`. The WHOLE card is the click target (a single button); the
 * "Open Atlas →" is just a visual affordance. Stats + level come from the
 * shared `useAtlasStats` hook so everything matches the Atlas page.
 *
 * Hidden until the user has visited something (and while loading) so it never
 * flashes an empty "0 countries · 0% explored" card.
 */
const AtlasSummaryCard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { countries, cities, places, worldPct, level, isLoading } =
        useAtlasStats();

    if (isLoading || (countries === 0 && cities === 0 && places === 0)) {
        return null;
    }

    const countLine = [
        t('atlasSummary.countCountries', { count: countries }),
        t('atlasSummary.countCities', { count: cities }),
        t('atlasSummary.countPlaces', { count: places }),
    ].join(' • ');

    return (
        <button
            type="button"
            className="atlas-summary-card"
            onClick={() => navigate('/atlas-map')}
            aria-label={t('atlasSummary.open')}
        >
            <span className="atlas-summary-main">
                <span className="atlas-summary-eyebrow">
                    <span className="atlas-summary-icon" aria-hidden>
                        🌎
                    </span>
                    {t('atlasSummary.title')}
                </span>
                <span className="atlas-summary-level">
                    {t(`atlas.level.${level.levelKey}`)}
                </span>
                <span className="atlas-summary-stat-line">{countLine}</span>
                <span className="atlas-summary-explored">
                    {t('atlas.stats.worldExplored', {
                        pct: worldPct.toFixed(1),
                    })}
                </span>
            </span>
            <span className="atlas-summary-cta" aria-hidden>
                {t('atlasSummary.open')}
                <ArrowForwardRoundedIcon fontSize="small" />
            </span>
        </button>
    );
};

export default AtlasSummaryCard;
