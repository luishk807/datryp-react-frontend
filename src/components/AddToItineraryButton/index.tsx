import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import classNames from 'classnames';
import { Snackbar } from '@mui/material';
import PlaylistAddRoundedIcon from '@mui/icons-material/PlaylistAddRounded';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import {
    useTripDispatch,
    useTripState,
} from 'context/TripContext';
import { useUser } from 'context/UserContext';
import {
    dispatchAddToCurrentTrip,
    dispatchStartFreshTrip,
    findMatchingDestinationIndex,
    lookupCountry,
    tripHasContent,
} from 'utils/addPlaceToItinerary';
import { BUTTON_VARIANT, TRIP_BASIC } from 'constants';
import type { PlaceRecommendation } from 'types';
import './index.scss';

export interface AddToItineraryButtonProps {
    place: PlaceRecommendation;
}

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

    const hasOngoingTrip = tripHasContent(trip);
    const isMultiTrip = trip.type?.id === TRIP_BASIC.MULTIPLE.id;
    const matchingDestinationIndex = useMemo(
        () =>
            hasOngoingTrip
                ? findMatchingDestinationIndex(trip, place.country)
                : -1,
        [hasOngoingTrip, trip, place.country]
    );
    const hasMatchingDestination = matchingDestinationIndex !== -1;

    if (!user) return null;

    const country = countryQuery.data ?? null;
    const isDisabled = countryQuery.isLoading || !country;

    const startFresh = () => {
        if (!country) return;
        dispatchStartFreshTrip(place, country, dispatch);
        setToast(`Started a new trip with ${place.name}`);
        navigate(TRIP_BASIC.SINGLE.route);
    };

    const addToCurrent = () => {
        if (!country) return;
        const { route } = dispatchAddToCurrentTrip(
            place,
            country,
            trip,
            matchingDestinationIndex,
            dispatch
        );
        const target = hasMatchingDestination ? place.name : country.name;
        setToast(`Added ${target} to ${trip.name ?? 'your trip'}`);
        navigate(route);
    };

    const handleClick = () => {
        if (isDisabled) return;
        if (!hasOngoingTrip) {
            startFresh();
            return;
        }
        modalRef.current?.openModel();
    };

    const handleAddToCurrent = () => {
        modalRef.current?.closeModal();
        addToCurrent();
    };

    const handleStartFresh = () => {
        modalRef.current?.closeModal();
        startFresh();
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
