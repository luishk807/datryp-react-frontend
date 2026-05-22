/**
 * "Places you might love" — personalized homepage section.
 *
 * Fetches `/me/place-suggestions` (OpenAI-powered, per-user weekly cache
 * on the backend) and renders 6 destination cards tied to the user's
 * onboarding preferences.
 *
 * Card click semantics (the bit that makes this useful):
 *   - Resolves the place's country against the canonical catalog.
 *   - Cold start (no draft trip): seeds a fresh single-destination trip
 *     with the place as activity 1. Both the trip-level image (so the
 *     /trips card thumbnail saves) and the activity image are populated.
 *   - In-progress trip: opens the section-level conflict modal letting
 *     the user pick "add to current" vs. "start fresh", same UX as
 *     `AddToItineraryButton`.
 *
 * Two render modes:
 *   - "home" (default): reuses the shared `PlaceCard` and the same
 *     3×2 responsive grid as `TopPlaces`.
 *   - "empty-trips": compact 4-card layout used in the empty /trips
 *     state.
 *
 * Hidden entirely for signed-out visitors (the query is gated by
 * `useUser`).
 */
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import classnames from 'classnames';
import { Snackbar } from '@mui/material';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import PlaceCard from 'components/common/PlaceCard';
import type { PlaceSuggestion } from 'api/placeSuggestionsApi';
import { usePlaceSuggestions } from 'api/hooks/usePlaceSuggestions';
import { useUser } from 'context/UserContext';
import {
    useTripDispatch,
    useTripState,
} from 'context/TripContext';
import {
    dispatchAddToCurrentTrip,
    dispatchStartFreshTrip,
    findMatchingDestinationIndex,
    lookupCountry,
    tripHasContent,
    type AddablePlace,
} from 'utils/addPlaceToItinerary';
import { BUTTON_VARIANT, NO_IMAGE, TRIP_BASIC } from 'constants';
import type { Country } from 'types';
import './index.scss';

export type PlacesYouMightLoveVariant = 'home' | 'empty-trips';

export interface PlacesYouMightLoveProps {
    variant?: PlacesYouMightLoveVariant;
    title?: string;
    subtitle?: string;
}

const DEFAULTS: Record<
    PlacesYouMightLoveVariant,
    { title: string; subtitle: string }
> = {
    home: {
        title: 'Places you might love',
        subtitle: 'Picked for you',
    },
    'empty-trips': {
        title: 'No trips yet — try one of these',
        subtitle:
            "Tap any card to start planning. We picked these based on what you told us during signup.",
    },
};

const toAddable = (place: PlaceSuggestion): AddablePlace => ({
    name: place.name,
    // PYML's `name` is the city name — reuse it as `city` for the
    // activity location string.
    city: place.name,
    country: place.country,
    description: place.why,
    imageUrl: place.imageUrl,
});

interface PendingAdd {
    place: PlaceSuggestion;
    country: Country;
    matchingDestinationIndex: number;
}

