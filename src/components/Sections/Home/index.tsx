import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import classnames from 'classnames';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import './index.css';
import SearchBar from 'components/SearchBar';
import Layout from 'components/common/Layout';
import { TRIP_BASIC } from 'constants';
import { basicInfo, resetTrip, useTripDispatch } from 'context/TripContext';
import type { TopPlace } from 'sample/topPlaces';
import TopPlaces from 'components/TopPlaces';
import type { Country, Destination } from 'types';

const HERO_IMAGES = [
    '/images/sample/iceland.jpg',
    '/images/sample/china1.jpg',
    '/images/sample/china2.jpg',
    '/images/sample/vietnam.jpg',
];

type TripMode = 'single' | 'multiple' | 'recommend';

const Home = () => {
    const dispatch = useTripDispatch();
    const [tripMode, setTripMode] = useState<TripMode>('single');
    const navigate = useNavigate();

    const heroImage = useMemo(
        () => HERO_IMAGES[Math.floor(Math.random() * HERO_IMAGES.length)],
        []
    );

    const handleSearchSelected = useCallback(
        (country: Country) => {
            if (!country?.name) return;
            // 'recommend' mode kicks off a single-trip flow with the chosen destination.
            const type =
                tripMode === 'multiple' ? TRIP_BASIC.MULTIPLE : TRIP_BASIC.SINGLE;
            const destinations = [{ country }] as Destination[];

            dispatch(resetTrip());
            dispatch(basicInfo({ type, destinations }));
            navigate(type.route, { replace: true });
        },
        [dispatch, tripMode, navigate]
    );

    const handlePlaceClick = (place: TopPlace) => {
        const country: Country = {
            id: place.id,
            name: place.country,
            code: place.countryCode,
        };
        const destinations = [{ country }] as Destination[];
        dispatch(resetTrip());
        dispatch(basicInfo({ type: TRIP_BASIC.SINGLE, destinations }));
        navigate(TRIP_BASIC.SINGLE.route, { replace: true });
    };

    return (
        <Layout>
            <section
                className="home-hero"
                style={{ backgroundImage: `url(${heroImage})` }}
            >
                <div className="home-hero-overlay" />
                <div className="home-hero-content">
                    <h1 className="home-hero-title">Where to next?</h1>
                    <p className="home-hero-subtitle">
                        Plan a single getaway, a multi-stop journey, or let AI find your match.
                    </p>

                    <div
                        role="tablist"
                        aria-label="Trip type"
                        className={classnames('home-hero-options', `is-${tripMode}`)}
                    >
                        <span className="hero-option-thumb" aria-hidden="true" />
                        <button
                            role="tab"
                            aria-selected={tripMode === 'single'}
                            className={classnames('hero-option', {
                                selected: tripMode === 'single',
                            })}
                            onClick={() => setTripMode('single')}
                        >
                            Single place
                        </button>
                        <button
                            role="tab"
                            aria-selected={tripMode === 'multiple'}
                            className={classnames('hero-option', {
                                selected: tripMode === 'multiple',
                            })}
                            onClick={() => setTripMode('multiple')}
                        >
                            Multiple locations
                        </button>
                        <button
                            role="tab"
                            aria-selected={tripMode === 'recommend'}
                            className={classnames('hero-option', 'is-ai', {
                                selected: tripMode === 'recommend',
                            })}
                            onClick={() => setTripMode('recommend')}
                        >
                            <AutoAwesomeIcon className="hero-option-icon" />
                            <span>Recommend</span>
                            <span className="hero-option-ai-badge">AI</span>
                        </button>
                    </div>

                    <div className="home-hero-search">
                        <SearchBar
                            onSelected={handleSearchSelected}
                            mode={tripMode === 'recommend' ? 'recommend' : 'country'}
                        />
                    </div>
                </div>
            </section>

            <TopPlaces onPlaceClick={handlePlaceClick} />
        </Layout>
    );
};

export default Home;
