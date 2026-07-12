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
            contentRead="items"
        >
            <ul className="etiquette-list">
                {tips.map((tip) => (
                    // Each tip is its own keyboard tab stop, so screen-reader +
                    // keyboard users Tab through them and hear each tip rather
                    // than the whole card being a single stop. A listitem isn't a
                    // name-from-content role, so it needs an explicit aria-label.
                    <li
                        key={tip}
                        className="etiquette-item"
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

export default EtiquetteSection;
