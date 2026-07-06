import './index.scss';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import DetailSection from 'components/PlaceDetail/DetailSection';
import {
    useResidenceCountry,
    useTravelAdvisory,
} from 'api/hooks/useTravelAdvisory';

export interface TravelAdvisorySectionProps {
    /** ISO-2 code of the DESTINATION country. */
    destination: string;
}

// ISO-2 country code → regional-indicator flag emoji.
const flagEmoji = (code: string): string =>
    code
        .toUpperCase()
        .replace(/[A-Z]/g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));

/**
 * "Official travel advisory" card — the advisory LEVEL this destination carries
 * according to the traveler's OWN government (their saved home country, else
 * their IP-geolocated country). Personalized: a US resident sees the State Dept
 * level, a Canadian sees Canada's. Placed under Visa. Self-hides when we have no
 * advisory for the (destination, residence) pair — same country, unsupported
 * residence, or uncurated — so it never shows a generic/irrelevant read.
 */
const TravelAdvisorySection = ({ destination }: TravelAdvisorySectionProps) => {
    const { t } = useTranslation();
    const source = useResidenceCountry();
    const { data } = useTravelAdvisory(destination, source);
    if (!data) return null;

    return (
        <DetailSection
            className="travel-advisory-section"
            title={t('travelAdvisory.title')}
            icon={<PublicRoundedIcon />}
        >
            <div className="ta-source">
                <span className="ta-flag" aria-hidden>
                    {flagEmoji(data.sourceCode)}
                </span>
                <span className="ta-source-name">{data.sourceName}</span>
            </div>
            <div className={classNames('ta-level', `is-${data.level}`)}>
                <span className="ta-level-badge">
                    {t('travelAdvisory.level', { n: data.level })}
                </span>
                <span className="ta-level-label">{data.label}</span>
            </div>
            <p className="ta-meta">
                {t('travelAdvisory.reviewed', { date: data.updated })}
            </p>
            <a
                className="ta-link"
                href={data.url}
                target="_blank"
                rel="noopener noreferrer"
            >
                {t('travelAdvisory.readMore')}
                <OpenInNewRoundedIcon className="ta-link-icon" />
            </a>
        </DetailSection>
    );
};

export default TravelAdvisorySection;
