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
 * loading, on error, and for any country with neither curated nor AI-generated
 * data (backend 204 → hook resolves to null). Both curated and AI-sourced
 * lists render the same way, under one quiet italic "approximate — verify"
 * note (the page's shared disclaimer style) rather than a colored warning box,
 * so the app list stays the focus.
 */
const EssentialAppsSection = ({ code }: EssentialAppsSectionProps) => {
    const { t } = useTranslation();
    const { data } = useEssentialApps(code);

    if (!data || data.categories.length === 0) return null;

    return (
        <DetailSection
            className="essential-apps-section"
            title={t('essentialApps.title')}
            icon={<SmartphoneRoundedIcon />}
        >
            <p className="essential-apps-intro">{t('essentialApps.intro')}</p>
            {/* Why the list matters: the apps a traveler uses back home
                often don't work at the destination — blocked or limited
                (e.g. Uber / Google / WhatsApp in China) — so locals reach
                for different ones. Plain readable line, not a box. */}
            <p className="essential-apps-intro">{t('essentialApps.homeNote')}</p>
            {/* One quiet, italic gray note in the page's shared disclaimer
                language — no colored box — so the list, not a warning, leads. */}
            <p className="essential-apps-approx">{t('essentialApps.note')}</p>
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
        </DetailSection>
    );
};

export default EssentialAppsSection;
