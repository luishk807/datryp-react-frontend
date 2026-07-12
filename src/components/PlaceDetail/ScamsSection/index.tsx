import './index.scss';
import { useTranslation } from 'react-i18next';
import ReportProblemRoundedIcon from '@mui/icons-material/ReportProblemRounded';
import DetailSection from 'components/PlaceDetail/DetailSection';
import { useCountryFacts } from 'api/hooks/useCountryFacts';

export interface ScamsSectionProps {
    /** ISO-2 country code the scams are curated / AI-generated for. */
    code: string;
}

/**
 * "Common scams" sidebar card — the specific tourist cons to recognize (taxi
 * tricks, gem-shop redirects, distraction thefts, fake tickets/police), distinct
 * from the general "Staying safe" precautions. Served on the same /country-facts
 * payload. Self-hides while loading, on error, and when there are none.
 */
const ScamsSection = ({ code }: ScamsSectionProps) => {
    const { t } = useTranslation();
    const { data } = useCountryFacts(code);
    const scams = data?.scams ?? [];
    if (scams.length === 0) return null;

    return (
        <DetailSection
            className="scams-section"
            title={t('scams.title')}
            icon={<ReportProblemRoundedIcon />}
            contentRead="items"
        >
            <ul className="scams-list">
                {scams.map((scam) => (
                    // Each scam is its own keyboard tab stop so screen-reader +
                    // keyboard users Tab through them one by one, rather than the
                    // whole card being a single stop.
                    <li
                        key={scam}
                        className="scams-item"
                        tabIndex={0}
                        aria-label={scam}
                    >
                        {scam}
                    </li>
                ))}
            </ul>
        </DetailSection>
    );
};

export default ScamsSection;
