import { Link, useSearchParams } from "react-router-dom";
import classnames from "classnames";
import "./index.scss";
import { Tooltip } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import HikingRoundedIcon from "@mui/icons-material/HikingRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import Layout from "components/common/Layout/SubLayout";
import ErrorPage from "components/common/ErrorPage";
import LoadingFacts from "components/common/LoadingFacts";
import ShareButton from "components/ShareButton";
import BookmarkButton from "components/BookmarkButton";
import VisitedButton from "components/VisitedButton";
import AddToBucketButton from "components/AddToBucketButton";
import FriendsVisitedBadge from "components/FriendsVisitedBadge";
import AddToItineraryButton from "components/AddToItineraryButton";
import Stars from "components/common/Stars";
import CostBadge from "components/common/CostBadge";
import GoogleGlyph from "components/common/GoogleGlyph";
import { usePlaceRating } from "api/hooks/usePlaceRating";
import ReviewSection from "components/Review/ReviewSection";
import ReviewSummary from "components/Review/ReviewSummary";
import ParagraphSection from "components/PlaceDetail/ParagraphSection";
import PlaceDescription from "components/PlaceDetail/PlaceDescription";
import HighlightsSection from "components/PlaceDetail/HighlightsSection";
import WeatherSection from "components/PlaceDetail/WeatherSection";
import CurrencySection from "components/PlaceDetail/CurrencySection";
import SafetySection from "components/PlaceDetail/SafetySection";
import GettingThereSection from "components/PlaceDetail/GettingThereSection";
import PopularitySection from "components/PlaceDetail/PopularitySection";
import CulturalShockCallout from "components/PlaceDetail/CulturalShockCallout";
import ExperienceHighlights from "components/PlaceDetail/ExperienceHighlights";
import AirportsSection from "components/PlaceDetail/AirportsSection";
import NotesSection from "components/PlaceDetail/NotesSection";
import TipListSection from "components/PlaceDetail/TipListSection";
import BudgetSection from "components/PlaceDetail/BudgetSection";
import PlaceHero from "components/PlaceDetail/PlaceHero";
import VisaSection from "components/PlaceDetail/VisaSection";
import TravelBasicsSection from "components/PlaceDetail/TravelBasicsSection";
import LodgingSection from "components/PlaceDetail/LodgingSection";
import WhenToVisitSection from "components/PlaceDetail/WhenToVisitSection";
import LatestNewsSection from "components/PlaceDetail/LatestNewsSection";
import NearbySection from "components/PlaceDetail/NearbySection";
import LocalFlavorSection from "components/PlaceDetail/LocalFlavorSection";
import { useSearchPlaces } from "api/hooks/useSearchPlaces";
import { usePlaceDetails } from "api/hooks/usePlaceDetails";
import { usePlaceImage } from "api/hooks/usePlaceImage";
import { useIsStuck } from "hooks/useIsStuck";
import { useVisitedPlaces } from "api/hooks/useVisitedPlaces";
import { useMyItineraries } from "api/hooks/useItineraries";
import { useUser } from "context/UserContext";
import { apiIsSingleTrip } from "utils/itineraryAdapter";
import { getPlaceKey } from "utils/placeKey";
import { formatDate } from "utils/date";

