import './index.scss';
import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import SmartphoneRoundedIcon from '@mui/icons-material/SmartphoneRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import DirectionsCarFilledRoundedIcon from '@mui/icons-material/DirectionsCarFilledRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import RestaurantRoundedIcon from '@mui/icons-material/RestaurantRounded';
import SignalCellularAltRoundedIcon from '@mui/icons-material/SignalCellularAltRounded';
import ChatRoundedIcon from '@mui/icons-material/ChatRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
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
 * data (backend 204 → hook resolves to null). Curated countries are shown
 * plainly (hand-verified); AI-sourced fallbacks carry an "auto-suggested —
 * verify" notice so nothing unverified is presented as fact.
 */
const EssentialAppsSection = ({ code }: EssentialAppsSectionProps) => {
    const { t } = useTranslation();
    const { data } = useEssentialApps(code);

    if (!data || data.categories.length === 0) return null;

    // The heads-up is framed from a home-country traveler's perspective ("the
    // apps you use at home may not work here"), so it's noise on the US page
    // itself — hide it there.
    const isHomeCountry = code.trim().toUpperCase() === 'US';
    // AI-generated data is never presented as verified fact — surface an
    // "auto-suggested — verify" notice and suppress the generic heads-up so
    // there's a single, honest callout about where this list came from.
    const isAiSourced = data.source === 'ai';

    return (
        <DetailSection
            className="essential-apps-section"
            title={t('essentialApps.title')}
            icon={<SmartphoneRoundedIcon />}
        >
            <p className="essential-apps-intro">{t('essentialApps.intro')}</p>
            {isAiSourced && (
                <div className="essential-apps-ai-notice">
                    <AutoAwesomeRoundedIcon className="essential-apps-ai-notice-icon" />
                    <div className="essential-apps-ai-notice-text">
                        <span className="essential-apps-ai-notice-title">
                            {t('essentialApps.aiNotice.title')}
                        </span>
                        <span className="essential-apps-ai-notice-body">
                            {t('essentialApps.aiNotice.body')}
                        </span>
                    </div>
                </div>
            )}
            {!isHomeCountry && !isAiSourced && (
                <div className="essential-apps-headsup">
                    <PublicRoundedIcon className="essential-apps-headsup-icon" />
                    <div className="essential-apps-headsup-text">
                        <span className="essential-apps-headsup-title">
                            {t('essentialApps.headsUp.title')}
                        </span>
                        <span className="essential-apps-headsup-body">
                            {t('essentialApps.headsUp.body')}
                        </span>
                    </div>
                </div>
            )}
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
