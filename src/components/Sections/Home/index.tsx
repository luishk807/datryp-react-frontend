import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { gql } from 'graphql-request';
import classnames from 'classnames';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import './index.scss';
import SearchBar from 'components/SearchBar';
import Layout from 'components/common/Layout';
import { FALLBACK_HERO_IMAGES, TRIP_BASIC, TRIP_MODE } from 'constants';
import { basicInfo, resetTrip, useTripDispatch } from 'context/TripContext';
import type { TopPlace } from 'sample/topPlaces';
import TopPlaces from 'components/TopPlaces';
import { pythonGqlClient } from 'api/pythonGqlClient';
import { useHeroImages } from 'api/hooks/useHeroImages';
import type { Country, Destination, HeroImage, TripMode } from 'types';

const COUNTRY_LOOKUP_QUERY = gql`
    query CountryLookup($query: String!) {
        countries(query: $query, limit: 10) {
            id
            name
            code
            local
            image
        }
    }
`;

interface CountryLookupResult {
    countries: Array<{
        id: string;
        name: string;
        code: string;
        local: string | null;
        image: string | null;
    }>;
}

/**
 * Look up a backend Country UUID by name + ISO code. TopPlaces ships with
 * sample numeric IDs that don't match anything in the DB, so we resolve to
 * the real row before dispatching to TripContext — otherwise the
 * saveItinerary mutation rejects "1" as a malformed UUID.
 */
const resolveCountryByCode = async (
    countryName: string,
    code: string
): Promise<Country | null> => {
    try {
        const result = await pythonGqlClient.request<CountryLookupResult>(
            COUNTRY_LOOKUP_QUERY,
            { query: countryName }
        );
        const match =
            result.countries.find((c) => c.code === code) ?? result.countries[0];
        if (!match) return null;
        return {
            id: match.id,
            name: match.name,
            code: match.code,
            local: match.local ?? undefined,
            image: match.image ?? undefined,
        };
    } catch {
        return null;
    }
};

interface SelectedHero {
    url: string;
    /** Only present when the image came from the backend (Unsplash attribution required). */
    attribution?: { name: string; profileUrl: string };
}

const pickRandomHero = (heroes: HeroImage[] | undefined): SelectedHero => {
    if (heroes && heroes.length > 0) {
        const pick = heroes[Math.floor(Math.random() * heroes.length)];
        return {
            url: pick.imageUrl,
            attribution: { name: pick.photographerName, profileUrl: pick.photographerUrl },
        };
    }
    const url =
        FALLBACK_HERO_IMAGES[Math.floor(Math.random() * FALLBACK_HERO_IMAGES.length)];
    return { url };
};

const Home = () => {
    const dispatch = useTripDispatch();
    const [tripMode, setTripMode] = useState<TripMode>(TRIP_MODE.SINGLE);
    const navigate = useNavigate();

    const { data: heroImages } = useHeroImages();
    const heroImage = useMemo(() => pickRandomHero(heroImages), [heroImages]);

    const handleSearchSelected = useCallback(
        (country: Country) => {
            if (!country?.name) return;
            // 'recommend' mode kicks off a single-trip flow with the chosen destination.
            const type =
                tripMode === TRIP_MODE.MULTIPLE ? TRIP_BASIC.MULTIPLE : TRIP_BASIC.SINGLE;
            const destinations = [{ country }] as Destination[];

            dispatch(resetTrip());
            dispatch(basicInfo({ type, destinations }));
            navigate(type.route, { replace: true });
        },
        [dispatch, tripMode, navigate]
    );

    const handlePlaceClick = async (place: TopPlace) => {
        // Resolve to the real backend UUID before navigating — the TopPlace
        // sample data uses numeric IDs that don't exist in the DB.
        const country = await resolveCountryByCode(place.country, place.countryCode);
        if (!country) {
            // Couldn't resolve (DB not seeded with this country, backend down).
            // Fall back to letting the user pick a destination on the trip page.
            dispatch(resetTrip());
            dispatch(basicInfo({ type: TRIP_BASIC.SINGLE, destinations: [] }));
            navigate(TRIP_BASIC.SINGLE.route, { replace: true });
            return;
        }
        const destinations = [{ country }] as Destination[];
        dispatch(resetTrip());
        dispatch(basicInfo({ type: TRIP_BASIC.SINGLE, destinations }));
        navigate(TRIP_BASIC.SINGLE.route, { replace: true });
    };

    return (
        <Layout>
            <section
                className="home-hero"
                style={{ backgroundImage: `url(${heroImage.url})` }}
            >
                <div className="home-hero-overlay" />
                {heroImage.attribution && (
                    <span className="home-hero-attribution">
                        Photo by{' '}
                        <a
                            href={heroImage.attribution.profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {heroImage.attribution.name}
                        </a>{' '}
                        on{' '}
                        <a
                            href="https://unsplash.com"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Unsplash
                        </a>
                    </span>
                )}
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
                            aria-selected={tripMode === TRIP_MODE.SINGLE}
                            className={classnames('hero-option', {
                                selected: tripMode === TRIP_MODE.SINGLE,
                            })}
                            onClick={() => setTripMode(TRIP_MODE.SINGLE)}
                        >
                            Single place
                        </button>
                        <button
                            role="tab"
                            aria-selected={tripMode === TRIP_MODE.MULTIPLE}
                            className={classnames('hero-option', {
                                selected: tripMode === TRIP_MODE.MULTIPLE,
                            })}
                            onClick={() => setTripMode(TRIP_MODE.MULTIPLE)}
                        >
                            Multiple locations
                        </button>
                        <button
                            role="tab"
                            aria-selected={tripMode === TRIP_MODE.RECOMMEND}
                            className={classnames('hero-option', 'is-ai', {
                                selected: tripMode === TRIP_MODE.RECOMMEND,
                            })}
                            onClick={() => setTripMode(TRIP_MODE.RECOMMEND)}
                        >
                            <AutoAwesomeIcon className="hero-option-icon" />
                            <span>Recommend</span>
                            <span className="hero-option-ai-badge">AI</span>
                        </button>
                    </div>

                    <div className="home-hero-search">
                        <SearchBar
                            onSelected={handleSearchSelected}
                            mode={tripMode === TRIP_MODE.RECOMMEND ? 'recommend' : 'country'}
                        />
                    </div>
                </div>
            </section>

            <TopPlaces onPlaceClick={handlePlaceClick} />
        </Layout>
    );
};

export default Home;
