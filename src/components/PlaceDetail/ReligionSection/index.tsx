import './index.scss';
import { useTranslation } from 'react-i18next';
import Diversity3RoundedIcon from '@mui/icons-material/Diversity3Rounded';
import DetailSection from 'components/PlaceDetail/DetailSection';
import { useCountryFacts } from 'api/hooks/useCountryFacts';

export interface ReligionSectionProps {
    /** ISO-2 country code the religion facts are curated for. */
    code: string;
}

/**
 * "Religion" sidebar card on a country / city / place detail page — the
 * dominant faith (with its glyph) plus a few practical, travel-relevant customs
 * (dress at religious sites, shoes off, Ramadan hours…). All hand-curated on
 * the backend (never AI — a clumsy machine take on a country's religion is
 * worse than none), served on the same /country-facts payload as Quick facts.
 * Self-hides while loading, on error, and for any uncurated country (204 →
 * hook resolves to null → `data.religion` is null).
 */
const ReligionSection = ({ code }: ReligionSectionProps) => {
    const { t } = useTranslation();
    const { data } = useCountryFacts(code);
    const religion = data?.religion;
    if (!religion) return null;

    return (
        <DetailSection
            className="religion-section"
            title={t('religion.title')}
            icon={
                religion.emoji ? (
                    <span className="religion-emoji" aria-hidden>
                        {religion.emoji}
                    </span>
                ) : (
                    <Diversity3RoundedIcon />
                )
            }
        >
            <p className="religion-main">
                <span className="religion-name">{religion.main}</span>
                {religion.note && (
                    <span className="religion-note"> · {religion.note}</span>
                )}
            </p>

            {religion.customs.length > 0 && (
                <>
                    <p className="religion-customs-label">
                        {t('religion.customsLabel')}
                    </p>
                    <ul className="religion-customs">
                        {religion.customs.map((custom) => (
                            <li key={custom} className="religion-custom">
                                {custom}
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </DetailSection>
    );
};

export default ReligionSection;