const PlacesYouMightLove = ({
    variant = 'home',
    title,
    subtitle,
}: PlacesYouMightLoveProps) => {
    const { user } = useUser();
    const navigate = useNavigate();
    const trip = useTripState();
    const dispatch = useTripDispatch();
    const { data, isLoading, isError } = usePlaceSuggestions();
    const modalRef = useRef<ModalButtonHandle>(null);
    const [toast, setToast] = useState<string | null>(null);
    const [resolving, setResolving] = useState<string | null>(null);
    const [pending, setPending] = useState<PendingAdd | null>(null);

    if (!user) return null;

    const headerTitle = title ?? DEFAULTS[variant].title;
    const headerSubtitle = subtitle ?? DEFAULTS[variant].subtitle;

    const cardKey = (place: PlaceSuggestion) =>
        `${place.name}--${place.countryCode}`;

    const handleCardClick = async (place: PlaceSuggestion) => {
        const key = cardKey(place);
        // Don't double-fire while the country lookup is in flight on
        // this card. Other cards stay clickable.
        if (resolving === key) return;
        setResolving(key);
        try {
            const country = await lookupCountry(place.country);
            if (!country) {
                setToast(
                    `Couldn't match ${place.country} in our country catalog.`
                );
                return;
            }
            const addable = toAddable(place);
            const matchingDestinationIndex = findMatchingDestinationIndex(
                trip,
                place.country
            );
            const onGoingTrip = tripHasContent(trip);

            if (!onGoingTrip) {
                dispatchStartFreshTrip(addable, country, dispatch);
                setToast(`Started a new trip with ${place.name}`);
                navigate(TRIP_BASIC.SINGLE.route);
                return;
            }

            // Trip in progress — let the user pick.
            setPending({ place, country, matchingDestinationIndex });
            modalRef.current?.openModel();
        } finally {
            setResolving(null);
        }
    };

    const closePendingModal = () => {
        modalRef.current?.closeModal();
        setPending(null);
    };

    const handleAddToCurrent = () => {
        if (!pending) return;
        const { place, country, matchingDestinationIndex } = pending;
        const { route } = dispatchAddToCurrentTrip(
            toAddable(place),
            country,
            trip,
            matchingDestinationIndex,
            dispatch
        );
        const target = matchingDestinationIndex !== -1 ? place.name : country.name;
        setToast(`Added ${target} to ${trip.name ?? 'your trip'}`);
        closePendingModal();
        navigate(route);
    };

    const handleStartFresh = () => {
        if (!pending) return;
        const { place, country } = pending;
        dispatchStartFreshTrip(toAddable(place), country, dispatch);
        setToast(`Started a new trip with ${place.name}`);
        closePendingModal();
        navigate(TRIP_BASIC.SINGLE.route);
    };

    if (isLoading) {
        return (
            <section
                className={classnames('places-you-might-love', `is-${variant}`)}
            >
                <div className="pyml-header">
                    <h2 className="pyml-title">{headerTitle}</h2>
                    {headerSubtitle && (
                        <span className="pyml-subtitle">{headerSubtitle}</span>
                    )}
                </div>
                <p className="pyml-status">
                    Asking our AI for picks just for you…
                </p>
            </section>
        );
    }

    // Suppress the whole section on a backend failure — empty state is
    // friendlier than an error message in the homepage flow.
    if (isError || !data || data.length === 0) return null;

    // Empty-trips shows a tighter 4-card list; homepage uses all 6.
    const visible = variant === 'empty-trips' ? data.slice(0, 4) : data;

    const tripLabel = trip.name?.trim() || 'your current trip';
    const isMultiTrip = trip.type?.id === TRIP_BASIC.MULTIPLE.id;
    const currentBlurb = pending
        ? pending.matchingDestinationIndex !== -1
            ? `${pending.place.name} will be added under ${trip.destinations[pending.matchingDestinationIndex]?.country.name} in ${tripLabel}.`
            : isMultiTrip
                ? `${pending.place.country} will be added to ${tripLabel} as a new stop.`
                : `${pending.place.country} will be added to ${tripLabel} as a new stop. Your trip becomes multi-destination.`
        : '';

    return (
        <section className={classnames('places-you-might-love', `is-${variant}`)}>
            <div className="pyml-header">
                <h2 className="pyml-title">{headerTitle}</h2>
                {headerSubtitle && (
                    <span className="pyml-subtitle">{headerSubtitle}</span>
                )}
            </div>

            {variant === 'home' ? (
                <div className="pyml-grid-home">
                    {visible.map((place) => (
                        <PlaceCard
                            key={cardKey(place)}
                            place={{
                                id: cardKey(place),
                                name: place.name,
                                country: place.country,
                                image: place.imageUrl ?? NO_IMAGE,
                                tagline: place.why,
                                photographerName: place.photographerName,
                                photographerUrl: place.photographerUrl,
                            }}
                            onClick={() => void handleCardClick(place)}
                        />
                    ))}
                </div>
            ) : (
                <ul className="pyml-grid">
                    {visible.map((place) => (
                        <li key={cardKey(place)}>
                            <button
                                type="button"
                                className="pyml-card"
                                onClick={() => void handleCardClick(place)}
                                aria-label={`Add ${place.name}, ${place.country} to itinerary`}
                                disabled={resolving === cardKey(place)}
                            >
                                <img
                                    src={place.imageUrl ?? NO_IMAGE}
                                    alt=""
                                    loading="lazy"
                                    className="pyml-card-img"
                                />
                                <div className="pyml-card-body">
                                    <span className="pyml-card-name">
                                        {place.name}
                                    </span>
                                    <span className="pyml-card-country">
                                        {place.country}
                                    </span>
                                    <p className="pyml-card-why">{place.why}</p>
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <ModalButton ref={modalRef} title="Add to your itinerary">
                {pending && (
                    <div className="add-itinerary-modal">
                        <p className="add-itinerary-modal-lead">
                            You already have <strong>{tripLabel}</strong> in
                            progress. What would you like to do with{' '}
                            <strong>{pending.place.name}</strong>?
                        </p>

                        <div className="add-itinerary-option">
                            <ButtonCustom
                                type={BUTTON_VARIANT.STANDARD}
                                capitalizeType="none"
                                onClick={handleAddToCurrent}
                                label={
                                    pending.matchingDestinationIndex !== -1
                                        ? `Add to ${tripLabel}`
                                        : `Add ${pending.place.country} to ${tripLabel}`
                                }
                            />
                            <p className="add-itinerary-option-hint">
                                {currentBlurb}
                            </p>
                        </div>

                        <div className="add-itinerary-option">
                            <ButtonCustom
                                type={BUTTON_VARIANT.LINE}
                                capitalizeType="none"
                                onClick={handleStartFresh}
                                label={`Start a fresh trip to ${pending.place.country}`}
                            />
                            <p className="add-itinerary-option-hint">
                                Replaces your current draft with a new single-destination trip.
                            </p>
                        </div>
                    </div>
                )}
            </ModalButton>

            <Snackbar
                open={Boolean(toast)}
                onClose={() => setToast(null)}
                autoHideDuration={2200}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                message={toast}
            />
        </section>
    );
};

export default PlacesYouMightLove;
