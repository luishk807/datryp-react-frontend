import { Link, useSearchParams } from "react-router-dom";
import "./index.scss";
import { Tooltip } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import HikingRoundedIcon from "@mui/icons-material/HikingRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import Layout from "components/common/Layout/SubLayout";
import ShareButton from "components/ShareButton";
import BookmarkButton from "components/BookmarkButton";
import Stars from "components/common/Stars";
import CostBadge from "components/common/CostBadge";
import ReviewSection from "components/Review/ReviewSection";
import ReviewSummary from "components/Review/ReviewSummary";
import ParagraphSection from "components/PlaceDetail/ParagraphSection";
import PlaceDescription from "components/PlaceDetail/PlaceDescription";
import HighlightsSection from "components/PlaceDetail/HighlightsSection";
import WeatherSection from "components/PlaceDetail/WeatherSection";
import CurrencySection from "components/PlaceDetail/CurrencySection";
import SafetySection from "components/PlaceDetail/SafetySection";
import GettingThereSection from "components/PlaceDetail/GettingThereSection";
import NotesSection from "components/PlaceDetail/NotesSection";
import TipListSection from "components/PlaceDetail/TipListSection";
import BudgetSection from "components/PlaceDetail/BudgetSection";
import PlaceHero from "components/PlaceDetail/PlaceHero";
import VisaSection from "components/PlaceDetail/VisaSection";
import TravelBasicsSection from "components/PlaceDetail/TravelBasicsSection";
import LodgingSection from "components/PlaceDetail/LodgingSection";
import WhenToVisitSection from "components/PlaceDetail/WhenToVisitSection";
import NearbySection from "components/PlaceDetail/NearbySection";
import LocalFlavorSection from "components/PlaceDetail/LocalFlavorSection";
import { useSearchPlaces } from "api/hooks/useSearchPlaces";
import { usePlaceDetails } from "api/hooks/usePlaceDetails";

const PlaceDetail = () => {
  const [searchParams] = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim();
  const index = Number(searchParams.get("i") ?? "0");

  // Reuses the same cached recommender response — instant if the user just
  // came from the search results page; one OpenAI/Unsplash hit if landing
  // here directly via a shared link.
  const { data, isLoading, isError, error } = useSearchPlaces(query, 5);

  // Enriched details (foods, places, weather, worst-time). Lazy-fetched,
  // cached server-side on the same row so a repeat view is instant.
  const detailsQuery = usePlaceDetails(query, index);

  const detailUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `/place?q=${encodeURIComponent(query)}&i=${index}`;
  const backUrl = `/search?q=${encodeURIComponent(query)}`;

  const place = data?.items[index];

  if (!query) {
    return (
      <Layout title="Place">
        <p className="place-detail-empty">
          Missing query — open this page from a search result.
        </p>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout title="Loading…">
        <p className="place-detail-loading">Loading details…</p>
      </Layout>
    );
  }

  if (isError) {
    return (
      <Layout title="Error">
        <p className="place-detail-error" role="alert">
          Could not load this place:{" "}
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
      </Layout>
    );
  }

  if (!place) {
    return (
      <Layout title="Not found">
        <p className="place-detail-empty">
          No place at position {index + 1} for &ldquo;{query}&rdquo;.
        </p>
        <Link to={backUrl} className="place-detail-back-link">
          <ArrowBackRoundedIcon fontSize="small" /> Back to results
        </Link>
      </Layout>
    );
  }

  return (
    <Layout title={place.name}>
      <article className="place-detail">
        <div className="place-detail-toolbar">
          <Link to={backUrl} className="place-detail-back-link">
            <ArrowBackRoundedIcon fontSize="small" /> Back to &ldquo;{query}
            &rdquo;
          </Link>
          <div className="place-detail-toolbar-actions">
            <BookmarkButton place={place} query={query} index={index} />
            <ShareButton place={place} searchUrl={detailUrl} variant="pill" />
          </div>
        </div>

        <div className="place-detail-top">
          <PlaceHero
            name={place.name}
            imageUrl={place.imageUrl}
            photographerName={place.photographerName}
            photographerUrl={place.photographerUrl}
          />

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

            <ParagraphSection
              title={`About ${place.country}`}
              description={detailsQuery.data?.details.countryDescription}
              isError={detailsQuery.isError}
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

            <NearbySection
              items={detailsQuery.data?.details.nearbyDestinations}
              origin={detailsQuery.data?.details.coordinates}
              isError={detailsQuery.isError}
            />
          </div>

          <aside className="place-detail-content-side">
            <GettingThereSection
              placeName={`${place.name}, ${place.city}`}
              coordinates={detailsQuery.data?.details.coordinates}
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
          </aside>
        </div>

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
