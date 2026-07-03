import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import LuggageRoundedIcon from '@mui/icons-material/LuggageRounded';
import { useMyItineraries } from 'api/hooks/useItineraries';
import { useUser } from 'context/UserContext';
import {
    formatTripDateRange,
    selectInProgressTrips,
    tripPrimaryCountry,
} from 'utils/homeTrips';
import { countryCodeToFlag } from 'utils/countryFlag';
import './index.scss';

/**
 * Mobile home "Upcoming trips" list — compact rows for the user's
 * Planning/Confirmed trips. Shares `selectInProgressTrips` with
 * HomeContinuePlanning and drops index 0 (shown there as the hero) so the
 * same trip isn't listed twice. Self-hides for signed-out users and when
 * there are no additional trips.
 */
const HomeUpcomingTrips = () => {
    const { t } = useTranslation();
    const { user } = useUser();
    const { data } = useMyItineraries({ enabled: Boolean(user) });

    // Drop index 0 (shown as the Continue-planning hero) and cap the list
    // to the next 5 so the strip stays short — "See all" carries the rest.
    const trips = selectInProgressTrips(data).slice(1, 6);
    if (trips.length === 0) return null;

    return (
        <section className="home-upcoming">
            <div className="home-upcoming-head">
                <h2 className="home-upcoming-title">
                    <LuggageRoundedIcon className="home-upcoming-title-icon" />
                    {t('home.upcoming.title')}
                </h2>
                <Link to="/trips" className="home-upcoming-seeall">
                    {t('home.seeAll')}
                </Link>
            </div>
            <ul className="home-upcoming-list">
                {trips.map((trip) => {
                    const { name: countryName, code } =
                        tripPrimaryCountry(trip);
                    const dates = formatTripDateRange(
                        trip.startDate,
                        trip.endDate
                    );
                    const meta = [countryName, dates]
                        .filter(Boolean)
                        .join(' · ');
                    return (
                        <li key={trip.apiId}>
                            <Link
                                to={`/trip-detail?id=${trip.apiId}`}
                                className="home-upcoming-row"
                            >
                                <span
                                    className="home-upcoming-flag"
                                    aria-hidden="true"
                                >
                                    {countryCodeToFlag(code)}
                                </span>
                                <span className="home-upcoming-text">
                                    <span
                                        className="home-upcoming-name"
                                        title={trip.name}
                                    >
                                        {trip.name}
                                    </span>
                                    {meta && (
                                        <span className="home-upcoming-meta">
                                            {meta}
                                        </span>
                                    )}
                                </span>
                                <ChevronRightRoundedIcon className="home-upcoming-chevron" />
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
};

export default HomeUpcomingTrips;
