import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import classnames from "classnames";
import "./index.scss";
import { Tooltip } from "@mui/material";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import FlightTakeoffRoundedIcon from "@mui/icons-material/FlightTakeoffRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import HikingRoundedIcon from "@mui/icons-material/HikingRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import LocationCityRoundedIcon from "@mui/icons-material/LocationCityRounded";
import Layout from "components/common/Layout/SubLayout";
import ErrorPage from "components/common/ErrorPage";
import CostBadge from "components/common/CostBadge";
import Stars from "components/common/Stars";
import ReviewSection from "components/Review/ReviewSection";
import ReviewSummary from "components/Review/ReviewSummary";
import VisitedCountryButton from "components/VisitedCountryButton";
import DetailTour from "components/DetailTour";
import AddToBucketButton from "components/AddToBucketButton";
import FriendsVisitedBadge from "components/FriendsVisitedBadge";
import { getPlaceKey } from "utils/placeKey";
import BookmarkCountryButton from "components/BookmarkCountryButton";
import ShareButton from "components/ShareButton";
import PlaceHero from "components/PlaceDetail/PlaceHero";
import WeatherSection from "components/PlaceDetail/WeatherSection";
import CurrencySection from "components/PlaceDetail/CurrencySection";
import SafetySection from "components/PlaceDetail/SafetySection";
import PopularitySection from "components/PlaceDetail/PopularitySection";
import GettingThereSection from "components/PlaceDetail/GettingThereSection";
import CulturalShockCallout from "components/PlaceDetail/CulturalShockCallout";
import ExperienceHighlights from "components/PlaceDetail/ExperienceHighlights";
import ParagraphSection from "components/PlaceDetail/ParagraphSection";
import NotesSection from "components/PlaceDetail/NotesSection";
import BudgetSection from "components/PlaceDetail/BudgetSection";
import LocalFlavorSection from "components/PlaceDetail/LocalFlavorSection";
import NearbySection from "components/PlaceDetail/NearbySection";
import VisaSection from "components/PlaceDetail/VisaSection";
import AirportsSection from "components/PlaceDetail/AirportsSection";
import EssentialAppsSection from "components/PlaceDetail/EssentialAppsSection";
import CountryFactsSection from "components/PlaceDetail/CountryFactsSection";
import ReligionSection from "components/PlaceDetail/ReligionSection";
import TippingSection from "components/PlaceDetail/TippingSection";
import CurrencyTipsSection from "components/PlaceDetail/CurrencyTipsSection";
import TapWaterSection from "components/PlaceDetail/TapWaterSection";
import WifiSection from "components/PlaceDetail/WifiSection";
import GreatForSection from "components/PlaceDetail/GreatForSection";
import StayingSafeSection from "components/PlaceDetail/StayingSafeSection";
import BeforeYouGoSection from "components/PlaceDetail/BeforeYouGoSection";
import WhenToVisitSection from "components/PlaceDetail/WhenToVisitSection";
import LatestNewsSection from "components/PlaceDetail/LatestNewsSection";
import TravelBasicsSection from "components/PlaceDetail/TravelBasicsSection";
import LodgingSection from "components/PlaceDetail/LodgingSection";
import TipListSection from "components/PlaceDetail/TipListSection";
import MainSection from "components/PlaceDetail/MainSection";
import PlaceMetaLine from "components/PlaceDetail/PlaceMetaLine";
import { useCountryDetailsProgressive } from "api/hooks/useCountryDetails";
import { useCountries } from "api/hooks/useCountries";
import { usePlaceImage } from "api/hooks/usePlaceImage";
import { useMonthlyBestPlace } from "api/hooks/useMonthlyBestPlace";
import { useNearestAirport } from "api/hooks/useHomeDeparture";
import { useDestinationAirport } from "api/hooks/useDestinationAirport";
import { useUser } from "context/UserContext";
import { useIsStuck } from "hooks/useIsStuck";
import { basicInfo, resetTrip, useTripDispatch } from "context/TripContext";
import { tomorrow } from "utils";
import { ACTIVITY_KIND, TRIP_BASIC } from "constants";
import type { Activity, Destination } from "types";

