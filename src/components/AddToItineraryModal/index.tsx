/**
 * Shared "Add to itinerary" confirmation modal.
 *
 * Used by both `AddToItineraryButton` (place detail pages) and
 * `PlacesYouMightLove` (homepage / empty-trips suggestion cards) when
 * the user has an in-progress trip and we need them to choose between
 * "Add to current trip" and "Start a fresh trip".
 *
 * Cold-start clicks (no trip in progress) skip this entirely — the
 * caller dispatches `startFreshTrip` directly.
 *
 * Imperative open/close via the forwarded ref (`openModel()` /
 * `closeModal()`), matching the rest of the codebase's `ModalButton`
 * convention.
 */
import { forwardRef } from 'react';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import { BUTTON_VARIANT } from 'constants';
import './index.scss';

export interface AddToItineraryModalProps {
    /** The place the user just clicked. Drives the modal's headline and
     *  the wording on the "Add"/"Start fresh" buttons. */
    place: { name: string; country: string };
    /** The current draft trip's display name. Falls back to "your
     *  current trip" when unset. */
    tripName?: string | null;
    /** Name of the destination already in the draft that matches the
     *  place's country, when one exists. Lets the modal say "added under
     *  X" instead of "added as a new stop". */
    matchingDestinationCountryName?: string | null;
    /** True when the draft is already a multi-destination trip. Drives
     *  whether the "new stop" copy mentions a single→multi promotion. */
    isMultiTrip?: boolean;
    onAddToCurrent: () => void;
    onStartFresh: () => void;
}

const AddToItineraryModal = forwardRef<
    ModalButtonHandle,
    AddToItineraryModalProps
>(
    (
        {
            place,
            tripName,
            matchingDestinationCountryName,
            isMultiTrip = false,
            onAddToCurrent,
            onStartFresh,
        },
        ref
    ) => {
        const displayTripName = tripName?.trim() || 'your current trip';
        const hasMatching = Boolean(matchingDestinationCountryName);

        const currentTripBlurb = hasMatching
            ? `${place.name} will be added under ${matchingDestinationCountryName} in ${displayTripName}.`
            : isMultiTrip
                ? `${place.country} will be added to ${displayTripName} as a new stop.`
                : `${place.country} will be added to ${displayTripName} as a new stop. Your trip becomes multi-destination.`;

        return (
            <ModalButton ref={ref} title="Add to your itinerary">
                <div className="add-itinerary-modal">
                    <p className="add-itinerary-modal-lead">
                        You already have <strong>{displayTripName}</strong>{' '}
                        in progress. What would you like to do with{' '}
                        <strong>{place.name}</strong>?
                    </p>

                    <div className="add-itinerary-option">
                        <ButtonCustom
                            type={BUTTON_VARIANT.STANDARD}
                            capitalizeType="none"
                            onClick={onAddToCurrent}
                            label={
                                hasMatching
                                    ? `Add to ${displayTripName}`
                                    : `Add ${place.country} to ${displayTripName}`
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
                            onClick={onStartFresh}
                            label={`Start a fresh trip to ${place.country}`}
                        />
                        <p className="add-itinerary-option-hint">
                            Replaces your current draft with a new
                            single-destination trip.
                        </p>
                    </div>
                </div>
            </ModalButton>
        );
    }
);

AddToItineraryModal.displayName = 'AddToItineraryModal';

export default AddToItineraryModal;
