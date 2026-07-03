import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import { useMyItineraries } from 'api/hooks/useItineraries';
import { useUser } from 'context/UserContext';
import {
    formatTripDateRange,
    selectInProgressTrips,
    tripPrimaryCountry,
} from 'utils/homeTrips';
import { countryCodeToFlag } from 'utils/countryFlag';
import { tripCardPlannedPercent } from 'utils/tripCardStats';
import './index.scss';

/**
 * Mobile home "Continue planning" hero — the user's top in-progress trip
 * with a planning-completeness bar and a jump into its detail page. Self-
 * hides for signed-out users and when there are no Planning/Confirmed
 * trips. Shares `selectInProgressTrips` with HomeUpcomingTrips so the trip
 * shown here is excluded from that list.
 */
const HomeContinuePlanning = () => {
    const { t } = useTranslation();
    const { user } = useUser();
    const { data } = useMyItineraries({ enabled: Boolean(user) });

    const top = selectInProgressTrips(data)[0];
    if (!top) return null;

    const { name: countryName, code } = tripPrimaryCountry(top);
    const dates = formatTripDateRange(top.startDate, top.endDate);
    const percent = tripCardPlannedPercent(top);
    const meta = [countryName, dates].filter(Boolean).join(' · ');

    return (
        <section className="home-continue">
            <h2 className="home-continue-title">
                <PlayArrowRoundedIcon className="home-continue-title-icon" />
                {t('home.continue.title')}
            </h2>
            <Link
                to={`/trip-detail?id=${top.apiId}`}
                className="home-continue-card"
            >
                <span className="home-continue-flag" aria-hidden="true">
                    {countryCodeToFlag(code)}
                </span>
                <span className="home-continue-body">
                    <span className="home-continue-name" title={top.name}>
                        {top.name}
                    </span>
                    {meta && <span className="home-continue-meta">{meta}</span>}
                    <span className="home-continue-progress">
                        <span className="home-continue-track">
                            {/* Width is data-driven — the one dynamic value
                                that can't live in CSS. */}
                            <span
                                className="home-continue-fill"
                                style={{ width: `${percent}%` }}
                            />
                        </span>
                        <span className="home-continue-pct">
                            {t('tripCard.planned', { pct: percent })}
                        </span>
                    </span>
                </span>
                <ArrowForwardRoundedIcon
                    className="home-continue-arrow"
                    fontSize="small"
                />
            </Link>
        </section>
    );
};

export default HomeContinuePlanning;
