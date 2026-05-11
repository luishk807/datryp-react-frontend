import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import classnames from 'classnames';
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

const Home = () => {
    const dispatch = useTripDispatch();
    const [isSingleSelected, setIsSingleSelected] = useState(true);
    const navigate = useNavigate();

    const heroImage = useMemo(
        () => HERO_IMAGES[Math.floor(Math.random() * HERO_IMAGES.length)],
        []
    );

    const handleClick = (id: number) => {
        setIsSingleSelected(TRIP_BASIC.SINGLE.id === id);
    };

    const handleSearchSelected = useCallback(
        (country: Country) => {
            if (!country?.name) return;
            const type = isSingleSelected ? TRIP_BASIC.SINGLE : TRIP_BASIC.MULTIPLE;
            const destinations = [{ country }] as Destination[];

            dispatch(resetTrip());
            dispatch(basicInfo({ type, destinations }));
            navigate(type.route, { replace: true });
        },
        [dispatch, isSingleSelected, navigate]
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
                        Plan a single getaway or a multi-stop journey in minutes.
                    </p>

                    <div
                        role="tablist"
                        aria-label="Trip type"
                        className={classnames('home-hero-options', {
                            'is-single': isSingleSelected,
                            'is-multiple': !isSingleSelected,
                        })}
                    >
                        <span className="hero-option-thumb" aria-hidden="true" />
                        <button
                            role="tab"
                            aria-selected={isSingleSelected}
                            className={classnames('hero-option', {
                                selected: isSingleSelected,
                            })}
                            onClick={() => handleClick(TRIP_BASIC.SINGLE.id)}
                        >
                            Single place
                        </button>
                        <button
                            role="tab"
                            aria-selected={!isSingleSelected}
                            className={classnames('hero-option', {
                                selected: !isSingleSelected,
                            })}
                            onClick={() => handleClick(TRIP_BASIC.MULTIPLE.id)}
                        >
                            Multiple locations
                        </button>
                    </div>

                    <div className="home-hero-search">
                        <SearchBar onSelected={handleSearchSelected} />
                    </div>
                </div>
            </section>

            <TopPlaces onPlaceClick={handlePlaceClick} />
        </Layout>
    );
};

export default Home;
