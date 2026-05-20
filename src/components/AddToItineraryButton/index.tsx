import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { gql } from 'graphql-request';
import classNames from 'classnames';
import { Snackbar } from '@mui/material';
import PlaylistAddRoundedIcon from '@mui/icons-material/PlaylistAddRounded';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import { pythonGqlClient } from 'api/pythonGqlClient';
import {
    addDestination,
    addPlace,
    basicInfo,
    resetTrip,
    useTripDispatch,
    useTripState,
} from 'context/TripContext';
import { useUser } from 'context/UserContext';
import { BUTTON_VARIANT, TRIP_BASIC } from 'constants';
import { now } from 'utils';
import type {
    Activity,
    Country,
    Destination,
    PlaceRecommendation,
} from 'types';
import './index.scss';

export interface AddToItineraryButtonProps {
    place: PlaceRecommendation;
}

const COUNTRY_LOOKUP_QUERY = gql`
    query AddToItineraryCountry($query: String!) {
        countries(query: $query, limit: 5) {
            id
            name
            code
            local
            image
        }
    }
`;

interface CountryLookupResult {
    countries: Array<{
        id: string;
        name: string;
        code: string;
        local: string | null;
        image: string | null;
    }>;
}

const lookupCountry = async (name: string): Promise<Country | null> => {
    const result = await pythonGqlClient.request<CountryLookupResult>(
        COUNTRY_LOOKUP_QUERY,
        { query: name }
    );
    const exact = result.countries.find(
        (c) => c.name.toLowerCase() === name.toLowerCase()
    );
    const match = exact ?? result.countries[0];
    if (!match) return null;
    return {
        id: match.id,
        name: match.name,
        code: match.code,
        local: match.local ?? undefined,
        image: match.image ?? undefined,
    };
};

const placeToActivity = (place: PlaceRecommendation): Omit<Activity, 'id'> => ({
    name: place.name,
    location: `${place.city}, ${place.country}`,
    note: place.description,
    ...(place.imageUrl
        ? { image: { url: place.imageUrl, name: place.name } }
        : {}),
});

const earliestDateOf = (dest: Destination, tripStart?: string): string => {
    const dayDates = (dest.itinerary ?? [])
        .map((d) => d.date)
        .filter((d): d is string => Boolean(d));
    if (dayDates.length > 0) {
        // YYYY-MM-DD sorts lexicographically.
        return [...dayDates].sort()[0];
    }
    return dest.startDate ?? tripStart ?? now();
};

