import { Link, useNavigate, useSearchParams } from "react-router-dom";
import "./index.scss";
import { CircularProgress } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import FlightTakeoffRoundedIcon from "@mui/icons-material/FlightTakeoffRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import HikingRoundedIcon from "@mui/icons-material/HikingRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import Layout from "components/common/Layout/SubLayout";
import ErrorPage from "components/common/ErrorPage";
import CostBadge from "components/common/CostBadge";
import BookmarkCityButton from "components/BookmarkCityButton";
import VisitedCityButton from "components/VisitedCityButton";
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
import WhenToVisitSection from "components/PlaceDetail/WhenToVisitSection";
import TravelBasicsSection from "components/PlaceDetail/TravelBasicsSection";
import LodgingSection from "components/PlaceDetail/LodgingSection";
import TipListSection from "components/PlaceDetail/TipListSection";
import GettingThereSection from "components/PlaceDetail/GettingThereSection";
import AirportsSection from "components/PlaceDetail/AirportsSection";
import { useCityDetails } from "api/hooks/useCityDetails";
import { basicInfo, resetTrip, useTripDispatch } from "context/TripContext";
import { TRIP_BASIC } from "constants";
import type { Destination } from "types";

const CityDetail = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const dispatch = useTripDispatch();
    const name = (searchParams.get("name") ?? "").trim();
    const country = (searchParams.get("country") ?? "").trim();
    const code = (searchParams.get("code") ?? "").trim().toUpperCase();

    // Mode carried from upstream (TopPlaces, country page top_cities, …). Anything
    // other than "multiple" defaults to single.
    const modeParam = (searchParams.get("mode") ?? "").trim().toLowerCase();
    const tripType =
        modeParam === "multiple" ? TRIP_BASIC.MULTIPLE : TRIP_BASIC.SINGLE;

    const { data, isLoading, isError, error } = useCityDetails(
        name,
        country,
        code
    );

    const startTrip = (cityCountry: {
        name: string;
        countryCode: string;
        countryId: string | null;
        countryImage: string | null;
    }) => {
        // Use the catalog UUID when we have it — the itinerary save mutation
        // rejects ids that don't match a real countries row, so id=0 would
        // silently drop the country FK on save.
        const destinations = [
            {
                country: {
                    id: cityCountry.countryId ?? 0,
                    name: cityCountry.name,
                    code: cityCountry.countryCode,
                    image: cityCountry.countryImage ?? undefined,
                },
            },
        ] as Destination[];
        dispatch(resetTrip());
        dispatch(basicInfo({ type: tripType, destinations }));
        navigate(tripType.route, { replace: true });
    };

    if (!name || !country || !code) {
        return (
            <ErrorPage
                pageTitle="City"
                title="Missing city info"
                description="Open this page from a city link to see its details."
            />
        );
    }

    if (isLoading) {
        return (
            <Layout title="Loading…">
                <div
                    className="city-detail-loading"
                    role="status"
                    aria-live="polite"
                >
                    <CircularProgress
                        className="city-detail-loading-spinner"
                        size={48}
                        thickness={4}
                    />
                    <p className="city-detail-loading-text">
                        Loading {name} details…
                    </p>
                    <p className="city-detail-loading-hint">
                        First-time look-ups take a few seconds while we gather
                        travel info.
                    </p>
                </div>
            </Layout>
        );
    }

    if (isError || !data) {
        return (
            <ErrorPage
                pageTitle="Error"
                title="Could not load this city"
                description={
                    error instanceof Error
                        ? error.message
                        : `No city found for ${name}, ${country}.`
                }
                secondaryAction={{ label: "Back to home", to: "/" }}
            />
        );
    }

    const { city, details } = data;
    const placeForGetting = `${city.name}, ${city.country}`;

    return (
        <Layout title={city.name}>
            <article className="city-detail">
                <div className="city-detail-toolbar">
                    <Link
                        to={`/country?code=${encodeURIComponent(city.countryCode)}`}
                        className="city-detail-back-link"
                    >
                        <ArrowBackRoundedIcon fontSize="small" /> Back to{" "}
                        {city.country}
                    </Link>
                    <div className="city-detail-toolbar-actions">
                        <BookmarkCityButton
                            cityName={city.name}
                            countryName={city.country}
                            countryCode={city.countryCode}
                            imageUrl={city.imageUrl}
                        />
                        <VisitedCityButton
                            cityName={city.name}
                            countryName={city.country}
                            countryCode={city.countryCode}
                        />
                        <ShareButton
                            title={city.name}
                            subtitle={city.country}
                            url={
                                typeof window !== "undefined"
                                    ? window.location.href
                                    : `/city?name=${encodeURIComponent(
                                          city.name
                                      )}&country=${encodeURIComponent(
                                          city.country
                                      )}&code=${encodeURIComponent(
                                          city.countryCode
                                      )}`
                            }
                            variant="pill"
                            emailPayload={{
                                name: city.name,
                                city: city.name,
                                country: city.country,
                                description: "",
                                image_url: city.imageUrl,
                            }}
                        />
                        <button
                            type="button"
                            className="city-detail-plan-cta"
                            onClick={() =>
                                startTrip({
                                    name: city.country,
                                    countryCode: city.countryCode,
                                    countryId: city.countryId,
                                    countryImage: city.imageUrl,
                                })
                            }
                        >
                            <FlightTakeoffRoundedIcon className="city-detail-plan-cta-icon" />
                            <span className="city-detail-plan-cta-text">
                                <span className="city-detail-plan-cta-label">
                                    {tripType.id === TRIP_BASIC.MULTIPLE.id
                                        ? "Start multi-destination trip"
                                        : "Start planning"}
                                </span>
                                <span className="city-detail-plan-cta-target">
                                    {city.name}
                                </span>
                            </span>
                            <ArrowForwardRoundedIcon className="city-detail-plan-cta-arrow" />
                        </button>
                    </div>
                </div>

                <div className="city-detail-top">
                    <PlaceHero
                        name={city.name}
                        imageUrl={city.imageUrl}
                        photographerName={city.photographerName}
                        photographerUrl={city.photographerUrl}
                        className="city-detail-hero"
                    />

                    <aside className="city-detail-side">
                        <WeatherSection
                            weather={details.weather}
                            isError={false}
                        />
                        <CurrencySection
                            currency={details.currency}
                            isError={false}
                        />
                        <SafetySection
                            safety={details.safety}
                            isError={false}
                        />
                    </aside>
                </div>

                <header className="city-detail-header">
                    <div className="city-detail-name-row">
                        <h1 className="city-detail-name">{city.name}</h1>
                        <CostBadge level={details.costLevel} />
                    </div>
                    <p className="city-detail-location">
                        {city.country} ({city.countryCode})
                    </p>
                    <p className="city-detail-highlight">
                        {details.cityHighlight}
                    </p>
                </header>

                <div className="city-detail-content">
                    <div className="city-detail-content-main">
                        <ParagraphSection
                            title={`About ${city.name}`}
                            description={details.longDescription}
                            isError={false}
                        />

                        <ParagraphSection
                            title={`About ${city.country}`}
                            description={details.countryDescription}
                            isError={false}
                        />

                        <NotesSection
                            items={details.notesToKnow}
                            isError={false}
                        />

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
                            origin={details.coordinates}
                            isError={false}
                        />
                    </div>

                    <aside className="city-detail-content-side">
                        <GettingThereSection
                            placeName={placeForGetting}
                            coordinates={details.coordinates}
                            isError={false}
                        />

                        <AirportsSection airports={details.airports} />

                        <VisaSection visa={details.visa} isError={false} />

                        <WhenToVisitSection
                            bestTime={details.bestTimeToVisit}
                            worstTime={details.worstTimeToVisit}
                            isError={false}
                        />
                    </aside>
                </div>

                <TravelBasicsSection
                    basics={details.travelBasics}
                    isError={false}
                />

                <LodgingSection lodging={details.lodging} isError={false} />

                <div className="city-detail-extras">
                    <TipListSection
                        title={`Top 5 places in ${city.name}`}
                        icon={<PlaceRoundedIcon />}
                        items={details.topPlaces}
                    />
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
            </article>
        </Layout>
    );
};

export default CityDetail;
