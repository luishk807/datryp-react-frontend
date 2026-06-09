import { useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import classnames from 'classnames';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
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
import CountryOfBirthEvent from 'components/CountryOfBirthEvent';
import MonthlyBestPlace from 'components/MonthlyBestPlace';
import SeasonalBestPlaces from 'components/SeasonalBestPlaces';
import AiTripBuilderCard from 'components/AiTripBuilderCard';
import HomeTour from 'components/HomeTour';
import { useHeroImages } from 'api/hooks/useHeroImages';
import { useUser } from 'context/UserContext';
import { getUserFirstName } from 'utils/userName';
import type { PlaceResult } from 'api/hooks/usePlaces';
import type { HeroImage } from 'types';

type HomeMode = 'place' | 'describe';

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

/** Rotating hero placeholders, one list per search tab. First entry is
 *  the resting prompt; the rest are example searches the bar cycles
 *  through every few seconds. Module-level so each reference is stable
 *  across renders (SearchBar's rotation timer keys off identity, and
 *  swapping the list on a tab change restarts it from the first entry). */
const PLACE_PLACEHOLDERS: string[] = [
    'Search a city or country',
    'Try: Tokyo, Japan',
    'Try: Thailand',
    'Try: Paris, France',
    'Try: Bali, Indonesia',
    'Try: New York City',
    'Try: Banff, Canada',
];

const DESCRIBE_PLACEHOLDERS: string[] = [
    'Describe your dream trip',
    'Try: 7 day family trip in Japan',
    'Try: Beach vacation under $2,000',
    'Try: Romantic getaway in Europe',
    'Try: Food and coffee trip in Italy',
    'Try: Adventure trip in Patagonia',
];

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
    const [homeMode, setHomeMode] = useState<HomeMode>('place');
    const navigate = useNavigate();
    const { user } = useUser();

    // Manual-only homepage tour, launched from the "How Datryp works"
    // help link under the search box (see the hero markup below).
    const [tourRun, setTourRun] = useState(false);

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

    /** SearchBar place-pick — route cities to /city and countries to
     *  /country. Single-destination by convention; the user can switch
     *  to multi from inside the trip-builder. The previous flow was
     *  country-only; the new unified place search also handles cities. */
    const handlePlaceSelected = useCallback(
        (place: PlaceResult) => {
            if (!place?.countryCode) return;
            if (place.kind === 'country') {
                navigate(
                    `/country?code=${encodeURIComponent(place.countryCode)}&mode=single`
                );
                return;
            }
            navigate(
                `/city?name=${encodeURIComponent(place.name)}` +
                    `&country=${encodeURIComponent(place.countryName)}` +
                    `&code=${encodeURIComponent(place.countryCode)}` +
                    `&mode=single`
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
                        Search a place, describe your trip, or let us plan
                        it all.
                    </p>

                    <div
                        role="tablist"
                        aria-label="Search mode"
                        className={classnames('home-hero-options', `is-${homeMode}`)}
                    >
                        <span className="hero-option-thumb" aria-hidden="true" />
                        <button
                            role="tab"
                            data-tour="home-search-place"
                            aria-selected={homeMode === 'place'}
                            aria-label="Search by place"
                            className={classnames('hero-option', {
                                selected: homeMode === 'place',
                            })}
                            onClick={() => setHomeMode('place')}
                        >
                            <PublicRoundedIcon className="hero-option-icon" />
                            <span>
                                <span className="hero-option-prefix">Search by </span>
                                Place
                            </span>
                        </button>
                        <button
                            role="tab"
                            data-tour="home-search-describe"
                            aria-selected={homeMode === 'describe'}
                            aria-label="Search by description"
                            className={classnames('hero-option', {
                                selected: homeMode === 'describe',
                            })}
                            onClick={() => setHomeMode('describe')}
                        >
                            <SearchRoundedIcon className="hero-option-icon" />
                            <span>
                                <span className="hero-option-prefix">Search by </span>
                                Description
                            </span>
                        </button>
                    </div>

                    <div className="home-hero-search" data-tour="home-searchbar">
                        <SearchBar
                            onPlaceSelected={handlePlaceSelected}
                            mode={homeMode === 'describe' ? 'recommend' : 'place'}
                            placeholders={
                                homeMode === 'describe'
                                    ? DESCRIBE_PLACEHOLDERS
                                    : PLACE_PLACEHOLDERS
                            }
                            onAiSearchSubmit={(q) =>
                                navigate(`/search?q=${encodeURIComponent(q)}`)
                            }
                        />
                    </div>

                    {/* Inline help — launches the homepage walkthrough
                        (HomeTour) right where the user is, no navigation. */}
                    <button
                        type="button"
                        className="home-hero-help"
                        onClick={() => setTourRun(true)}
                    >
                        First time here?{' '}
                        <span className="home-hero-help-link">
                            Learn how Datryp works →
                        </span>
                    </button>

                    {/* Marketing CTA — visually separated from the
                        search field above by an explicit "or" divider
                        so users don't read the button as a "submit
                        the search" affordance. Clicking the button
                        navigates to /plan-trip-ai, completely
                        independent of whatever is in the search
                        input. */}
                    <div className="home-hero-or-divider" aria-hidden="true">
                        <span>or</span>
                    </div>
                    <div className="home-hero-ai-callout">
                        <span className="home-hero-ai-callout-tagline">
                            Not sure where to go?
                        </span>
                        <Link
                            to="/plan-trip-ai"
                            data-tour="home-ai-cta"
                            className="home-hero-ai-cta"
                            aria-label="Let us plan a trip for you"
                        >
                            <AutoAwesomeIcon className="home-hero-ai-cta-icon" />
                            <span className="home-hero-ai-cta-label">
                                Plan my trip for me
                            </span>
                            <span className="home-hero-ai-cta-badge">Pro</span>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Upcoming world event lives at the top of the
                recommendation stack — time-sensitive (a fixed event
                window to act on) and the highest-impact CTA among the
                cards. Holiday, monthly pick, and seasonal sit below
                it. */}
            <WorldEvent />
            {/* Same shape as WorldEvent but scoped to the user's
                country of birth — a heritage/diaspora signal that
                surfaces big events in their home country (Carnaval
                for a Brazilian-born user, Tour de France for a
                French-born user). Self-hides when the user hasn't
                set a country of birth or the AI returns no event
                of sufficient scale (backend 204 → hook resolves to
                null). */}
            <CountryOfBirthEvent />
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
            <HomeTour run={tourRun} onClose={() => setTourRun(false)} />
        </Layout>
    );
};

export default Home;
