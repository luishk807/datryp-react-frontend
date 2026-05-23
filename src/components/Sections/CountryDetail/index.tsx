import { Link, useNavigate, useSearchParams } from "react-router-dom";
import classnames from "classnames";
import "./index.scss";
import { CircularProgress, Tooltip } from "@mui/material";
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
import BookmarkCountryButton from "components/BookmarkCountryButton";
import ShareButton from "components/ShareButton";
import PlaceHero from "components/PlaceDetail/PlaceHero";
import WeatherSection from "components/PlaceDetail/WeatherSection";
import CurrencySection from "components/PlaceDetail/CurrencySection";
import SafetySection from "components/PlaceDetail/SafetySection";
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
import { useCountryDetails } from "api/hooks/useCountryDetails";
import { useMonthlyBestPlace } from "api/hooks/useMonthlyBestPlace";
import { useIsStuck } from "hooks/useIsStuck";
import { basicInfo, resetTrip, useTripDispatch } from "context/TripContext";
import { now } from "utils";
import { TRIP_BASIC } from "constants";
import type { Destination } from "types";

const CountryDetail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useTripDispatch();
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

  const { data, isLoading, isError, error } = useCountryDetails(code);

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
  ) => {
    const destinations = [
      {
        country: {
          id: country.id,
          name: country.name,
          code: country.code,
          local: country.local ?? undefined,
          image: country.image ?? undefined,
        },
      },
    ] as Destination[];
    const today = now();
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
    return (
      <Layout title="Loading…">
        <div className="country-detail-loading" role="status" aria-live="polite">
          <CircularProgress
            className="country-detail-loading-spinner"
            size={48}
            thickness={4}
          />
          <p className="country-detail-loading-text">
            Loading {code} details…
          </p>
          <p className="country-detail-loading-hint">
            First-time look-ups take a few seconds while we gather travel info.
          </p>
        </div>
      </Layout>
    );
  }

  if (isError || !data) {
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

  const { country, details } = data;

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
            <BookmarkCountryButton
              countryCode={country.code}
              countryName={country.name}
              imageUrl={country.image}
            />
            <VisitedCountryButton
              countryCode={country.code}
              countryName={country.name}
            />
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
            <button
              type="button"
              className="country-detail-plan-cta"
              onClick={() => startTrip(country)}
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
            className="country-detail-hero"
          />

          <aside className="country-detail-side">
            <WeatherSection
              weather={details.weather}
              isError={false}
            />
            <CurrencySection currency={details.currency} isError={false} />
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
          <p className="country-detail-highlight">{details.countryHighlight}</p>
          <p className="country-detail-meta">
            <span>
              <strong>Capital:</strong> {details.capitalCity}
            </span>
            <span>
              <strong>Language:</strong> {details.travelBasics.language}
            </span>
          </p>
          {details.touristRating > 0 && (
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
              <Stars rating={details.touristRating} />
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

            <NotesSection items={details.notesToKnow} isError={false} />

            <BudgetSection
              description={details.budgetDescription}
              costLevel={details.costLevel}
              isError={false}
            />

            <LocalFlavorSection
              flavor={details.localFlavor}
              isError={false}
            />

            <NearbySection
              items={details.nearbyDestinations}
              origin={undefined}
              isError={false}
            />
          </div>

          <aside className="country-detail-content-side">
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
              {details.topCities.map((city) => (
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