const PlaceDetail = () => {
  const [searchParams] = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim();
  const index = Number(searchParams.get("i") ?? "0");
  // Trip context — when /place is opened from inside a trip
  // (`/place?q=...&id=<tripId>`), the recommender scopes its
  // suggestions to that trip's destination country for single-trips
  // (a Spain trip's "View" link shouldn't surface Tokyo). Multi-trips
  // span multiple countries by definition, so no scoping there.
  const tripId = searchParams.get("id");
  // Scroll-activated chrome — see useIsStuck.
  const toolbarIsStuck = useIsStuck();

  // Fetch the user's trips only when we actually need to resolve the
  // tripId — keeps anonymous / cold-start /place loads off the trips
  // endpoint entirely.
  const { user } = useUser();
  const { data: myItineraries } = useMyItineraries({
    enabled: Boolean(user && tripId),
  });
  const recommenderCountry = (() => {
    if (!tripId || !myItineraries) return undefined;
    const trip = myItineraries.find((t) => t.id === tripId);
    if (!trip || !apiIsSingleTrip(trip)) return undefined;
    return trip.country?.name ?? trip.intenaryDates[0]?.country?.name ?? undefined;
  })();

  // Reuses the same cached recommender response — instant if the user just
  // came from the search results page; one OpenAI/Unsplash hit if landing
  // here directly via a shared link.
  const { data, isLoading, isError, error } = useSearchPlaces(
    query,
    5,
    recommenderCountry
  );

  // Enriched details (foods, places, weather, worst-time). Lazy-fetched,
  // cached server-side on the same row so a repeat view is instant. Gated
  // on the search query having resolved — `/place-details` reads from the
  // row that `/place-recommendations` creates, so firing it before the
  // search lands 404s on direct deep-links.
  const detailsQuery = usePlaceDetails(query, index, Boolean(data));

  const detailUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `/place?q=${encodeURIComponent(query)}&i=${index}`;
  const backUrl = `/search?q=${encodeURIComponent(query)}`;

  const place = data?.items[index];

  // Hero-image fallback. When the place row arrives with no `imageUrl`
  // (older cached recommendation, transient miss), resolve one via the
  // cache-aware /places/image endpoint (cache → Unsplash → Pexels →
  // Pixabay), which persists the winner so repeat views and other users
  // are served the same image without another third-party call. Gated on
  // `!place.imageUrl` so the lookup only fires when it's actually needed.
  const { data: fallbackPhoto } = usePlaceImage(
    place?.name ?? "",
    place?.city,
    place?.country,
    { enabled: Boolean(place) && !place?.imageUrl },
  );
  // Fast hero image for the LOADING screen, keyed on the search query (the
  // place name) so we can show the photo + title immediately while the
  // recommender call is still resolving. Only fires while loading.
  const { data: loadingPhoto } = usePlaceImage(query, undefined, undefined, {
    enabled: isLoading && query.length > 0,
  });
  // Keep the hero stable across the loading → loaded transition. The loading
  // phase already resolved + displayed `loadingPhoto` (keyed on the query); the
  // resolved place row carries its OWN, separately-resolved image, so switching
  // to it made the hero visibly swap. Prefer the already-shown photo when we
  // have one; on warm loads `loadingPhoto` is undefined and we use the row's.
  const heroImageUrl =
    loadingPhoto?.imageUrl ?? place?.imageUrl ?? fallbackPhoto?.imageUrl ?? null;
  const heroPhotographerName = loadingPhoto?.imageUrl
    ? loadingPhoto.photographerName ?? null
    : place?.imageUrl
      ? place.photographerName
      : fallbackPhoto?.photographerName ?? null;
  const heroPhotographerUrl = loadingPhoto?.imageUrl
    ? loadingPhoto.photographerUrl ?? null
    : place?.imageUrl
      ? place.photographerUrl
      : fallbackPhoto?.photographerUrl ?? null;

  // Google Places rating for this place. Disabled until we actually have
  // a place to query (the page can render in loading / error states
  // before `place` resolves).
  const { data: googleRating } = usePlaceRating(
    place?.name ?? '',
    place ? `${place.city}, ${place.country}` : '',
    Boolean(place),
    // Only the star rating + review count + Maps link are shown here, so
    // request the 'rating' variant — no photo call, cheaper tier.
    'rating',
  );

  // Visited-state lookup. Same cached list powers the toolbar button and the
  // "Visited on …" indicator under the title — single source of truth so the
  // two never disagree after a mark/unmark.
  const { data: visitedData } = useVisitedPlaces();
  const visitedRecord = place
    ? visitedData?.items.find(
        (v) => v.placeKey === getPlaceKey(place.name, place.city, place.country)
      )
    : undefined;

  if (!query) {
    return (
      <ErrorPage
        pageTitle="Place"
        title="No place selected"
        description="Open this page from a search result to see its details."
      />
    );
  }

  if (isLoading) {
    // Progressive load: show the hero photo + place name right away (from the
    // query + fast image endpoint) so the page feels instant, with the
    // recommender-backed body filling in once the search resolves.
    return (
      <Layout title={query ? `${query}…` : "Loading…"}>
        <article className="place-detail place-detail--loading">
          {/* Same hero+side grid as the loaded page so the hero keeps its
              size across the transition (it used to be full-width here, then
              shrink into the 7fr column once loaded). The side cards show
              their own "fetching…" skeletons while details resolve. */}
          <div className="place-detail-top">
            <PlaceHero
              name={query}
              imageUrl={loadingPhoto?.imageUrl}
              photographerName={loadingPhoto?.photographerName}
              photographerUrl={loadingPhoto?.photographerUrl}
            />
            <aside className="place-detail-side">
              <WeatherSection weather={undefined} isError={false} />
              <CurrencySection currency={undefined} isError={false} />
              <SafetySection safety={undefined} isError={false} />
            </aside>
          </div>
          {query && (
            <header className="place-detail-header">
              <h1 className="place-detail-name">{query}</h1>
            </header>
          )}
          <div
            className="place-detail-loading-wrap"
            role="status"
            aria-live="polite"
          >
            <p className="place-detail-loading">
              {query ? `Loading ${query} details…` : "Loading details…"}
            </p>
            <LoadingFacts
              placeName={query}
              headline="A few things while you wait"
            />
          </div>
        </article>
      </Layout>
    );
  }

  if (isError) {
    return (
      <ErrorPage
        pageTitle="Error"
        title="Could not load this place"
        description={
          error instanceof Error ? error.message : 'Something went wrong.'
        }
        secondaryAction={{ label: `Back to "${query}"`, to: backUrl }}
      />
    );
  }

  if (!place) {
    return (
      <ErrorPage
        pageTitle="Not found"
        title="Place not found"
        description={`No place at position ${index + 1} for "${query}".`}
        secondaryAction={{ label: 'Back to results', to: backUrl }}
      />
    );
  }

  return (
    <Layout>
      <article className="place-detail">
        <div
          className={classnames("place-detail-toolbar", {
            "is-stuck": toolbarIsStuck,
          })}
        >
          <Link to={backUrl} className="place-detail-back-link">
            <ArrowBackRoundedIcon fontSize="small" /> Back to &ldquo;{query}
            &rdquo;
          </Link>
          <div className="place-detail-toolbar-actions">
            {/* Bookmark + Visited + Share are grouped so the mobile
                CSS can lift them out of the toolbar and overlay them
                on the hero photo's top-right corner. The primary
                AddToItineraryButton stays inline — too wide to fit
                as a hero-overlay icon chip. */}
            <div className="place-detail-overlay-actions">
              <BookmarkButton place={place} query={query} index={index} />
              <VisitedButton
                place={place}
                coordinates={detailsQuery.data?.details.coordinates}
                visa={detailsQuery.data?.details.visa}
              />
              <AddToBucketButton
                kind="place"
                name={place.name}
                context={`${place.city ?? ''}${place.country ? `, ${place.country}` : ''}`}
              />
              <ShareButton
                title={place.name}
                subtitle={`${place.city} · ${place.country}`}
                imageUrl={heroImageUrl ?? undefined}
                description={place.description}
                url={detailUrl}
                variant="pill"
                emailPayload={{
                  name: place.name,
                  city: place.city,
                  country: place.country,
                  description: place.description,
                  image_url: heroImageUrl,
                }}
              />
            </div>
            <AddToItineraryButton place={place} />
          </div>
        </div>

        <div className="place-detail-top">
          <PlaceHero
            name={place.name}
            imageUrl={heroImageUrl}
            photographerName={heroPhotographerName}
            photographerUrl={heroPhotographerUrl}
          />

          {/* Mobile-only slot: chip sits directly under the hero,
              BEFORE the weather/currency/safety stack. CSS-hidden on
              desktop where the header copy below renders instead. */}
          <div className="place-detail-friends-slot is-mobile-only">
            <FriendsVisitedBadge
              kind="place"
              placeKey={getPlaceKey(place.name, place.city, place.country)}
            />
          </div>

          {/* Right column on desktop / stacked under hero on mobile.
                        Weather, Currency, and Safety stack vertically. */}
          <aside className="place-detail-side">
            <WeatherSection
              weather={detailsQuery.data?.details.weather}
              isError={detailsQuery.isError}
            />

            <CurrencySection
              currency={detailsQuery.data?.details.currency}
              isError={detailsQuery.isError}
            />

            <SafetySection
              safety={detailsQuery.data?.details.safety}
              isError={detailsQuery.isError}
            />
          </aside>
        </div>

        <header className="place-detail-header">
          <div className="place-detail-name-row">
            <h1 className="place-detail-name">{place.name}</h1>
            <CostBadge level={detailsQuery.data?.details.costLevel} />
          </div>
          <p className="place-detail-location">
            {place.city} · {place.country}
          </p>
          {/* Desktop-only slot — pairs with the mobile slot inside
              the top section above. CSS-hidden below 720px so the
              chip appears once per viewport. */}
          <div className="place-detail-friends-slot is-desktop-only">
            <FriendsVisitedBadge
              kind="place"
              placeKey={getPlaceKey(place.name, place.city, place.country)}
            />
          </div>
          {visitedRecord && (
            <p
              className="place-detail-visited-on"
              role="status"
              aria-label="You have visited this place"
            >
              <CheckCircleRoundedIcon
                className="place-detail-visited-on-icon"
                fontSize="small"
              />
              Visited on {formatDate(visitedRecord.visitedAt, "MMM D, YYYY")}
            </p>
          )}
          <div className="place-detail-meta">
            <Tooltip title="Overall rating" arrow>
              <span
                className="place-detail-meta-icon"
                role="img"
                aria-label="Overall rating"
              >
                <PublicRoundedIcon />
              </span>
            </Tooltip>
            <Stars rating={place.rating} />
          </div>
          {googleRating?.rating != null && (
            <Tooltip title="View on Google Maps" arrow>
              <a
                className="place-detail-meta place-detail-google-rating"
                href={googleRating.googleMapsUri ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={
                  `Google rating ${googleRating.rating.toFixed(1)} out of 5` +
                  (googleRating.userRatingCount
                    ? ` based on ${googleRating.userRatingCount.toLocaleString()} reviews`
                    : '') +
                  ' (opens Google Maps)'
                }
              >
                <span className="place-detail-meta-icon place-detail-google-icon">
                  <GoogleGlyph size={18} />
                </span>
                <Stars rating={googleRating.rating} />
                {googleRating.userRatingCount != null &&
                  googleRating.userRatingCount > 0 && (
                    <span className="place-detail-google-count">
                      ({googleRating.userRatingCount.toLocaleString()})
                    </span>
                  )}
              </a>
            </Tooltip>
          )}
          <ReviewSummary
            placeName={place.name}
            placeCity={place.city}
            placeCountry={place.country}
            targetId="reviews"
          />
        </header>

        {/* Description on the left; travel + highlights + when-to-visit
                    stack on the right. Single column on mobile. */}
        <div className="place-detail-content">
          <div className="place-detail-content-main">
            <PlaceDescription
              longDescription={detailsQuery.data?.details.longDescription}
              isError={detailsQuery.isError}
              fallbackDescription={place.description}
            />

            {/* "Getting there" lives in the main content column —
                                surfaces the distance + travel time + Maps deep-
                                link right after the description, where users
                                naturally ask "how do I get there?". Previously
                                tucked into the right-side aside where it was
                                easy to miss. */}
            <GettingThereSection
              placeName={`${place.name}, ${place.city}`}
              coordinates={detailsQuery.data?.details.coordinates}
              isError={detailsQuery.isError}
            />

            <ParagraphSection
              title={`About ${place.country}`}
              description={detailsQuery.data?.details.countryDescription}
              isError={detailsQuery.isError}
            />

            <CulturalShockCallout
              text={detailsQuery.data?.details.culturalShock}
              subjectLabel={place.country}
            />

            <NotesSection
              items={detailsQuery.data?.details.notesToKnow}
              isError={detailsQuery.isError}
            />

            <BudgetSection
              description={detailsQuery.data?.details.budgetDescription}
              costLevel={detailsQuery.data?.details.costLevel}
              isError={detailsQuery.isError}
            />

            <LocalFlavorSection
              flavor={detailsQuery.data?.details.localFlavor}
              isError={detailsQuery.isError}
            />
          </div>

          <aside className="place-detail-content-side">
            <PopularitySection
              popularity={detailsQuery.data?.details.popularity}
              isError={detailsQuery.isError}
            />

            <AirportsSection
              airports={detailsQuery.data?.details.airports}
              isError={detailsQuery.isError}
            />

            <VisaSection
              visa={detailsQuery.data?.details.visa}
              isError={detailsQuery.isError}
            />

            <HighlightsSection
              city={place.city}
              country={place.country}
              cityHighlight={detailsQuery.data?.details.cityHighlight}
              countryHighlight={detailsQuery.data?.details.countryHighlight}
              isError={detailsQuery.isError}
            />

            <WhenToVisitSection
              bestTime={place.bestTimeToVisit}
              worstTime={detailsQuery.data?.details.worstTimeToVisit}
              isError={detailsQuery.isError}
            />

            <LatestNewsSection
              country={place.country}
              placeName={place.name}
            />
          </aside>
        </div>

        <ExperienceHighlights
          things={detailsQuery.data?.details.thingsToDo}
        />

        <TravelBasicsSection
          basics={detailsQuery.data?.details.travelBasics}
          isError={detailsQuery.isError}
        />

        <LodgingSection
          lodging={detailsQuery.data?.details.lodging}
          isError={detailsQuery.isError}
        />

        {/* Enriched sections — loaded lazily from /place-details. */}
        {detailsQuery.isError ? (
          <p className="place-detail-error" role="alert">
            Could not load extras:{" "}
            {detailsQuery.error instanceof Error
              ? detailsQuery.error.message
              : "Unknown error"}
          </p>
        ) : (
          <div className="place-detail-extras">
            <TipListSection
              title="Top 5 things to do"
              icon={<HikingRoundedIcon />}
              items={detailsQuery.data?.details.thingsToDo}
            />
            <TipListSection
              title="Top 5 foods to try"
              icon={<RestaurantRoundedIcon />}
              items={detailsQuery.data?.details.foods}
            />
            <TipListSection
              title="Top 5 places to visit"
              icon={<PlaceRoundedIcon />}
              items={detailsQuery.data?.details.placesToVisit}
            />
            <TipListSection
              title="Top 5 photo spots"
              icon={<PhotoCameraRoundedIcon />}
              items={detailsQuery.data?.details.photoSpots}
            />
          </div>
        )}

        <NearbySection
          items={detailsQuery.data?.details.nearbyDestinations}
          isError={detailsQuery.isError}
        />

        <div id="reviews">
          <ReviewSection
            placeName={place.name}
            placeCity={place.city}
            placeCountry={place.country}
          />
        </div>
      </article>
    </Layout>
  );
};

export default PlaceDetail;