const CountryDetail = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useTripDispatch();
  // Home airport + user — drive the Day-1 flight auto-seed. Returns
  // null until the user has a home city set; we silent-skip in that
  // case, same pattern as CityDetail.
  const { data: nearestAirport } = useNearestAirport();
  const { user } = useUser();
  const code = (searchParams.get("code") ?? "").trim().toUpperCase();
  // Scroll-activated chrome — see useIsStuck.
  const toolbarIsStuck = useIsStuck();

  // Mode the user picked back on Home/Header before searching. We carry it
  // through the country preview so the CTA dispatches the right trip type
  // without making the user re-pick. Anything other than "multiple" defaults
  // to single (the most common path; matches Header's hardcoded default).
  const modeParam = (searchParams.get("mode") ?? "").trim().toLowerCase();
  const tripType =
    modeParam === "multiple" ? TRIP_BASIC.MULTIPLE : TRIP_BASIC.SINGLE;

  // Seed flag — when arriving from the "Your top pick" homepage card we
  // know which entry point this is and can offer a CTA that pre-fills
  // the trip with the 4 highlights from that monthly pick (so the user
  // doesn't have to guess what to add).
  const seed = (searchParams.get("seed") ?? "").trim();
  const isMonthlyBestPlaceSeed = seed === "monthly-best-place";

  // Progressive load: prose / lists / facts are fetched as three parallel
  // slices (each its own cached OpenAI group). Prose gates first paint — it
  // carries the country summary + "about" text; lists and facts stream into
  // their sections as they land, each rendering its own skeleton meanwhile.
  const { country, details, isLoading, isError, error } =
    useCountryDetailsProgressive(code);

  // Arrival airport for the auto-seeded outbound flight (depart side is the
  // user's nearest home airport, below). Prefer the AI-provided airports
  // list, but fall back to the static airports catalog — ranked primary-hub
  // first, so "Panama" → PTY — for older cached countries whose `airports`
  // field is empty. Without the fallback `arrivalAirportCode` was null and the
  // flight never seeded, so a multi-dest "trip to Panama" showed no flight.
  const detailArrivalAirport = details?.airports?.[0]?.iataCode ?? null;
  const { data: fallbackArrivalAirport } = useDestinationAirport(
    country?.name,
    !detailArrivalAirport,
  );
  const arrivalAirportCode = detailArrivalAirport ?? fallbackArrivalAirport ?? null;

  // Resolve the country's name + hero image from the (cached) catalog so the
  // loading screen can show the photo + name immediately, instead of just the
  // ISO code, while the prose slice resolves. The catalog is a cheap DB query
  // and usually already cached from search.
  const { data: countryCatalog } = useCountries("", {
    enabled: isLoading,
    limit: 300,
  });
  const loadingCountry = countryCatalog?.find((c) => c.code === code);

  // Country catalog photos are sparse (Russia, for one, has none). Backfill the
  // hero from the cache-aware /places/image resolver (Unsplash → Pexels →
  // Pixabay), exactly like the city/place pages, so every country shows a real
  // photo instead of the placeholder logo. Only fired when the catalog has no
  // image of its own.
  const heroCountryName = country?.name ?? loadingCountry?.name ?? "";
  const catalogHeroImage = country?.image ?? loadingCountry?.image ?? null;
  const { data: countryHeroPhoto } = usePlaceImage(
    heroCountryName,
    null,
    heroCountryName,
    { enabled: heroCountryName.length > 0 && !catalogHeroImage },
  );
  const heroImageUrl = catalogHeroImage ?? countryHeroPhoto?.imageUrl ?? undefined;
  const usingBackfillHero =
    !catalogHeroImage && Boolean(countryHeroPhoto?.imageUrl);
  const heroPhotographerName = usingBackfillHero
    ? countryHeroPhoto?.photographerName
    : country?.photographerName;
  const heroPhotographerUrl = usingBackfillHero
    ? countryHeroPhoto?.photographerUrl
    : country?.photographerUrl;

  // Only fetch the monthly pick when we're actually arriving via the
  // seed flow — keeps the country page from hitting an extra endpoint
  // for every normal visit. The hook itself gates on Pro+admin, so
  // free users never see the seed CTA even if the URL has the param.
  const monthlyBestPlace = useMonthlyBestPlace({
    enabled: isMonthlyBestPlaceSeed,
  });
  // The seed CTA only makes sense when the monthly pick's country
  // matches the country we're currently looking at (otherwise the 4
  // highlights belong to a different country and would mis-seed).
  const seedMatchesThisCountry =
    isMonthlyBestPlaceSeed &&
    monthlyBestPlace.data?.place.countryCode === code;

  const startTrip = (
    country: { id: string; name: string; code: string; local: string | null; image: string | null },
    arrivalAirportCode: string | null,
  ) => {
    // Default the trip to start TOMORROW. Seeding "today" meant a trip
    // created late in the evening defaulted to a same-day trip, which is
    // rarely what the user wants; they can still pick any date in the
    // wizard's date step.
    const tripStart = tomorrow();

    // Same-country country trip (e.g. user in USA planning "USA"
    // trip) — skip the auto-seed entirely. No specific destination
    // city to anchor a train/bus on, and a flight would be wrong
    // for most domestic trips. The user picks the right activity
    // type manually.
    const isSameCountry = Boolean(
      user?.homeCountryCode &&
        country.code &&
        user.homeCountryCode.toUpperCase() === country.code.toUpperCase(),
    );

    // Day-1 outbound flight auto-seed. Silent-skip when the user has no
    // home airport set or the country has no known primary airport —
    // partial flights with a placeholder depart side were worse UX than
    // no seed at all. We seed ONLY the outbound; the return leg used to be
    // seeded too but read as confusing (a same-day round trip at 00:00) —
    // users add their return flight themselves when they're ready.
    const seededActivities: Activity[] = [];
    if (
      !isSameCountry &&
      nearestAirport?.iataCode &&
      arrivalAirportCode
    ) {
      seededActivities.push({
        id: 0,
        kind: ACTIVITY_KIND.FLIGHT,
        name: `Flight to ${country.name}`,
        flightSegments: [
          {
            departAirport: nearestAirport.iataCode,
            arrivalAirport: arrivalAirportCode,
            departDate: tripStart,
            departTime: "00:00",
            arrivalDate: tripStart,
            arrivalTime: "00:00",
          },
        ],
      });
    }

    const destinations = [
      {
        id: 0,
        country: {
          id: country.id,
          name: country.name,
          code: country.code,
          local: country.local ?? undefined,
          image: country.image ?? undefined,
        },
        // Anchor the seeded destination to the trip start so it matches a
        // date block in the multi-destination itinerary (DateBlock keys
        // multi destinations by `startDate`). The reducer re-anchors this to
        // the new start if the user later picks real dates in the wizard.
        startDate: tripStart,
        endDate: tripStart,
        ...(arrivalAirportCode
          ? { flightInfo: { arrivalAirport: arrivalAirportCode } }
          : {}),
        ...(seededActivities.length
          ? {
              itinerary: [
                {
                  id: 0,
                  date: tripStart,
                  activities: seededActivities,
                },
              ],
            }
          : {}),
      },
    ] as Destination[];
    dispatch(resetTrip());
    dispatch(
      basicInfo({
        type: tripType,
        destinations,
        startDate: tripStart,
        endDate: tripStart,
        image: country.image ?? undefined,
      }),
    );

    // Seed flow: when the user arrived via the "Your top pick"
    // homepage card and the monthly pick's country matches this
    // page, route through `/preparing-trip` so the per-highlight
    // recommender enrichment happens on a dedicated loading screen
    // with a progress indicator. Sitting on /country while 4-12
    // backend calls fire behind a disabled CTA was unclear UX —
    // the standalone loading page makes the wait its own moment.
    if (seedMatchesThisCountry && monthlyBestPlace.data) {
      const { place, highlights } = monthlyBestPlace.data;
      // Take up to 4 — guarantees the wizard's Day-1 doesn't get
      // overwhelmed if the prompt ever returns more.
      const picks = highlights.slice(0, 4);
      navigate('/preparing-trip', {
        state: {
          targetRoute: tripType.route,
          today: tripStart,
          country: {
            id: country.id,
            name: country.name,
            code: country.code,
            local: country.local,
            image: country.image,
          },
          fallbackLocation: `${place.name}, ${country.name}`,
          highlights: picks,
        },
      });
      return;
    }

    navigate(tripType.route, { replace: true });
  };

  if (!code) {
    return (
      <ErrorPage
        pageTitle={t('detail.country.pageTitle')}
        title={t('detail.country.noneSelected')}
        description={t('detail.country.noneSelectedDesc')}
        primaryActionLabel={t('detail.common.goHome')}
      />
    );
  }

  if (isLoading) {
    // Progressive load: show the hero photo + country name (from the cached
    // catalog) right away so the page feels instant, with the AI-enriched
    // body filling in once country-details resolves.
    const loadingName = loadingCountry?.name ?? code;
    return (
      <Layout title={`${loadingName}…`}>
        <article className="country-detail country-detail--loading">
          {/* Same hero+side grid as the loaded page so the hero keeps its
              size across the transition instead of shrinking from full-width
              into the grid column. Side cards show their own skeletons. */}
          <div className="country-detail-top">
            <PlaceHero
              name={loadingName}
              imageUrl={heroImageUrl}
              className="country-detail-hero"
            />
            <aside className="country-detail-side">
              <WeatherSection weather={undefined} isError={false} />
              <CurrencySection currency={undefined} isError={false} />
              <SafetySection safety={undefined} isError={false} />
            </aside>
          </div>
          <header className="country-detail-header">
            <h1 className="country-detail-name">{loadingName}</h1>
          </header>
          {/* Reuse the loaded page's section components, fed by the fast
              quick-prose call: real text the moment it resolves (or a skeleton
              meanwhile), carrying seamlessly into the loaded layout. */}
          <div
            className="country-detail-quick-main"
            role="status"
            aria-live="polite"
            aria-label={t('detail.common.loadingDetails', {
              name: loadingName,
            })}
          >
            <ParagraphSection
              title={t('detail.common.about', { name: loadingName })}
              description={undefined}
              isError={false}
            />
            <ParagraphSection
              title={t('detail.country.budget')}
              description={undefined}
              isError={false}
            />
          </div>
        </article>
      </Layout>
    );
  }

  if (isError || !country) {
    return (
      <ErrorPage
        pageTitle={t('detail.common.errorPageTitle')}
        title={t('detail.country.errorTitle')}
        description={
          error instanceof Error
            ? error.message
            : t('detail.country.notFound', { code })
        }
        secondaryAction={{ label: t('detail.common.backToHome'), to: "/" }}
        primaryActionLabel={t('detail.common.goHome')}
      />
    );
  }

  // Smart back: prefer the browser history (search results, top cities
  // grid, etc.) and fall back to home for direct visits.
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <Layout>
      <DetailTour kind="country" />
      <article className="country-detail">
        <div
          className={classnames("country-detail-toolbar", {
            "is-stuck": toolbarIsStuck,
          })}
        >
          <button
            type="button"
            onClick={handleBack}
            className="country-detail-back-link"
          >
            <ArrowBackRoundedIcon fontSize="small" />{' '}
            {t('detail.common.back')}
          </button>
          <div className="country-detail-toolbar-actions">
            {/* Group Bookmark + Visited + Share so mobile CSS can lift
                them onto the hero photo's top-right corner. */}
            <div className="country-detail-overlay-actions">
              <BookmarkCountryButton
                countryCode={country.code}
                countryName={country.name}
                imageUrl={country.image}
              />
              <VisitedCountryButton
                countryCode={country.code}
                countryName={country.name}
              />
              <AddToBucketButton kind="country" name={country.name} />
              <ShareButton
                title={country.name}
                subtitle={t('detail.country.shareSubtitle')}
                imageUrl={country.image}
                description={details.countryHighlight}
                url={
                  typeof window !== "undefined"
                    ? window.location.href
                    : `/country?code=${encodeURIComponent(country.code)}`
                }
                variant="pill"
                emailPayload={{
                  name: country.name,
                  city: "",
                  country: country.name,
                  description: details.countryHighlight ?? "",
                  image_url: country.image,
                }}
              />
            </div>
            <button
              type="button"
              className="country-detail-plan-cta"
              onClick={() => startTrip(country, arrivalAirportCode)}
            >
              <FlightTakeoffRoundedIcon className="country-detail-plan-cta-icon" />
              <span className="country-detail-plan-cta-text">
                <span className="country-detail-plan-cta-label">
                  {seedMatchesThisCountry
                    ? t('detail.country.planWithPicks')
                    : tripType.id === TRIP_BASIC.MULTIPLE.id
                      ? t('detail.common.startMultiTrip')
                      : t('detail.common.startPlanning')}
                </span>
                <span className="country-detail-plan-cta-target">
                  {country.name}
                </span>
              </span>
              <ArrowForwardRoundedIcon className="country-detail-plan-cta-arrow" />
            </button>
          </div>
        </div>

        <div className="country-detail-top">
          <PlaceHero
            name={country.name}
            imageUrl={heroImageUrl}
            photographerName={heroPhotographerName}
            photographerUrl={heroPhotographerUrl}
            galleryQuery={country.name}
            className="country-detail-hero"
          />

          <header className="country-detail-header">
            <div className="country-detail-name-row">
              <h1 className="country-detail-name">{country.name}</h1>
              <CostBadge level={details.costLevel} />
            </div>
            {country.local && country.local !== country.name && (
              <p className="country-detail-local">{country.local}</p>
            )}
            <PlaceMetaLine
              countryCode={country.code}
              countryName={country.name}
            >
              <span className="place-meta-seg">
                <strong>{t('detail.country.capital')}</strong>
                {details.capitalCity}
              </span>
              {/* `travelBasics` arrives with the facts slice — render the
                  Language line only once it lands so a cold first paint
                  (prose only) doesn't dereference an undefined object. */}
              {details.travelBasics?.language && (
                <span className="place-meta-seg">
                  <strong>{t('detail.country.language')}</strong>
                  {details.travelBasics.language}
                </span>
              )}
            </PlaceMetaLine>
            <p className="country-detail-highlight">
              {details.countryHighlight}
            </p>
            {/* Visited-by-friends chip (self-hides at count 0). */}
            <div className="country-detail-friends-slot">
              <FriendsVisitedBadge
                kind="country"
                placeKey={country.code ?? ""}
                reviewKey={getPlaceKey(
                  country.name,
                  country.name,
                  country.name,
                )}
              />
            </div>
            {(details.touristRating ?? 0) > 0 && (
              <div className="country-detail-rating">
                <Tooltip title={t('detail.common.overallRating')} arrow>
                  <span
                    className="country-detail-rating-icon"
                    role="img"
                    aria-label={t('detail.common.overallRating')}
                  >
                    <PublicRoundedIcon />
                  </span>
                </Tooltip>
                <Stars rating={details.touristRating ?? 0} />
              </div>
            )}
            <ReviewSummary
              placeName={country.name}
              placeCity={country.name}
              placeCountry={country.name}
              targetId="country-reviews"
            />
          </header>

          <aside className="country-detail-side">
            <WeatherSection
              weather={details.weather}
              coordinates={details.capitalCoordinates}
              isError={false}
            />
            <CurrencySection currency={details.currency} isError={false} />
            <SafetySection safety={details.safety} isError={false} />
          </aside>
        </div>

        <div className="country-detail-content">
          <div className="country-detail-content-main">
            <ParagraphSection
              title={t('detail.common.about', { name: country.name })}
              description={details.longDescription}
              isError={false}
            />

            {/* Getting There — anchors on the capital city's
                coordinates. Hides entirely for cached rows from
                before the AI started returning `capital_coordinates`
                so users don't see a perpetually-loading skeleton.
                Lives in the main content column where logistical
                info belongs alongside Budget / Notes. */}
            {details.capitalCoordinates && (
              <GettingThereSection
                placeName={`${details.capitalCity}, ${country.name}`}
                coordinates={details.capitalCoordinates}
                isError={false}
              />
            )}

            <BudgetSection
              description={details.budgetDescription}
              costLevel={details.costLevel}
              isError={false}
            />

            <EssentialAppsSection code={code} />

            <CulturalShockCallout
              text={details.culturalShock}
              subjectLabel={country.name}
            />

            <BeforeYouGoSection items={details.beforeYouGo} />

            <NotesSection items={details.notesToKnow} isError={false} />

            <LocalFlavorSection
              flavor={details.localFlavor}
              isError={false}
            />
          </div>

          <aside className="country-detail-content-side">
            <PopularitySection
              popularity={details.popularity}
              isError={false}
            />

            <AirportsSection airports={details.airports} />

            <VisaSection visa={details.visa} isError={false} />

            <WhenToVisitSection
              bestTime={details.bestTimeToVisit}
              worstTime={details.worstTimeToVisit}
              isError={false}
            />

            <StayingSafeSection code={code} />

            <CountryFactsSection code={code} />

            <ReligionSection code={code} />

            <TippingSection code={code} />

            <CurrencyTipsSection code={code} />

            <TapWaterSection code={code} />

            <WifiSection code={code} />

            <GreatForSection code={code} />

            <LatestNewsSection country={country.name} />
          </aside>
        </div>

        <ExperienceHighlights things={details.thingsToDo} />

        <TravelBasicsSection
          basics={details.travelBasics}
          isError={false}
        />

        <LodgingSection lodging={details.lodging} isError={false} />

        <div className="country-detail-extras">
          <MainSection
            title={t('detail.common.top5.cities', { name: country.name })}
            icon={<LocationCityRoundedIcon />}
          >
            <ul className="country-top-cities">
              {/* `topCities` arrives with the lists slice — guard the map so a
                  cold first paint (prose only) doesn't crash on undefined. The
                  list fills in when the slice lands. */}
              {(details.topCities ?? []).map((city) => (
                <li key={city.name} className="country-top-city">
                  <Link
                    to={`/city?name=${encodeURIComponent(city.name)}&country=${encodeURIComponent(country.name)}&code=${encodeURIComponent(country.code)}`}
                    className="country-top-city-link"
                  >
                    <span className="country-top-city-name">{city.name}</span>
                    <span className="country-top-city-why">{city.why}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </MainSection>

          <TipListSection
            title={t('detail.common.top5.foods')}
            icon={<RestaurantRoundedIcon />}
            items={details.foods}
          />
          <TipListSection
            title={t('detail.common.top5.things')}
            icon={<HikingRoundedIcon />}
            items={details.thingsToDo}
          />
          <TipListSection
            title={t('detail.common.top5.photoSpots')}
            icon={<PhotoCameraRoundedIcon />}
            items={details.photoSpots}
          />
        </div>

        <NearbySection
          items={details.nearbyDestinations}
          isError={false}
        />

        <div id="country-reviews">
          <ReviewSection
            placeName={country.name}
            placeCity={country.name}
            placeCountry={country.name}
          />
        </div>
      </article>
    </Layout>
  );
};

export default CountryDetail;
