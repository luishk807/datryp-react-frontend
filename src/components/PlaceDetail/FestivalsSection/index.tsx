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
            contentRead="items"
        >
            <ul className="festivals-list">
                {festivals.map((festival) => (
                    // Each festival is its own keyboard tab stop, so screen-reader
                    // + keyboard users Tab through them and hear each name + timing
                    // rather than the whole card being a single stop. The aria-label
                    // carries the full text (the visible spans aren't a
                    // name-from-content role on their own).
                    <li
                        key={festival.name}
                        className="festivals-item"
                        tabIndex={0}
                        aria-label={
                            festival.when
                                ? `${festival.name}. ${festival.when}`
                                : festival.name
                        }
                    >
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
