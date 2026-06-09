import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
import WhenToVisitSection from "components/PlaceDetail/WhenToVisitSection";
import LatestNewsSection from "components/PlaceDetail/LatestNewsSection";
import TravelBasicsSection from "components/PlaceDetail/TravelBasicsSection";
import LodgingSection from "components/PlaceDetail/LodgingSection";
import TipListSection from "components/PlaceDetail/TipListSection";
import MainSection from "components/PlaceDetail/MainSection";
import { useCountryDetailsProgressive } from "api/hooks/useCountryDetails";
import { useCountries } from "api/hooks/useCountries";
import { useMonthlyBestPlace } from "api/hooks/useMonthlyBestPlace";
import { useNearestAirport } from "api/hooks/useHomeDeparture";
import { useDestinationAirport } from "api/hooks/useDestinationAirport";
import { useUser } from "context/UserContext";
import { useIsStuck } from "hooks/useIsStuck";
import { basicInfo, resetTrip, useTripDispatch } from "context/TripContext";
import { now } from "utils";
import { ACTIVITY_KIND, TRIP_BASIC } from "constants";
import type { Activity, Destination } from "types";

const CountryDetail = () => {
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
    const today = now();

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
            departDate: today,
            departTime: "00:00",
            arrivalDate: today,
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
        startDate: today,
        endDate: today,
        ...(arrivalAirportCode
          ? { flightInfo: { arrivalAirport: arrivalAirportCode } }
          : {}),
        ...(seededActivities.length
          ? {
              itinerary: [
                {
                  id: 0,
                  date: today,
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
        startDate: today,
        endDate: today,
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
          today,
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
        pageTitle="Country"
        title="No country selected"
        description="Pick a country from the search to see its details."
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
              imageUrl={loadingCountry?.image}
              className="country-detail-hero"
            />
            <aside className="country-detail-side">
              <PopularitySection popularity={undefined} isError={false} />
              <WeatherSection weather={undefined} isError={false} />
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
            aria-label={`Loading ${loadingName} details`}
          >
            <ParagraphSection
              title={`About ${loadingName}`}
              description={undefined}
              isError={false}
            />
            <ParagraphSection
              title="Budget"
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
        pageTitle="Error"
        title="Could not load this country"
        description={
          error instanceof Error
            ? error.message
            : `No country with code "${code}".`
        }
        secondaryAction={{ label: "Back to home", to: "/" }}
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
            <ArrowBackRoundedIcon fontSize="small" /> Back
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
                subtitle="Country"
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
                    ? "Plan trip with these picks"
                    : tripType.id === TRIP_BASIC.MULTIPLE.id
                      ? "Start multi-destination trip"
                      : "Start planning"}
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
            imageUrl={country.image}
            photographerName={country.photographerName}
            photographerUrl={country.photographerUrl}
            galleryQuery={country.name}
            className="country-detail-hero"
          />

          {/* Mobile-only slot: chip lands directly under the hero
              before the side cards stack. Desktop slot lives inside
              the header below. */}
          <div className="country-detail-friends-slot is-mobile-only">
            <FriendsVisitedBadge
              kind="country"
              placeKey={country.code ?? ""}
            />
          </div>

          <aside className="country-detail-side">
            <PopularitySection
              popularity={details.popularity}
              isError={false}
            />
            <WeatherSection
              weather={details.weather}
              coordinates={details.capitalCoordinates}
              isError={false}
            />
            <SafetySection safety={details.safety} isError={false} />
          </aside>
        </div>

        <header className="country-detail-header">
          <div className="country-detail-name-row">
            <h1 className="country-detail-name">{country.name}</h1>
            <CostBadge level={details.costLevel} />
          </div>
          {country.local && country.local !== country.name && (
            <p className="country-detail-local">{country.local}</p>
          )}
          {/* Desktop-only slot — pairs with the mobile slot above. */}
          <div className="country-detail-friends-slot is-desktop-only">
            <FriendsVisitedBadge
              kind="country"
              placeKey={country.code ?? ""}
            />
          </div>
          <p className="country-detail-highlight">{details.countryHighlight}</p>
          <p className="country-detail-meta">
            <span>
              <strong>Capital:</strong> {details.capitalCity}
            </span>
            {/* `travelBasics` arrives with the facts slice — render the
                Language line only once it lands so a cold first paint (prose
                only) doesn't dereference an undefined object. */}
            {details.travelBasics?.language && (
              <span>
                <strong>Language:</strong> {details.travelBasics.language}
              </span>
            )}
          </p>
          {(details.touristRating ?? 0) > 0 && (
            <div className="country-detail-rating">
              <Tooltip title="Overall rating" arrow>
                <span
                  className="country-detail-rating-icon"
                  role="img"
                  aria-label="Overall rating"
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

        <div className="country-detail-content">
          <div className="country-detail-content-main">
            <ParagraphSection
              title={`About ${country.name}`}
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

            <CulturalShockCallout
              text={details.culturalShock}
              subjectLabel={country.name}
            />

            <NotesSection items={details.notesToKnow} isError={false} />

            <LocalFlavorSection
              flavor={details.localFlavor}
              isError={false}
            />
          </div>

          <aside className="country-detail-content-side">
            <CurrencySection currency={details.currency} isError={false} />

            <AirportsSection airports={details.airports} />

            <VisaSection visa={details.visa} isError={false} />

            <WhenToVisitSection
              bestTime={details.bestTimeToVisit}
              worstTime={details.worstTimeToVisit}
              isError={false}
            />

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
            title={`Top 5 cities in ${country.name}`}
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
            title="Top 5 foods to try"
            icon={<RestaurantRoundedIcon />}
            items={details.foods}
          />
          <TipListSection
            title="Top 5 things to do"
            icon={<HikingRoundedIcon />}
            items={details.thingsToDo}
          />
          <TipListSection
            title="Top 5 photo spots"
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
