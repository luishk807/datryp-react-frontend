import './index.scss';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import WifiRoundedIcon from '@mui/icons-material/WifiRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import DetailSection from 'components/PlaceDetail/DetailSection';
import { useCountryFacts } from 'api/hooks/useCountryFacts';

export interface WifiSectionProps {
    /** ISO-2 country code the connectivity info is curated / AI-generated for. */
    code: string;
}

// Travel eSIM providers work globally (not country-specific), so they're a
// static pick rather than backend data — pulled out of the Essential-apps list
// into this card since "which eSIM?" is one of the most-searched travel Qs.
const ESIM_PROVIDERS = ['Airalo', 'Nomad', 'Holafly'];

/**
 * "Connectivity" sidebar card on a country / city / place detail page — a 1-5
 * internet rating plus a one-line availability/speed feel, an optional
 * mobile-network note, and the go-to travel eSIM picks. Digital nomads and
 * remote workers care a lot about this. The rating/summary ride the
 * /country-facts payload; the eSIM row is static. Self-hides while loading, on
 * error, and for any country with no connectivity info.
 */
const WifiSection = ({ code }: WifiSectionProps) => {
    const { t } = useTranslation();
    const { data } = useCountryFacts(code);
    const wifi = data?.wifi;
    if (!wifi) return null;

    const rating = Math.max(0, Math.min(5, Math.round(wifi.rating)));

    return (
        <DetailSection
            className="wifi-section"
            title={t('wifi.title')}
            icon={<WifiRoundedIcon />}
        >
            <div
                className="wifi-stars"
                aria-label={t('wifi.ratingAria', { rating })}
            >
                {Array.from({ length: 5 }, (_, i) =>
                    i < rating ? (
                        <StarRoundedIcon
                            key={i}
                            className={classNames('wifi-star', 'is-on')}
                        />
                    ) : (
                        <StarBorderRoundedIcon key={i} className="wifi-star" />
                    )
                )}
            </div>
            <p className="wifi-summary">{wifi.summary}</p>
            {wifi.mobile && <p className="wifi-mobile">{wifi.mobile}</p>}
            <div className="wifi-esim">
                <span className="wifi-esim-label">{t('wifi.esim')}</span>
                <span className="wifi-esim-value">
                    {ESIM_PROVIDERS.join(' · ')}
                </span>
            </div>
        </DetailSection>
    );
};

export default WifiSection;
