import './index.scss';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import AirRoundedIcon from '@mui/icons-material/AirRounded';
import DetailSection from 'components/PlaceDetail/DetailSection';
import { useAirQuality } from 'api/hooks/useAirQuality';
import type { Coordinates } from 'types';

export interface AirQualitySectionProps {
    /** Destination coordinates (capital for a country, the point for a
     *  place/city). `undefined` until the facts slice resolves them — the
     *  card stays hidden until then. */
    coordinates: Coordinates | undefined;
}

/**
 * "Air quality" sidebar card — the real current US AQI at the destination,
 * fetched live from Open-Meteo (air quality is hyper-local and swings by season,
 * so it's a coordinate-based fetch, not a curated fact). Color-coded by AQI
 * band. Best-effort: self-hides while loading, on error (502 → upstream down),
 * and when coordinates are missing.
 */
const AirQualitySection = ({ coordinates }: AirQualitySectionProps) => {
    const { t } = useTranslation();
    const { data } = useAirQuality(coordinates?.lat, coordinates?.lng);
    if (!data) return null;

    return (
        <DetailSection
            className="air-quality-section"
            title={t('airQuality.title')}
            icon={<AirRoundedIcon />}
        >
            <div
                className={classNames(
                    'air-quality-verdict',
                    `is-${data.categoryKey}`
                )}
            >
                <span className="air-quality-aqi">{data.aqi}</span>
                <span className="air-quality-category">
                    {t(`airQuality.bands.${data.categoryKey}`)}
                </span>
            </div>
            <p className="air-quality-sub">{t('airQuality.sub')}</p>
        </DetailSection>
    );
};

export default AirQualitySection;
