import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ButtonIcon from 'components/common/FormFields/ButtonIcon';
import { useAtlasStats } from 'hooks/useAtlasStats';
import { BUTTON_VARIANT } from 'constants';
import './index.scss';

/**
 * Compact Travel Atlas summary banner for the My Trips page — shows the
 * user's visited countries / cities / places + "% explored" with a button
 * into the full `/atlas-map`. Stats come from the shared `useAtlasStats`
 * hook so the figures match the Atlas page exactly.
 *
 * Hidden until the user has visited something (and while loading) so it
 * never flashes an empty "0 countries · 0% explored" card.
 */
const AtlasSummaryCard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { countries, cities, places, worldPct, isLoading } = useAtlasStats();

    if (isLoading || (countries === 0 && cities === 0 && places === 0)) {
        return null;
    }

    const stats: { value: string; label: string }[] = [
        {
            value: String(countries),
            label: t('atlasSummary.countries', { count: countries }),
        },
        {
            value: String(cities),
            label: t('atlasSummary.cities', { count: cities }),
        },
        {
            value: String(places),
            label: t('atlasSummary.places', { count: places }),
        },
        {
            value: `${worldPct.toFixed(1)}%`,
            label: t('atlasSummary.explored'),
        },
    ];

    return (
        <section
            className="atlas-summary-card"
            aria-label={t('atlasSummary.title')}
        >
            <div className="atlas-summary-main">
                <div className="atlas-summary-head">
                    <span className="atlas-summary-icon" aria-hidden>
                        🌎
                    </span>
                    <span className="atlas-summary-title">
                        {t('atlasSummary.title')}
                    </span>
                </div>
                <ul className="atlas-summary-stats">
                    {stats.map((s) => (
                        <li key={s.label} className="atlas-summary-stat">
                            <strong className="atlas-summary-stat-value">
                                {s.value}
                            </strong>
                            <span className="atlas-summary-stat-label">
                                {s.label}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
            <ButtonIcon
                type={BUTTON_VARIANT.TEXT_PLAIN}
                className="atlas-summary-cta"
                title={t('atlasSummary.open')}
                Icon={ArrowForwardRoundedIcon}
                iconPosition="end"
                iconProps={{ fontSize: 'small' }}
                ariaLabel={t('atlasSummary.open')}
                onClick={() => navigate('/atlas-map')}
            />
        </section>
    );
};

export default AtlasSummaryCard;
