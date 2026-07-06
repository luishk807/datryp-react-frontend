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

/**
 * "Internet" sidebar card on a country / city / place detail page — a 1-5
 * connectivity rating plus a one-line availability/speed feel and an optional
 * mobile-network note. Digital nomads and remote workers care a lot about this.
 * Served on the same /country-facts payload as Quick facts. Self-hides while
 * loading, on error, and for any country with no connectivity info.
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
        </DetailSection>
    );
};

export default WifiSection;
