import './index.scss';
import { useTranslation } from 'react-i18next';
import WavingHandRoundedIcon from '@mui/icons-material/WavingHandRounded';
import DetailSection from 'components/PlaceDetail/DetailSection';
import { useCountryFacts } from 'api/hooks/useCountryFacts';

export interface EtiquetteSectionProps {
    /** ISO-2 country code the etiquette tips are curated / AI-generated for. */
    code: string;
}

/**
 * "Local etiquette" sidebar card — the everyday do's and don'ts that help a
 * visitor not accidentally offend (greetings, gestures, dining, dress,
 * punctuality). Broader than the religion customs. Served on the same
 * /country-facts payload as Quick facts. Self-hides while loading, on error,
 * and when there are no tips.
 */
const EtiquetteSection = ({ code }: EtiquetteSectionProps) => {
    const { t } = useTranslation();
    const { data } = useCountryFacts(code);
    const tips = data?.etiquette ?? [];
    if (tips.length === 0) return null;

    return (
        <DetailSection
            className="etiquette-section"
            title={t('etiquette.title')}
            icon={<WavingHandRoundedIcon />}
        >
            <ul className="etiquette-list">
                {tips.map((tip) => (
                    <li key={tip} className="etiquette-item">
                        {tip}
                    </li>
                ))}
            </ul>
        </DetailSection>
    );
};

export default EtiquetteSection;
