import './index.scss';
import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import SmartphoneRoundedIcon from '@mui/icons-material/SmartphoneRounded';
import DirectionsCarFilledRoundedIcon from '@mui/icons-material/DirectionsCarFilledRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import RestaurantRoundedIcon from '@mui/icons-material/RestaurantRounded';
import SignalCellularAltRoundedIcon from '@mui/icons-material/SignalCellularAltRounded';
import ChatRoundedIcon from '@mui/icons-material/ChatRounded';
import DetailSection from 'components/PlaceDetail/DetailSection';
import { useEssentialApps } from 'api/hooks/useEssentialApps';

type IconType = ComponentType<{ className?: string }>;

const CATEGORY_ICON: Record<string, IconType> = {
    ride_hailing: DirectionsCarFilledRoundedIcon,
    payments: PaymentsRoundedIcon,
    maps: MapRoundedIcon,
    food: RestaurantRoundedIcon,
    connectivity: SignalCellularAltRoundedIcon,
    messaging: ChatRoundedIcon,
};

export interface EssentialAppsSectionProps {
    /** ISO-2 country code the apps are curated for. */
    code: string;
}

/**
 * "Essential apps" card on a country / city / place detail page — the apps a
 * traveler actually needs on the ground, grouped by category. Self-hides while
 * loading, on error, and for any country without curated data (backend 204 →
 * hook resolves to null).
 */
const EssentialAppsSection = ({ code }: EssentialAppsSectionProps) => {
    const { t } = useTranslation();
    const { data } = useEssentialApps(code);

    if (!data || data.categories.length === 0) return null;

    return (
        <DetailSection
            title={t('essentialApps.title')}
            icon={<SmartphoneRoundedIcon />}
        >
            <p className="essential-apps-intro">{t('essentialApps.intro')}</p>
            <ul className="essential-apps-cats">
                {data.categories.map((cat) => {
                    const Icon = CATEGORY_ICON[cat.key] ?? SmartphoneRoundedIcon;
                    return (
                        <li key={cat.key} className="essential-apps-cat">
                            <div className="essential-apps-cat-head">
                                <Icon className="essential-apps-cat-icon" />
                                <span className="essential-apps-cat-label">
                                    {t(`essentialApps.categories.${cat.key}`)}
                                </span>
                            </div>
                            <ul className="essential-apps-list">
                                {cat.apps.map((app) => (
                                    <li
                                        key={app.name}
                                        className={classNames(
                                            'essential-apps-item',
                                            {
                                                'is-essential':
                                                    app.status === 'essential',
                                                'is-caution':
                                                    app.status === 'caution',
                                            }
                                        )}
                                    >
                                        <span className="essential-apps-name">
                                            {app.name}
                                        </span>
                                        {app.note && (
                                            <span className="essential-apps-note">
                                                {app.note}
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </li>
                    );
                })}
            </ul>
            <p className="essential-apps-disclaimer">
                {t('essentialApps.disclaimer')}
            </p>
        </DetailSection>
    );
};

export default EssentialAppsSection;
