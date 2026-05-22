import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import classnames from 'classnames';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import './index.scss';
import SearchBar from 'components/SearchBar';
import Layout from 'components/common/Layout';
import { FALLBACK_HERO_IMAGES } from 'constants';
import type { TopPlace } from 'sample/topPlaces';
import TopPlaces from 'components/TopPlaces';
import PlacesYouMightLove from 'components/PlacesYouMightLove';
import UpcomingHoliday from 'components/UpcomingHoliday';
import WorldEvent from 'components/WorldEvent';
import MonthlyBestPlace from 'components/MonthlyBestPlace';
import { useHeroImages } from 'api/hooks/useHeroImages';
import type { Country, HeroImage } from 'types';

type HomeMode = 'country' | 'ai';

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
    const [homeMode, setHomeMode] = useState<HomeMode>('country');
    const navigate = useNavigate();

    const { data: heroImages } = useHeroImages();
    const heroImage = useMemo(() => pickRandomHero(heroImages), [heroImages]);

    /** SearchBar autocomplete pick — route the user to the country detail
     *  page (preview-before-commit). Single vs multi is no longer chosen
     *  here; the trip-builder's first step lets them pick the mode. */
    const handleSearchSelected = useCallback(
        (country: Country) => {
            if (!country?.code) return;
            navigate(
                `/country?code=${encodeURIComponent(country.code)}&mode=single`
            );
        },
        [navigate]
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
                        Search for a country, or let our AI pick the right one
                        for you.
                    </p>

                    <div
                        role="tablist"
                        aria-label="Search mode"
                        className={classnames('home-hero-options', `is-${homeMode}`)}
                    >
                        <span className="hero-option-thumb" aria-hidden="true" />
                        <button
                            role="tab"
                            aria-selected={homeMode === 'country'}
                            className={classnames('hero-option', {
                                selected: homeMode === 'country',
                            })}
                            onClick={() => setHomeMode('country')}
                        >
                            <PublicRoundedIcon className="hero-option-icon" />
                            <span>Search by country</span>
                        </button>
                        <button
                            role="tab"
                            aria-selected={homeMode === 'ai'}
                            className={classnames('hero-option', 'is-ai', {
                                selected: homeMode === 'ai',
                            })}
                            onClick={() => setHomeMode('ai')}
                        >
                            <AutoAwesomeIcon className="hero-option-icon" />
                            <span>AI</span>
                            <span className="hero-option-ai-badge">Beta</span>
                        </button>
                    </div>

                    <div className="home-hero-search">
                        <SearchBar
                            onSelected={handleSearchSelected}
                            mode={homeMode === 'ai' ? 'recommend' : 'country'}
                            onAiSearchSubmit={(q) =>
                                navigate(`/search?q=${encodeURIComponent(q)}`)
                            }
                        />
                    </div>
                </div>
            </section>

            <PlacesYouMightLove variant="home" />
            <MonthlyBestPlace />
            <UpcomingHoliday />
            <WorldEvent />
            <TopPlaces onPlaceClick={handlePlaceClick} />
        </Layout>
    );
};

export default Home;