const AddToItineraryButton = ({ place }: AddToItineraryButtonProps) => {
    const { user } = useUser();
    const trip = useTripState();
    const dispatch = useTripDispatch();
    const navigate = useNavigate();
    const modalRef = useRef<ModalButtonHandle>(null);
    const [toast, setToast] = useState<string | null>(null);

    const countryQuery = useQuery({
        queryKey: ['add-to-itinerary-country', place.country],
        queryFn: () => lookupCountry(place.country),
        staleTime: 5 * 60 * 1000,
        enabled: Boolean(user),
    });

    const hasOngoingTrip =
        (trip.destinations?.length ?? 0) > 0 || Boolean(trip.type);
    const isMultiTrip = trip.type?.id === TRIP_BASIC.MULTIPLE.id;

    const matchingDestinationIndex = useMemo(() => {
        if (!hasOngoingTrip) return -1;
        const target = place.country.toLowerCase();
        return trip.destinations.findIndex(
            (d) => d.country?.name?.toLowerCase() === target
        );
    }, [hasOngoingTrip, trip.destinations, place.country]);

    const hasMatchingDestination = matchingDestinationIndex !== -1;

    if (!user) return null;

    const country = countryQuery.data ?? null;
    const isDisabled = countryQuery.isLoading || !country;

    const startFreshTrip = () => {
        if (!country) return;
        const today = now();
        dispatch(resetTrip());
        dispatch(
            basicInfo({
                type: TRIP_BASIC.SINGLE,
                name: `Trip to ${country.name}`,
                destinations: [{ country }] as Destination[],
                startDate: today,
                endDate: today,
            })
        );
        dispatch(
            addPlace({
                value: placeToActivity(place),
                index: 0,
                date: today,
                destinationIndx: 0,
            })
        );
        setToast(`Started a new trip with ${place.name}`);
        navigate(TRIP_BASIC.SINGLE.route);
    };

    const addToCurrentTrip = () => {
        if (!country) return;

        if (hasMatchingDestination) {
            // Single-same-country (or multi-same-country) → add as activity
            // to the destination's earliest existing day.
            const dest = trip.destinations[matchingDestinationIndex];
            const date = earliestDateOf(dest, trip.startDate);
            dispatch(
                addPlace({
                    value: placeToActivity(place),
                    index: 0,
                    date,
                    destinationIndx: matchingDestinationIndex,
                })
            );
            const route = trip.type?.route ?? TRIP_BASIC.SINGLE.route;
            setToast(`Added ${place.name} to ${trip.name ?? 'your trip'}`);
            navigate(route);
            return;
        }

        // No matching destination — append a new one. If currently single,
        // promote to multi so the type reflects reality.
        if (!isMultiTrip) {
            dispatch(basicInfo({ type: TRIP_BASIC.MULTIPLE }));
        }

        const newDestinationIndex = trip.destinations.length;
        dispatch(
            addDestination({
                value: { country },
                startDate: trip.startDate,
                endDate: trip.endDate,
            })
        );
        dispatch(
            addPlace({
                value: placeToActivity(place),
                index: 0,
                date: trip.startDate ?? now(),
                destinationIndx: newDestinationIndex,
            })
        );
        setToast(`Added ${country.name} to ${trip.name ?? 'your trip'}`);
        navigate(TRIP_BASIC.MULTIPLE.route);
    };

    const handleClick = () => {
        if (isDisabled) return;
        if (!hasOngoingTrip) {
            startFreshTrip();
            return;
        }
        modalRef.current?.openModel();
    };

    const handleAddToCurrent = () => {
        modalRef.current?.closeModal();
        addToCurrentTrip();
    };

    const handleStartFresh = () => {
        modalRef.current?.closeModal();
        startFreshTrip();
    };

    const tripLabel = trip.name?.trim() || 'your current trip';
    const currentTripBlurb = hasMatchingDestination
        ? `${place.name} will be added under ${trip.destinations[matchingDestinationIndex]?.country.name} in ${tripLabel}.`
        : isMultiTrip
            ? `${place.country} will be added to ${tripLabel} as a new stop.`
            : `${place.country} will be added to ${tripLabel} as a new stop. Your trip becomes multi-destination.`;

    return (
        <>
            <button
                type="button"
                className={classNames('add-itinerary-pill', {
                    'is-disabled': isDisabled,
                })}
                aria-label={`Add ${place.name} to itinerary`}
                disabled={isDisabled}
                onClick={handleClick}
            >
                <PlaylistAddRoundedIcon className="add-itinerary-icon" />
                <span>
                    {countryQuery.isLoading ? 'Loading…' : 'Add to itinerary'}
                </span>
            </button>

            <ModalButton ref={modalRef} title="Add to your itinerary">
                <div className="add-itinerary-modal">
                    <p className="add-itinerary-modal-lead">
                        You already have <strong>{tripLabel}</strong> in
                        progress. What would you like to do with{' '}
                        <strong>{place.name}</strong>?
                    </p>

                    <div className="add-itinerary-option">
                        <ButtonCustom
                            type={BUTTON_VARIANT.STANDARD}
                            capitalizeType="none"
                            onClick={handleAddToCurrent}
                            label={
                                hasMatchingDestination
                                    ? `Add to ${tripLabel}`
                                    : `Add ${place.country} to ${tripLabel}`
                            }
                        />
                        <p className="add-itinerary-option-hint">
                            {currentTripBlurb}
                        </p>
                    </div>

                    <div className="add-itinerary-option">
                        <ButtonCustom
                            type={BUTTON_VARIANT.LINE}
                            capitalizeType="none"
                            onClick={handleStartFresh}
                            label={`Start a fresh trip to ${place.country}`}
                        />
                        <p className="add-itinerary-option-hint">
                            Replaces your current draft with a new single-destination trip.
                        </p>
                    </div>
                </div>
            </ModalButton>

            <Snackbar
                open={Boolean(toast)}
                onClose={() => setToast(null)}
                autoHideDuration={2200}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                message={toast}
            />
        </>
    );
};

export default AddToItineraryButton;
