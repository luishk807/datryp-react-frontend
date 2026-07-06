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
import type { LodgingInfo, NeighborhoodTips, TravelBasics } from 'types';

export interface PracticalInfoSectionProps {
    /** Travel-basics payload; `undefined` renders a skeleton. */
    basics: TravelBasics | undefined;
    /** Lodging payload; `undefined` renders a skeleton. */
    lodging: LodgingInfo | undefined;
    /** Best areas to stay + areas to avoid (city/place only). Rendered under
     *  "Where to stay"; omitted on country pages and older cached rows. */
    neighborhoods?: NeighborhoodTips;
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
    neighborhoods,
    isError = false,
}: PracticalInfoSectionProps) => {
    const { t } = useTranslation();
    if (isError) return null;

    const best = neighborhoods?.best ?? [];
    const avoid = neighborhoods?.avoid ?? [];
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
                {(best.length > 0 || avoid.length > 0) && (
                    <div className="practical-info-neighborhoods">
                        {best.length > 0 && (
                            <div className="pi-nb">
                                <span className="pi-nb-label">
                                    {t('detail.common.neighborhoods.best')}
                                </span>
                                <ul className="pi-nb-list">
                                    {best.map((area) => (
                                        <li key={area} className="pi-nb-item is-best">
                                            {area}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {avoid.length > 0 && (
                            <div className="pi-nb">
                                <span className="pi-nb-label">
                                    {t('detail.common.neighborhoods.avoid')}
                                </span>
                                <ul className="pi-nb-list">
                                    {avoid.map((area) => (
                                        <li key={area} className="pi-nb-item is-avoid">
                                            {area}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </DetailSection>
    );
};

export default PracticalInfoSection;
