import './index.scss';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import DirectionsWalkRoundedIcon from '@mui/icons-material/DirectionsWalkRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import DetailSection from 'components/PlaceDetail/DetailSection';
import type { WalkabilityInfo } from 'types';

export interface WalkabilitySectionProps {
    /** Walkability read from the city/place details `facts` slice. `undefined`
     *  (still loading, or a row cached before this field) → the card hides. */
    walkability: WalkabilityInfo | undefined;
}

/**
 * "Walkability" sidebar card on a city / place detail page — a 1-5 rating of
 * how easy it is to get around on foot, plus a one-line note. City-scoped (a
 * whole country isn't "walkable"), so it comes from the per-place/city details
 * AI, not the country-level /country-facts. Self-hides when absent or rated 0.
 */
const WalkabilitySection = ({ walkability }: WalkabilitySectionProps) => {
    const { t } = useTranslation();
    if (!walkability || walkability.rating < 1) return null;

    const rating = Math.max(1, Math.min(5, Math.round(walkability.rating)));

    return (
        <DetailSection
            className="walkability-section"
            title={t('walkability.title')}
            icon={<DirectionsWalkRoundedIcon />}
        >
            <div
                className="walkability-stars"
                aria-label={t('walkability.ratingAria', { rating })}
            >
                {Array.from({ length: 5 }, (_, i) =>
                    i < rating ? (
                        <StarRoundedIcon
                            key={i}
                            className={classNames('walkability-star', 'is-on')}
                        />
                    ) : (
                        <StarBorderRoundedIcon
                            key={i}
                            className="walkability-star"
                        />
                    )
                )}
            </div>
            {walkability.note && (
                <p className="walkability-note">{walkability.note}</p>
            )}
        </DetailSection>
    );
};

export default WalkabilitySection;
