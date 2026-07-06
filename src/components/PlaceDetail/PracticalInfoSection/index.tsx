import './index.scss';
import { useTranslation } from 'react-i18next';
import LuggageRoundedIcon from '@mui/icons-material/LuggageRounded';
import DetailSection from 'components/PlaceDetail/DetailSection';
import TravelBasicsRows, {
    TravelBasicsSkeleton,
} from 'components/PlaceDetail/TravelBasicsRows';
import LodgingRows, {
    LodgingSkeleton,
} from 'components/PlaceDetail/LodgingRows';
import type { LodgingInfo, TravelBasics } from 'types';

export interface PracticalInfoSectionProps {
    /** Travel-basics payload; `undefined` renders a skeleton. */
    basics: TravelBasics | undefined;
    /** Lodging payload; `undefined` renders a skeleton. */
    lodging: LodgingInfo | undefined;
    /** When true, the whole section renders nothing (pass the source query's
     *  `isError`). */
    isError?: boolean;
}

/**
 * "Practical information" — merges the former "Travel basics" (getting around,
 * payment, language, vibe…) and "Where to stay" (Airbnb/hotel, price, booking
 * tip) into one card with two labelled groups, so the main column carries one
 * practical section instead of two. Reuses the existing rows + skeletons.
 */
const PracticalInfoSection = ({
    basics,
    lodging,
    isError = false,
}: PracticalInfoSectionProps) => {
    const { t } = useTranslation();
    if (isError) return null;
    return (
        <DetailSection
            className="practical-info-section"
            title={t('detail.common.practicalInfo.title')}
            icon={<LuggageRoundedIcon />}
        >
            <div className="practical-info-group">
                <h3 className="practical-info-subtitle">
                    {t('detail.common.travelBasics.title')}
                </h3>
                {basics ? (
                    <TravelBasicsRows basics={basics} />
                ) : (
                    <TravelBasicsSkeleton />
                )}
            </div>
            <div className="practical-info-group">
                <h3 className="practical-info-subtitle">
                    {t('detail.common.lodging.title')}
                </h3>
                {lodging ? (
                    <LodgingRows lodging={lodging} />
                ) : (
                    <LodgingSkeleton />
                )}
            </div>
        </DetailSection>
    );
};

export default PracticalInfoSection;
