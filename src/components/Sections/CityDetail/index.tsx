import { useNavigate, useSearchParams } from "react-router-dom";
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
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import Layout from "components/common/Layout/SubLayout";
import ErrorPage from "components/common/ErrorPage";
import CostBadge from "components/common/CostBadge";
import Stars from "components/common/Stars";
import ReviewSection from "components/Review/ReviewSection";
import ReviewSummary from "components/Review/ReviewSummary";
import BookmarkCityButton from "components/BookmarkCityButton";
import DetailTour from "components/DetailTour";
import VisitedCityButton from "components/VisitedCityButton";
import AddToBucketButton from "components/AddToBucketButton";
import FriendsVisitedBadge from "components/FriendsVisitedBadge";
import { getPlaceKey } from "utils/placeKey";
import ShareButton from "components/ShareButton";
import PlaceHero from "components/PlaceDetail/PlaceHero";
import WeatherSection from "components/PlaceDetail/WeatherSection";
import CurrencySection from "components/PlaceDetail/CurrencySection";
import SafetySection from "components/PlaceDetail/SafetySection";
import PopularitySection from "components/PlaceDetail/PopularitySection";
import CulturalShockCallout from "components/PlaceDetail/CulturalShockCallout";
import ExperienceHighlights from "components/PlaceDetail/ExperienceHighlights";
import ParagraphSection from "components/PlaceDetail/ParagraphSection";
import NotesSection from "components/PlaceDetail/NotesSection";
import BudgetSection from "components/PlaceDetail/BudgetSection";
import LocalFlavorSection from "components/PlaceDetail/LocalFlavorSection";
import NearbySection from "components/PlaceDetail/NearbySection";
import VisaSection from "components/PlaceDetail/VisaSection";
import WhenToVisitSection from "components/PlaceDetail/WhenToVisitSection";
import LatestNewsSection from "components/PlaceDetail/LatestNewsSection";
import TravelBasicsSection from "components/PlaceDetail/TravelBasicsSection";
import LodgingSection from "components/PlaceDetail/LodgingSection";
import TipListSection from "components/PlaceDetail/TipListSection";
import GettingThereSection from "components/PlaceDetail/GettingThereSection";
import AirportsSection from "components/PlaceDetail/AirportsSection";
import EssentialAppsSection from "components/PlaceDetail/EssentialAppsSection";
import DetailFactsGrid from "components/PlaceDetail/DetailFactsGrid";
import CountryFactsSection from "components/PlaceDetail/CountryFactsSection";
import ReligionSection from "components/PlaceDetail/ReligionSection";
import EtiquetteSection from "components/PlaceDetail/EtiquetteSection";
import TippingSection from "components/PlaceDetail/TippingSection";
import CurrencyTipsSection from "components/PlaceDetail/CurrencyTipsSection";
import AvgCostsSection from "components/PlaceDetail/AvgCostsSection";
import TapWaterSection from "components/PlaceDetail/TapWaterSection";
import AirQualitySection from "components/PlaceDetail/AirQualitySection";
import WalkabilitySection from "components/PlaceDetail/WalkabilitySection";
import WifiSection from "components/PlaceDetail/WifiSection";
import GreatForSection from "components/PlaceDetail/GreatForSection";
import FestivalsSection from "components/PlaceDetail/FestivalsSection";
import StayingSafeSection from "components/PlaceDetail/StayingSafeSection";
import BeforeYouGoSection from "components/PlaceDetail/BeforeYouGoSection";
import HiddenGemsSection from "components/PlaceDetail/HiddenGemsSection";
import PlaceMetaLine from "components/PlaceDetail/PlaceMetaLine";
import { useCityDetailsProgressive } from "api/hooks/useCityDetails";
import { usePlaceImage } from "api/hooks/usePlaceImage";
import { useNearestAirport } from "api/hooks/useHomeDeparture";
import { useDestinationAirport } from "api/hooks/useDestinationAirport";
import { useUser } from "context/UserContext";
import { useIsStuck } from "hooks/useIsStuck";
import {
    basicInfo,
    resetTrip,
    useTripDispatch,
} from "context/TripContext";
import { tomorrow } from "utils";
import { ACTIVITY_KIND, TRIP_BASIC } from "constants";
import type { Activity, Destination } from "types";

