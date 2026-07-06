import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import classnames from "classnames";
import "./index.scss";
import { Tooltip } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import HikingRoundedIcon from "@mui/icons-material/HikingRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import Layout from "components/common/Layout/SubLayout";
import ErrorPage from "components/common/ErrorPage";
import ParagraphSkeleton from "components/common/ParagraphSkeleton";
import ShareButton from "components/ShareButton";
import BookmarkButton from "components/BookmarkButton";
import DetailTour from "components/DetailTour";
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
import EssentialAppsSection from "components/PlaceDetail/EssentialAppsSection";
import CountryFactsSection from "components/PlaceDetail/CountryFactsSection";
import ReligionSection from "components/PlaceDetail/ReligionSection";
import TippingSection from "components/PlaceDetail/TippingSection";
import CurrencyTipsSection from "components/PlaceDetail/CurrencyTipsSection";
import TapWaterSection from "components/PlaceDetail/TapWaterSection";
import AirQualitySection from "components/PlaceDetail/AirQualitySection";
import WifiSection from "components/PlaceDetail/WifiSection";
import GreatForSection from "components/PlaceDetail/GreatForSection";
import StayingSafeSection from "components/PlaceDetail/StayingSafeSection";
import BeforeYouGoSection from "components/PlaceDetail/BeforeYouGoSection";
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
import PlaceMetaLine from "components/PlaceDetail/PlaceMetaLine";
import { useSearchPlaces } from "api/hooks/useSearchPlaces";
import { usePlaceDirect } from "api/hooks/usePlaceDirect";
import { usePlaceDetailsProgressive } from "api/hooks/usePlaceDetails";
import { usePlaceImage } from "api/hooks/usePlaceImage";
import { useIsStuck } from "hooks/useIsStuck";
import { useVisitedPlaces } from "api/hooks/useVisitedPlaces";
import { useMyItineraries } from "api/hooks/useItineraries";
import { useUser } from "context/UserContext";
import { apiIsSingleTrip } from "utils/itineraryAdapter";
import { getPlaceKey } from "utils/placeKey";
import { formatDate } from "utils/date";

