import './index.scss';
import { useTranslation } from 'react-i18next';
import CelebrationRoundedIcon from '@mui/icons-material/CelebrationRounded';
import DetailSection from 'components/PlaceDetail/DetailSection';
import { useCountryFacts } from 'api/hooks/useCountryFacts';

export interface FestivalsSectionProps {
    /** ISO-2 country code the festivals are curated / AI-generated for. */
    code: string;
}

/**
 * "Festivals & holidays" sidebar card — the big cultural moments worth planning
 * around (or dodging the crowds of), each with rough timing (a month/season,
 * since many are movable). Served on the same /country-facts payload as Quick
 * facts. Self-hides while loading, on error, and when there are none.
 */
const FestivalsSection = ({ code }: FestivalsSectionProps) => {
    const { t } = useTranslation();
    const { data } = useCountryFacts(code);
    const festivals = data?.festivals ?? [];
    if (festivals.length === 0) return null;

    return (
        <DetailSection
            className="festivals-section"
            title={t('festivals.title')}
            icon={<CelebrationRoundedIcon />}
        >
            <ul className="festivals-list">
                {festivals.map((festival) => (
                    <li key={festival.name} className="festivals-item">
                        <span className="festivals-name">{festival.name}</span>
                        {festival.when && (
                            <span className="festivals-when">
                                {festival.when}
                            </span>
                        )}
                    </li>
                ))}
            </ul>
        </DetailSection>
    );
};

export default FestivalsSection;
