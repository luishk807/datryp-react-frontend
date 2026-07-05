import './index.scss';
import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import WaterDropRoundedIcon from '@mui/icons-material/WaterDropRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import NoDrinksRoundedIcon from '@mui/icons-material/NoDrinksRounded';
import DetailSection from 'components/PlaceDetail/DetailSection';
import { useCountryFacts } from 'api/hooks/useCountryFacts';
import type { WaterStatus } from 'api/countryFactsApi';

type IconType = ComponentType<{ className?: string }>;

const STATUS_META: Record<WaterStatus, { Icon: IconType; labelKey: string }> = {
    safe: { Icon: CheckCircleRoundedIcon, labelKey: 'tapWater.safe' },
    caution: { Icon: WarningAmberRoundedIcon, labelKey: 'tapWater.caution' },
    unsafe: { Icon: NoDrinksRoundedIcon, labelKey: 'tapWater.unsafe' },
};

export interface TapWaterSectionProps {
    /** ISO-2 country code the tap-water verdict is curated / AI-generated for. */
    code: string;
}

/**
 * "Tap water" sidebar card on a country / city / place detail page — the
 * safe-to-drink verdict (safe / use caution / not recommended) plus a short
 * practical note, color-coded green/orange/red. Served on the same
 * /country-facts payload as Quick facts. Self-hides while loading, on error,
 * and for any country with no verdict.
 */
const TapWaterSection = ({ code }: TapWaterSectionProps) => {
    const { t } = useTranslation();
    const { data } = useCountryFacts(code);
    const water = data?.water;
    if (!water) return null;

    const { Icon, labelKey } = STATUS_META[water.status];

    return (
        <DetailSection
            className="tap-water-section"
            title={t('tapWater.title')}
            icon={<WaterDropRoundedIcon />}
        >
            <div
                className={classNames(
                    'tap-water-verdict',
                    `is-${water.status}`
                )}
            >
                <Icon className="tap-water-verdict-icon" />
                <span className="tap-water-verdict-label">{t(labelKey)}</span>
            </div>
            {water.note && <p className="tap-water-note">{water.note}</p>}
        </DetailSection>
    );
};

export default TapWaterSection;
