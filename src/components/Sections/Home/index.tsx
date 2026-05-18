import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import classnames from 'classnames';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import './index.scss';
import SearchBar from 'components/SearchBar';
import Layout from 'components/common/Layout';
import { FALLBACK_HERO_IMAGES, TRIP_MODE } from 'constants';
import type { TopPlace } from 'sample/topPlaces';
import TopPlaces from 'components/TopPlaces';
import { useHeroImages } from 'api/hooks/useHeroImages';
import type { Country, HeroImage, TripMode } from 'types';

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
    const [tripMode, setTripMode] = useState<TripMode>(TRIP_MODE.SINGLE);
    const navigate = useNavigate();

    const { data: heroImages } = useHeroImages();
    const heroImage = useMemo(() => pickRandomHero(heroImages), [heroImages]);

    /** SearchBar autocomplete pick — route the user to the country detail
     *  page (preview-before-commit) and carry the mode they selected on the
     *  hero tabs so the country CTA can dispatch the right trip type. */
    const handleSearchSelected = useCallback(
        (country: Country) => {
            if (!country?.code) return;
            // Recommend mode skips the country page — it uses AI search at
            // /search; the autocomplete pick never hits this branch in that
            // mode, but guard anyway so an unexpected mode doesn't 404.
            const mode =
                tripMode === TRIP_MODE.MULTIPLE ? 'multiple' : 'single';
            navigate(
                `/country?code=${encodeURIComponent(country.code)}&mode=${mode}`
            );
        },
        [navigate, tripMode]
    );

    /** TopPlaces card click — route to the city detail page. TopPlace
     *  already carries the city name + country name + country code, so no
     *  backend lookup is needed. Single-destination by convention; the
     *  user can switch to multi from inside the trip-builder. */
    const handlePlaceClick = (place: TopPlace) => {
        navigate(
            `/city?name=${encodeURIComponent(place.name)}` +
                `&country=${encodeURIComponent(place.country)}` +
                `&code=${encodeURIComponent(place.countryCode)}` +
                `&mode=single`
        );
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
                            onAiSearchSubmit={(q) =>
                                navigate(`/search?q=${encodeURIComponent(q)}`)
                            }
                        />
                    </div>
                </div>
            </section>

            <TopPlaces onPlaceClick={handlePlaceClick} />
        </Layout>
    );
};

export default Home;