const CityDetail = () => {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const dispatch = useTripDispatch();
    // Home-base airport drives the Day-1 "Flight to <city>" auto-seed.
    // Hook returns `null` when the user hasn't set a home city — we skip
    // the activity injection in that case, same silent-skip pattern as
    // AddPlaceBtn's segment seeding.
    const { data: nearestAirport } = useNearestAirport();
    const { user } = useUser();
    // Scroll-activated chrome — toolbar grows a translucent bg + drop
    // shadow once the user has scrolled past a small threshold, and
    // reverts to a flat in-flow look when they scroll back to the top.
    const toolbarIsStuck = useIsStuck();
    const name = (searchParams.get("name") ?? "").trim();
    const country = (searchParams.get("country") ?? "").trim();
    const code = (searchParams.get("code") ?? "").trim().toUpperCase();

    // Mode carried from upstream (TopPlaces, country page top_cities, …). Anything
    // other than "multiple" defaults to single.
    const modeParam = (searchParams.get("mode") ?? "").trim().toLowerCase();
    const tripType =
        modeParam === "multiple" ? TRIP_BASIC.MULTIPLE : TRIP_BASIC.SINGLE;

    // Progressive load: prose / lists / facts are fetched as three parallel
    // slices (each its own cached OpenAI group). Prose gates first paint — it
    // carries the city summary + "about" text; lists and facts stream into
    // their sections as they land, each rendering its own skeleton meanwhile.
    const { city, details, isLoading, isError, error } =
        useCityDetailsProgressive(name, country, code);

    // Arrival airport for the auto-seeded outbound flight (depart side is the
    // user's nearest home airport). Prefer the AI-provided airports list, but
    // fall back to the static airports catalog keyed on the city name for
    // older cached cities whose `airports` field is empty — without it
    // `arrivalAirportCode` was null and no flight seeded by default.
    const detailArrivalAirport = details?.airports?.[0]?.iataCode ?? null;
    const { data: fallbackArrivalAirport } = useDestinationAirport(
        name,
        !detailArrivalAirport,
    );
    const arrivalAirportCode =
        detailArrivalAirport ?? fallbackArrivalAirport ?? null;

    // Fast, independent hero image so the loading screen shows the city's
    // photo + name immediately instead of a blank spinner while the prose
    // slice resolves. Hits the cache-aware /places/image endpoint; only fired
    // while the prose slice is still loading.
    const { data: heroPhoto } = usePlaceImage(name, name, country, {
        enabled: isLoading && name.length > 0,
    });

    const startTrip = (args: {
        countryName: string;
        countryCode: string;
        countryId: string | null;
        cityName: string;
        cityImage: string | null;
        /** Best-guess primary airport for the destination. Used to
         *  pre-fill the arrival airport on the seeded flight. */
        arrivalAirportCode: string | null;
    }) => {
        // Use the catalog UUID when we have it — the itinerary save mutation
        // rejects ids that don't match a real countries row, so id=0 would
        // silently drop the country FK on save.
        //
        // Seed the destination's own `flightInfo.arrivalAirport` with the
        // catalog's best-guess airport so the destination card's built-in
        // Depart/Arrive UI is pre-filled. We ALSO seed a Day-1 "Flight to
        // <city>" Activity below when the user has a home airport set —
        // the two surfaces serve different jobs: `flightInfo` is the
        // destination-level headline (depart/arrive airports + dates),
        // while the Day-1 activity is the timeline entry the user will
        // edit with flight number / times / cost once they book. Both
        // can be filled in independently; the activity is skipped when
        // no home airport is available so we never ship a half-empty
        // segment with a placeholder depart.
        // Default the trip to start TOMORROW. Seeding "today" meant a trip
        // created late in the evening defaulted to a same-day trip, which is
        // rarely what the user wants; they can still pick any date in the
        // wizard's date step.
        const tripStart = tomorrow();
        // Day-1 outbound flight auto-seed. Unlike the country-level seed
        // (which skips for same-country because there's no specific city
        // anchor), city-level seeding goes ahead even for same-country
        // trips — a specific destination city has a known arrival airport,
        // so NYC→SEA still benefits from a pre-populated flight.
        //
        // The home airport (depart side) is the only hard requirement — it's
        // what kept the original guard from shipping a half-empty depart. The
        // destination's arrival airport is best-effort and attached only when
        // resolved: it arrives via a LATER progressive city-details slice (or
        // the `useDestinationAirport` fallback), but the CTA is clickable as
        // soon as the prose slice paints. Requiring the arrival airport here
        // meant a fast click — before that slice landed — seeded NO flight at
        // all ("the default flight sometimes wasn't added"). Seeding on the
        // home airport alone makes the flight appear reliably; the arrival
        // fills in from the data when present, or the user edits it later.
        //
        // We seed ONLY the outbound — the return leg used to be seeded too
        // but read as confusing (a same-day round trip at 00:00). Users
        // add their return flight themselves when they're ready.
        const seededActivities: Activity[] = [];
        if (nearestAirport?.iataCode) {
            seededActivities.push({
                id: 0,
                kind: ACTIVITY_KIND.FLIGHT,
                name: `Flight to ${args.cityName}`,
                flightSegments: [
                    {
                        departAirport: nearestAirport.iataCode,
                        ...(args.arrivalAirportCode
                            ? { arrivalAirport: args.arrivalAirportCode }
                            : {}),
                        departDate: tripStart,
                        departTime: '00:00',
                        arrivalDate: tripStart,
                        arrivalTime: '00:00',
                    },
                ],
            });
        }
        const destinations = [
            {
                // Frontend-local numeric id. The trip reducer's `editDestination`
                // matches destinations by id when computing removeIndexes; a
                // missing id collapses the wrapper's `ignoreId !== dest.id`
                // check (undefined !== anything is always true), which marks
                // the destination being edited for removal — the save would
                // silently delete the row instead of updating it.
                id: 0,
                country: {
                    id: args.countryId ?? 0,
                    name: args.countryName,
                    code: args.countryCode,
                    image: args.cityImage ?? undefined,
                },
                // Anchor to the trip start so the destination matches a date
                // block in the multi-destination itinerary (DateBlock keys
                // multi destinations by `startDate`). The reducer re-anchors
                // this if the user later picks real dates in the wizard.
                startDate: tripStart,
                endDate: tripStart,
                ...(args.arrivalAirportCode
                    ? {
                          flightInfo: {
                              arrivalAirport: args.arrivalAirportCode,
                          },
                      }
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
        // Seed the trip-level image with the city's hero photo so the trip
        // card has a thumbnail (and the save mutation persists it to
        // `itineraries.image`).
        dispatch(
            basicInfo({
                type: tripType,
                destinations,
                startDate: tripStart,
                endDate: tripStart,
                image: args.cityImage ?? undefined,
            })
        );
        navigate(tripType.route, { replace: true });
    };

    if (!name || !country || !code) {
        return (
            <ErrorPage
                pageTitle={t('detail.city.pageTitle')}
                title={t('detail.city.missingTitle')}
                description={t('detail.city.missingDesc')}
                primaryActionLabel={t('detail.common.goHome')}
            />
        );
    }

    if (isLoading) {
        // Progressive load: show the hero photo + city name right away (from
        // the URL params + the fast image endpoint) so the page feels instant,
        // with the AI-enriched body filling in once city-details resolves.
        return (
            <Layout title={`${name}…`}>
                <article className="city-detail city-detail--loading">
                    {/* Same hero+side grid as the loaded page so the hero
                        keeps its size across the transition instead of
                        shrinking from full-width into the grid column. */}
                    <div className="city-detail-top">
                        <PlaceHero
                            name={name}
                            imageUrl={heroPhoto?.imageUrl}
                            photographerName={heroPhoto?.photographerName}
                            photographerUrl={heroPhoto?.photographerUrl}
                            className="city-detail-hero"
                        />
                        <aside className="city-detail-side">
                            <WeatherSection weather={undefined} isError={false} />
                            <CurrencySection currency={undefined} isError={false} />
                            <SafetySection safety={undefined} isError={false} />
                        </aside>
                    </div>
                    <header className="city-detail-header">
                        <h1 className="city-detail-name">{name}</h1>
                        <p className="city-detail-location">{country}</p>
                    </header>
                    {/* Reuse the loaded page's section components, fed by the
                        fast quick-prose call: each shows real text the moment
                        it resolves (or its own skeleton meanwhile) and carries
                        seamlessly into the loaded layout — more readable content
                        up front than a single paragraph. */}
                    <div
                        className="city-detail-quick-main"
                        role="status"
                        aria-live="polite"
                        aria-label={t('detail.common.loadingDetails', {
                            name,
                        })}
                    >
                        <ParagraphSection
                            title={t('detail.common.about', { name })}
                            description={undefined}
                            isError={false}
                        />
                        <ParagraphSection
                            title={t('detail.common.about', {
                                name: country,
                            })}
                            description={undefined}
                            isError={false}
                        />
                    </div>
                </article>
            </Layout>
        );
    }

    if (isError || !city) {
        return (
            <ErrorPage
                pageTitle={t('detail.common.errorPageTitle')}
                title={t('detail.city.errorTitle')}
                description={
                    error instanceof Error
                        ? error.message
                        : t('detail.city.notFound', { name, country })
                }
                secondaryAction={{
                    label: t('detail.common.backToHome'),
                    to: "/",
                }}
                primaryActionLabel={t('detail.common.goHome')}
            />
        );
    }

    // Keep the hero image stable across the loading → loaded transition. On a
    // cold load the loading phase already resolved + displayed a photo via
    // `usePlaceImage`; the full city-details row carries its OWN (separately
    // resolved) Unsplash pick, so switching to it mid-view made the hero
    // visibly swap. Prefer the already-shown image when we have one; on warm
    // loads (no loading phase) `heroPhoto` is undefined and we use the row's.
    const heroImageUrl = heroPhoto?.imageUrl ?? city.imageUrl;
    const usingLoadingHero = Boolean(heroPhoto?.imageUrl);
    const heroPhotographerName = usingLoadingHero
        ? heroPhoto?.photographerName
        : city.photographerName;
    const heroPhotographerUrl = usingLoadingHero
        ? heroPhoto?.photographerUrl
        : city.photographerUrl;
    const placeForGetting = `${city.name}, ${city.country}`;

    // Smart back: use the browser history when the user actually
    // navigated into this page (search, country list, etc.); fall back
    // to home for direct visits (pasted URLs, shared links) where
    // navigate(-1) would otherwise drop them off-app or onto a blank
    // tab state.
    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate("/");
        }
    };

    return (
        <Layout>
            <DetailTour kind="city" />
            <article className="city-detail">
                <div
                    className={classnames("city-detail-toolbar", {
                        "is-stuck": toolbarIsStuck,
                    })}
                >
                    <button
                        type="button"
                        onClick={handleBack}
                        className="city-detail-back-link"
                    >
                        <ArrowBackRoundedIcon fontSize="small" />{' '}
                        {t('detail.common.back')}
                    </button>
                    <div className="city-detail-toolbar-actions">
                        {/* Bookmark + Visited + Share grouped so mobile
                            CSS can lift them onto the hero photo's
                            top-right corner. */}
                        <div className="city-detail-overlay-actions">
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
                            <AddToBucketButton
                                kind="city"
                                name={city.name}
                                context={city.country}
                            />
                            <ShareButton
                                title={city.name}
                                subtitle={city.country}
                                imageUrl={city.imageUrl}
                                description={details.cityHighlight}
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
                                    description: details.cityHighlight ?? "",
                                    image_url: city.imageUrl,
                                }}
                            />
                        </div>
                        <button
                            type="button"
                            className="city-detail-plan-cta"
                            onClick={() =>
                                startTrip({
                                    countryName: city.country,
                                    countryCode: city.countryCode,
                                    countryId: city.countryId,
                                    cityName: city.name,
                                    cityImage: city.imageUrl,
                                    arrivalAirportCode,
                                })
                            }
                        >
                            <FlightTakeoffRoundedIcon className="city-detail-plan-cta-icon" />
                            <span className="city-detail-plan-cta-text">
                                <span className="city-detail-plan-cta-label">
                                    {tripType.id === TRIP_BASIC.MULTIPLE.id
                                        ? t('detail.common.startMultiTrip')
                                        : t('detail.common.startPlanning')}
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
                        imageUrl={heroImageUrl}
                        photographerName={heroPhotographerName}
                        photographerUrl={heroPhotographerUrl}
                        galleryQuery={[city.name, city.country]
                            .filter(Boolean)
                            .join(' ')}
                        className="city-detail-hero"
                    />

                    <header className="city-detail-header">
                        <div className="city-detail-name-row">
                            <h1 className="city-detail-name">{city.name}</h1>
                            <CostBadge level={details.costLevel} />
                        </div>
                        <PlaceMetaLine
                            countryCode={city.countryCode}
                            countryName={city.country}
                        >
                            <span className="place-meta-seg">
                                {city.country} ({city.countryCode})
                            </span>
                            {details.travelBasics?.language && (
                                <span className="place-meta-seg">
                                    <strong>
                                        {t('detail.country.language')}
                                    </strong>
                                    {details.travelBasics.language}
                                </span>
                            )}
                        </PlaceMetaLine>
                        {/* Visited-by-friends chip (self-hides at count 0). */}
                        <div className="city-detail-friends-slot">
                            <FriendsVisitedBadge
                                kind="city"
                                placeKey={`${city.name.trim().toLowerCase().replace(/\s+/g, ' ')}--${city.countryCode.trim().toLowerCase()}`}
                                reviewKey={getPlaceKey(
                                    city.name,
                                    city.name,
                                    city.country,
                                )}
                            />
                        </div>
                        <p className="city-detail-highlight">
                            {details.cityHighlight}
                        </p>
                        {(details.touristRating ?? 0) > 0 && (
                            <div className="city-detail-meta">
                                <Tooltip
                                    title={t('detail.common.overallRating')}
                                    arrow
                                >
                                    <span
                                        className="city-detail-meta-icon"
                                        role="img"
                                        aria-label={t(
                                            'detail.common.overallRating',
                                        )}
                                    >
                                        <PublicRoundedIcon />
                                    </span>
                                </Tooltip>
                                <Stars rating={details.touristRating ?? 0} />
                            </div>
                        )}
                        <ReviewSummary
                            placeName={city.name}
                            placeCity={city.name}
                            placeCountry={city.country}
                            targetId="city-reviews"
                        />
                    </header>

                    <aside className="city-detail-side">
                        <WeatherSection
                            weather={details.weather}
                            coordinates={details.coordinates}
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

                <div className="city-detail-content">
                    <div className="city-detail-content-main">
                        <ParagraphSection
                            title={t('detail.common.about', {
                                name: city.name,
                            })}
                            description={details.longDescription}
                            isError={false}
                        />

                        {/* Getting There moved into the main column so
                            the distance + travel-time + Maps deep-link
                            sit alongside the rest of the logistical
                            info instead of being buried in the aside. */}
                        <GettingThereSection
                            placeName={placeForGetting}
                            coordinates={details.coordinates}
                            isError={false}
                        />

                        <ParagraphSection
                            title={t('detail.common.about', {
                                name: city.country,
                            })}
                            description={details.countryDescription}
                            isError={false}
                        />

                        <CulturalShockCallout
                            text={details.culturalShock}
                            subjectLabel={city.country}
                        />

                        <BeforeYouGoSection items={details.beforeYouGo} />

                        <HiddenGemsSection items={details.hiddenGems} />

                        <NotesSection
                            items={details.notesToKnow}
                            isError={false}
                        />

                        <BudgetSection
                            description={details.budgetDescription}
                            costLevel={details.costLevel}
                            isError={false}
                        />

                        <DetailFactsGrid>
                            <TapWaterSection code={city.countryCode} />
                            <AirQualitySection
                                coordinates={details.coordinates}
                            />
                            <WalkabilitySection
                                walkability={details.walkability}
                            />
                            <WifiSection code={city.countryCode} />
                        </DetailFactsGrid>

                        <EssentialAppsSection code={code} />

                        <LocalFlavorSection
                            flavor={details.localFlavor}
                            isError={false}
                        />
                    </div>

                    <aside className="city-detail-content-side">
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

                        <StayingSafeSection code={city.countryCode} />

                        <CountryFactsSection code={city.countryCode} />

                        <ReligionSection code={city.countryCode} />

                        <EtiquetteSection code={city.countryCode} />

                        <TippingSection code={city.countryCode} />

                        <CurrencyTipsSection code={city.countryCode} />

                        <AvgCostsSection code={city.countryCode} />

                        <GreatForSection code={city.countryCode} />

                        <FestivalsSection code={city.countryCode} />

                        <LatestNewsSection
                            country={city.country}
                            placeName={city.name}
                        />
                    </aside>
                </div>

                <ExperienceHighlights things={details.thingsToDo} />

                <TravelBasicsSection
                    basics={details.travelBasics}
                    isError={false}
                />

                <LodgingSection lodging={details.lodging} isError={false} />

                <div className="city-detail-extras">
                    <TipListSection
                        title={t('detail.common.top5.places', {
                            name: city.name,
                        })}
                        icon={<PlaceRoundedIcon />}
                        items={details.topPlaces}
                    />
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

                <div id="city-reviews">
                    <ReviewSection
                        placeName={city.name}
                        placeCity={city.name}
                        placeCountry={city.country}
                    />
                </div>
            </article>
        </Layout>
    );
};

export default CityDetail;