const PlaceDetail = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim();
  const index = Number(searchParams.get("i") ?? "0");
  // Go-direct entry: when a link already knows the place (name + city +
  // country), it deep-links with `&city=&country=` so the page can resolve the
  // place via a single-place seed (`usePlaceDirect`) instead of running the
  // 5-result AI recommender "discovery hop". Falls back to the search path when
  // those params are absent (legacy /place?q=&i= links + deep links/shares).
  const cityParam = (searchParams.get("city") ?? "").trim();
  const countryParam = (searchParams.get("country") ?? "").trim();
  const isDirect =
    query.length > 0 && cityParam.length > 0 && countryParam.length > 0;
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
  // here directly via a shared link. Disabled in go-direct mode (resolved via
  // usePlaceDirect below) so a known place never burns the 5-result search.
  const search = useSearchPlaces(query, 5, recommenderCountry, "search", {
    enabled: !isDirect,
  });
  // Go-direct resolution — seeds/reuses a single-place row and returns the same
  // shape as the search. Only fires when the link carried city + country.
  const direct = usePlaceDirect(query, cityParam, countryParam, {
    enabled: isDirect,
  });

  const active = isDirect ? direct : search;
  const { data, isLoading, isError, error } = active;
  // In direct mode the place is always index 0 of its single-place row, and the
  // slices must key on the canonical query the seed returned (name, city,
  // country) — not the bare `q` name.
  const effectiveQuery = isDirect ? data?.query ?? query : query;
  const effectiveIndex = isDirect ? 0 : index;

  // Enriched details, fetched as three parallel slices (prose / lists /
  // facts) so a cold place's body streams in phases instead of blocking on
  // the slowest group. Cached server-side on the same row so a repeat view is
  // instant. Gated on the recommendation having resolved — `/place-details*`
  // reads from the row the recommendation creates/seeds, so firing before it
  // lands 404s. Each section renders its own skeleton (data `undefined`) until
  // its slice arrives.
  const detailsProgressive = usePlaceDetailsProgressive(
    effectiveQuery,
    effectiveIndex,
    Boolean(data)
  );
  // Compat shape so the existing `detailsQuery.data?.details.X` reads keep
  // working, now sourced from the merged slices.
  const detailsQuery = {
    data: { details: detailsProgressive.details },
  };
  // Per-slice error flags. Each section below reads the flag of the slice that
  // feeds it, so a single failed slice (e.g. `facts`) only surfaces an error in
  // its own sections — the prose description and lists extras still render.
  const { proseError, listsError, factsError } = detailsProgressive;

  const detailUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `/place?q=${encodeURIComponent(query)}&i=${index}`;
  const backUrl = `/search?q=${encodeURIComponent(query)}`;

  const place = data?.items[effectiveIndex];

  // Descriptive-search badge: when the user reached this page from an
  // interest search ("ancient ruins") rather than a direct place link, echo
  // what they searched so they remember why this place surfaced — reinforcing
  // the interest → discovery funnel. Suppressed in go-direct mode and when the
  // query is essentially the place name (a literal place search), where the
  // echo would be redundant.
  const showSearchMatch = (() => {
    if (isDirect || !query) return false;
    const q = query.trim().toLowerCase();
    const n = (place?.name ?? "").trim().toLowerCase();
    return q.length > 0 && q !== n && !n.includes(q) && !q.includes(n);
  })();

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
        pageTitle={t('detail.place.pageTitle')}
        title={t('detail.place.noneSelected')}
        description={t('detail.place.noneSelectedDesc')}
        primaryActionLabel={t('detail.common.goHome')}
      />
    );
  }

  if (isLoading) {
    // Progressive load: show the hero photo + place name right away (from the
    // query + fast image endpoint) so the page feels instant, with the
    // recommender-backed body filling in once the search resolves.
    return (
      <Layout title={query ? `${query}…` : t('detail.place.loading')}>
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
            className="place-detail-loading-body"
            role="status"
            aria-live="polite"
            aria-label={
              query
                ? t('detail.common.loadingDetails', { name: query })
                : t('detail.place.loadingDetailsGeneric')
            }
          >
            <ParagraphSkeleton lines={7} />
          </div>
        </article>
      </Layout>
    );
  }

  if (isError) {
    return (
      <ErrorPage
        pageTitle={t('detail.common.errorPageTitle')}
        title={t('detail.place.errorTitle')}
        description={
          error instanceof Error
            ? error.message
            : t('detail.place.somethingWrong')
        }
        secondaryAction={{
          label: t('detail.place.backToQuery', { query }),
          to: backUrl,
        }}
        primaryActionLabel={t('detail.common.goHome')}
      />
    );
  }

  if (!place) {
    return (
      <ErrorPage
        pageTitle={t('detail.place.notFoundPageTitle')}
        title={t('detail.place.notFoundTitle')}
        description={t('detail.place.notFoundDesc', {
          position: index + 1,
          query,
        })}
        secondaryAction={{
          label: t('detail.place.backToResults'),
          to: backUrl,
        }}
        primaryActionLabel={t('detail.common.goHome')}
      />
    );
  }

  return (
    <Layout>
      <DetailTour kind="place" />
      <article className="place-detail">
        <div
          className={classnames("place-detail-toolbar", {
            "is-stuck": toolbarIsStuck,
          })}
        >
          <Link to={backUrl} className="place-detail-back-link">
            <ArrowBackRoundedIcon fontSize="small" />{" "}
            {t('detail.place.backToQueryQuoted', { query })}
          </Link>
          <div className="place-detail-toolbar-actions">
            {/* Bookmark + Visited + Share are grouped so the mobile
                CSS can lift them out of the toolbar and overlay them
                on the hero photo's top-right corner. The primary
                AddToItineraryButton stays inline — too wide to fit
                as a hero-overlay icon chip. */}
            <div className="place-detail-overlay-actions">
              <BookmarkButton
                place={place}
                query={effectiveQuery}
                index={effectiveIndex}
              />
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
            galleryQuery={[place.name, place.city, place.country]
              .filter(Boolean)
              .join(" ")}
          />

          {/* Right column on desktop / stacked under hero on mobile.
                        Weather, Currency, and Safety stack vertically. */}
          <header className="place-detail-header">
            <div className="place-detail-name-row">
              <h1 className="place-detail-name">{place.name}</h1>
              <CostBadge level={detailsQuery.data?.details.costLevel} />
            </div>
            <PlaceMetaLine
              countryCode={place.countryCode}
              countryName={place.country}
            >
              <span className="place-meta-seg">
                {place.city} · {place.country}
              </span>
              {detailsQuery.data?.details.travelBasics?.language && (
                <span className="place-meta-seg">
                  <strong>{t('detail.country.language')}</strong>
                  {detailsQuery.data.details.travelBasics.language}
                </span>
              )}
            </PlaceMetaLine>
            {/* Why this place is worth a visit — also the "why it matches"
                context when the user arrived via an interest search. Uses
                the recommender's per-place blurb. */}
            {place.description && (
              <p className="place-detail-highlight">{place.description}</p>
            )}
            {showSearchMatch && (
              <p className="place-detail-search-match" role="status">
                <SearchRoundedIcon
                  className="place-detail-search-match-icon"
                  fontSize="small"
                />
                {t('detail.place.matchesSearch', { query })}
              </p>
            )}
            {/* Visited-by-friends chip (self-hides at count 0). */}
            <div className="place-detail-friends-slot">
              <FriendsVisitedBadge
                kind="place"
                placeKey={getPlaceKey(place.name, place.city, place.country)}
              />
            </div>
            {visitedRecord && (
              <p
                className="place-detail-visited-on"
                role="status"
                aria-label={t('detail.place.visitedAria')}
              >
                <CheckCircleRoundedIcon
                  className="place-detail-visited-on-icon"
                  fontSize="small"
                />
                {t('detail.place.visitedOn', {
                  date: formatDate(visitedRecord.visitedAt, "MMM D, YYYY"),
                })}
              </p>
            )}
            <div className="place-detail-meta">
              <Tooltip title={t('detail.common.overallRating')} arrow>
                <span
                  className="place-detail-meta-icon"
                  role="img"
                  aria-label={t('detail.common.overallRating')}
                >
                  <PublicRoundedIcon />
                </span>
              </Tooltip>
              <Stars rating={place.rating} />
            </div>
            {googleRating?.rating != null && (
              <Tooltip title={t('detail.place.viewOnGoogleMaps')} arrow>
                <a
                  className="place-detail-meta place-detail-google-rating"
                  href={googleRating.googleMapsUri ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={
                    googleRating.userRatingCount
                      ? t('detail.place.googleRatingAriaCount', {
                          rating: googleRating.rating.toFixed(1),
                          n: googleRating.userRatingCount.toLocaleString(),
                        })
                      : t('detail.place.googleRatingAria', {
                          rating: googleRating.rating.toFixed(1),
                        })
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

          <aside className="place-detail-side">
            <WeatherSection
              weather={detailsQuery.data?.details.weather}
              coordinates={detailsQuery.data?.details.coordinates}
              isError={proseError}
            />

            <CurrencySection
              currency={detailsQuery.data?.details.currency}
              isError={factsError}
            />

            <SafetySection
              safety={detailsQuery.data?.details.safety}
              isError={factsError}
            />
          </aside>
        </div>

        {/* Description on the left; travel + highlights + when-to-visit
                    stack on the right. Single column on mobile. */}
        <div className="place-detail-content">
          <div className="place-detail-content-main">
            <PlaceDescription
              longDescription={detailsQuery.data?.details.longDescription}
              isError={proseError}
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
              isError={factsError}
            />

            <ParagraphSection
              title={t('detail.common.about', { name: place.country })}
              description={detailsQuery.data?.details.countryDescription}
              isError={proseError}
            />

            <CulturalShockCallout
              text={detailsQuery.data?.details.culturalShock}
              subjectLabel={place.country}
            />

            <BeforeYouGoSection
              items={detailsQuery.data?.details.beforeYouGo}
            />

            <NotesSection
              items={detailsQuery.data?.details.notesToKnow}
              isError={listsError}
            />

            <BudgetSection
              description={detailsQuery.data?.details.budgetDescription}
              costLevel={detailsQuery.data?.details.costLevel}
              isError={proseError}
            />

            <EssentialAppsSection code={place.countryCode} />

            <LocalFlavorSection
              flavor={detailsQuery.data?.details.localFlavor}
              isError={listsError}
            />
          </div>

          <aside className="place-detail-content-side">
            <PopularitySection
              popularity={detailsQuery.data?.details.popularity}
              isError={factsError}
            />

            <AirportsSection
              airports={detailsQuery.data?.details.airports}
              isError={factsError}
            />

            <VisaSection
              visa={detailsQuery.data?.details.visa}
              isError={factsError}
            />

            <WhenToVisitSection
              bestTime={place.bestTimeToVisit}
              worstTime={detailsQuery.data?.details.worstTimeToVisit}
              isError={proseError}
            />

            <HighlightsSection
              city={place.city}
              country={place.country}
              cityHighlight={detailsQuery.data?.details.cityHighlight}
              countryHighlight={detailsQuery.data?.details.countryHighlight}
              isError={proseError}
            />

            <StayingSafeSection code={place.countryCode} />

            <CountryFactsSection code={place.countryCode} />

            <ReligionSection code={place.countryCode} />

            <TippingSection code={place.countryCode} />

            <CurrencyTipsSection code={place.countryCode} />

            <TapWaterSection code={place.countryCode} />

            <AirQualitySection
              coordinates={detailsQuery.data?.details.coordinates}
            />

            <WifiSection code={place.countryCode} />

            <GreatForSection code={place.countryCode} />

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
          isError={factsError}
        />

        <LodgingSection
          lodging={detailsQuery.data?.details.lodging}
          isError={factsError}
        />

        {/* Enriched "Top 5" sections — all four come from the `lists` slice, so
            they share its error state. A failed `lists` call only blanks this
            block now; prose + facts sections above stay intact. */}
        {listsError ? (
          <p className="place-detail-error" role="alert">
            {t('detail.place.extrasError', {
              message:
                detailsProgressive.error instanceof Error
                  ? detailsProgressive.error.message
                  : t('detail.place.unknownError'),
            })}
          </p>
        ) : (
          <div className="place-detail-extras">
            <TipListSection
              title={t('detail.common.top5.things')}
              icon={<HikingRoundedIcon />}
              items={detailsQuery.data?.details.thingsToDo}
            />
            <TipListSection
              title={t('detail.common.top5.foods')}
              icon={<RestaurantRoundedIcon />}
              items={detailsQuery.data?.details.foods}
            />
            <TipListSection
              title={t('detail.common.top5.placesToVisit')}
              icon={<PlaceRoundedIcon />}
              items={detailsQuery.data?.details.placesToVisit}
            />
            <TipListSection
              title={t('detail.common.top5.photoSpots')}
              icon={<PhotoCameraRoundedIcon />}
              items={detailsQuery.data?.details.photoSpots}
            />
          </div>
        )}

        <NearbySection
          items={detailsQuery.data?.details.nearbyDestinations}
          isError={listsError}
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
