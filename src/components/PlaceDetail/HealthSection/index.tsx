import './index.scss';
import { useTranslation } from 'react-i18next';
import VaccinesRoundedIcon from '@mui/icons-material/VaccinesRounded';
import DetailSection from 'components/PlaceDetail/DetailSection';
import { useCountryFacts } from 'api/hooks/useCountryFacts';

const ROW_KEYS = ['vaccinations', 'mosquitoes', 'malaria'] as const;

export interface HealthSectionProps {
    /** ISO-2 country code the health basics are curated / AI-generated for. */
    code: string;
}

/**
 * "Health" sidebar card — traveler-health basics (vaccinations, mosquito-borne
 * risk, malaria). Served on the same /country-facts payload. Always carries a
 * "consult a travel clinic" note (health guidance is individual and changes),
 * independent of the source-based caveat. Self-hides when there's nothing.
 */
const HealthSection = ({ code }: HealthSectionProps) => {
    const { t } = useTranslation();
    const { data } = useCountryFacts(code);
    const health = data?.health;
    if (!health) return null;

    const rows = ROW_KEYS.filter((key) => health[key]).map((key) => ({
        key,
        label: t(`health.${key}`),
        value: health[key] as string,
    }));
    if (rows.length === 0) return null;

    return (
        <DetailSection
            className="health-section"
            title={t('health.title')}
            icon={<VaccinesRoundedIcon />}
        >
            <ul className="health-list">
                {rows.map((row) => (
                    <li key={row.key} className="health-row">
                        <span className="health-label">{row.label}</span>
                        <span className="health-value">{row.value}</span>
                    </li>
                ))}
            </ul>
            <p className="health-note">{t('health.note')}</p>
        </DetailSection>
    );
};

export default HealthSection;
