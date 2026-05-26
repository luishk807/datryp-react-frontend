import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import classnames from 'classnames';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import './index.scss';
import SearchBar from 'components/SearchBar';
import Layout from 'components/common/Layout';
import { FALLBACK_HERO_IMAGES } from 'constants';
import type { TopPlace } from 'types';
import TopPlaces from 'components/TopPlaces';
import NextMonthPicks from 'components/NextMonthPicks';
import PlacesYouMightLove from 'components/PlacesYouMightLove';
import SimilarToSaves from 'components/SimilarToSaves';
import UpcomingHoliday from 'components/UpcomingHoliday';
import WorldEvent from 'components/WorldEvent';
import MonthlyBestPlace from 'components/MonthlyBestPlace';
import SeasonalBestPlaces from 'components/SeasonalBestPlaces';
import AiTripBuilderCard from 'components/AiTripBuilderCard';
import { useHeroImages } from 'api/hooks/useHeroImages';
import { useUser } from 'context/UserContext';
import { getUserFirstName } from 'utils/userName';
import type { Country, HeroImage } from 'types';

type HomeMode = 'country' | 'ai';

interface SelectedHero {
    url: string;
    /** Only present when the image came from the backend (Unsplash attribution required). */
    attribution?: { name: string; profileUrl: string };
}

/** Hostnames whose `/hero/*` paths are known to serve HTML (the SPA's
 *  index.html) instead of actual JPGs. The DB still references these
 *  from an older seed run; until those rows get re-seeded against a
 *  real image origin, we filter them out client-side so a successful
 *  `/hero-images` response doesn't paint the homepage black. Drop
 *  entries from this list as the backend gets fixed. */
const KNOWN_BROKEN_HERO_HOSTS = ['d111x5lpaimz3o.cloudfront.net'];

const isUsableHeroUrl = (url: string): boolean =>
    !KNOWN_BROKEN_HERO_HOSTS.some((host) => url.includes(host));

const pickRandomHero = (heroes: HeroImage[] | undefined): SelectedHero => {
    const usable = (heroes ?? []).filter((h) => isUsableHeroUrl(h.imageUrl));
    if (usable.length > 0) {
        const pick = usable[Math.floor(Math.random() * usable.length)];
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
    const { user } = useUser();

    const { data: heroImages } = useHeroImages();
    const heroImage = useMemo(() => pickRandomHero(heroImages), [heroImages]);

    // Cap the greeted name length so an unusually long first name
    // ("luistestiigjgfddfdfdfdfdfd") doesn't overflow the hero on
    // narrow phones — the title has no internal break point. Above
    // the cap, fall back to the plain "Where to next?" copy.
    const firstName = user ? getUserFirstName(user, '') : '';
    const heroTitle =
        firstName && firstName.length <= 12
            ? `Where to next, ${firstName}?`
            : 'Where to next?';

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
            <section className="home-hero">
                {/* Photo layer — rendered as an actual <img> so we can
                    catch load failures via onError and fall back to
                    the gradient backdrop (set in SCSS on .home-hero
                    itself). Using a real element instead of a CSS
                    `background-image: url(...)` means a 404 / wrong
                    content-type can't silently leave the section
                    blank — the img simply hides and the gradient
                    underneath stays visible.

                    `key={heroImage.url}` forces React to remount the
                    <img> when the URL changes (e.g. initial fallback
                    → API-resolved Unsplash URL). Otherwise the
                    imperative `style.display = 'none'` set by a
                    previous onError sticks through the URL swap and
                    hides the new (working) image. */}
                <img
                    key={heroImage.url}
                    className="home-hero-bg-photo"
                    src={heroImage.url}
                    alt=""
                    aria-hidden="true"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                    }}
                />
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
                    <h1 className="home-hero-title">{heroTitle}</h1>
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

            {/* Upcoming world event lives at the top of the
                recommendation stack — time-sensitive (a fixed event
                window to act on) and the highest-impact CTA among the
                cards. Holiday, monthly pick, and seasonal sit below
                it. */}
            <WorldEvent />
            {/* "Best for <Next Month>" — driven by the user's saved
                destinations whose best_time_to_visit window covers
                next month, minus anywhere they've already been. Self-
                hides when the user has no matching saves, so it
                doesn't add visual noise for new accounts. */}
            <NextMonthPicks />
            {/* ML-driven kNN recommendation: average the user's saved
                place embeddings into a taste vector, query the chroma
                `places` collection for nearest neighbors, return the
                top 6 minus saved/visited. Local sentence-transformers
                + chroma — zero OpenAI cost per call. */}
            <SimilarToSaves />
            <PlacesYouMightLove variant="home" />
            <AiTripBuilderCard />
            <MonthlyBestPlace />
            <SeasonalBestPlaces />
            <UpcomingHoliday />
            <TopPlaces onPlaceClick={handlePlaceClick} />
        </Layout>
    );
};

export default Home;
