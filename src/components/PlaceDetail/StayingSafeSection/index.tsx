import './index.scss';
import { useTranslation } from 'react-i18next';
import HealthAndSafetyRoundedIcon from '@mui/icons-material/HealthAndSafetyRounded';
import DetailSection from 'components/PlaceDetail/DetailSection';
import { useCountryFacts } from 'api/hooks/useCountryFacts';

export interface StayingSafeSectionProps {
    /** ISO-2 country code the safety tips are curated / AI-generated for. */
    code: string;
}

/**
 * "Staying safe" sidebar card — the actionable "watch out for X" pointers
 * (petty crime, common scams, transport to be careful with) that complement the
 * numeric safety score shown in the hero. Served on the same /country-facts
 * payload as Quick facts. Self-hides while loading, on error, and when there
 * are no tips.
 */
const StayingSafeSection = ({ code }: StayingSafeSectionProps) => {
    const { t } = useTranslation();
    const { data } = useCountryFacts(code);
    const tips = data?.safetyTips ?? [];
    if (tips.length === 0) return null;

    return (
        <DetailSection
            className="staying-safe-section"
            title={t('stayingSafe.title')}
            icon={<HealthAndSafetyRoundedIcon />}
        >
            <ul className="staying-safe-list">
                {tips.map((tip) => (
                    <li key={tip} className="staying-safe-item">
                        {tip}
                    </li>
                ))}
            </ul>
        </DetailSection>
    );
};

export default StayingSafeSection;
