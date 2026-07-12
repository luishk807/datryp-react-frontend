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
            contentRead="items"
        >
            <ul className="staying-safe-list">
                {tips.map((tip) => (
                    // Each tip is its own keyboard tab stop so screen-reader +
                    // keyboard users Tab through them one by one, rather than the
                    // whole card being a single stop.
                    <li
                        key={tip}
                        className="staying-safe-item"
                        tabIndex={0}
                        aria-label={tip}
                    >
                        {tip}
                    </li>
                ))}
            </ul>
        </DetailSection>
    );
};

export default StayingSafeSection;
