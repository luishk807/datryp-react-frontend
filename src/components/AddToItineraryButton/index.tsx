import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import classNames from 'classnames';
import { Snackbar } from '@mui/material';
import PlaylistAddRoundedIcon from '@mui/icons-material/PlaylistAddRounded';
import { useTripDispatch } from 'context/TripContext';
import { useUser } from 'context/UserContext';
import { useItineraryTypes, useTripStatuses } from 'api/hooks/useLookups';
import { useMyItineraries, useSaveItinerary } from 'api/hooks/useItineraries';
import { apiToTripState } from 'utils/itineraryAdapter';
import { resolveInteraryTypeId, tripStateToSaveInput } from 'utils/tripMapper';
import {
    addPlaceToTripState,
    dispatchStartFreshTrip,
    findMatchingDestinationIndex,
    lookupCountry,
} from 'utils/addPlaceToItinerary';
import { TRIP_BASIC } from 'constants';
import type { PlaceRecommendation } from 'types';
import './index.scss';

export interface AddToItineraryButtonProps {
    place: PlaceRecommendation;
}

/**
 * Two distinct behaviors driven by the `id` query param on /place:
 *
 *   - No `id` → "Start a new trip" path. Wipes any in-progress draft and
 *     seeds a fresh single-destination trip centered on this place,
 *     then drops the user on /single to fill in dates / people. URL is
 *     the source of truth — a stale draft from another session is
 *     intentionally discarded.
 *
 *   - `id=<tripId>` → "Add to itinerary" path. Hydrates the saved trip
 *     from the backend, applies the place (matching-country merge or
 *     new-destination append, same rules as the dispatch path), and
 *     persists in one shot via `useSaveItinerary`. On success the user
 *     lands on /trip-detail?id=<tripId> with the new place already on
 *     the timeline — no wizard, no Save Changes button, no edit-mode
 *     flat layout.
 *
 * The previous version showed a modal ("add to current draft or start
 * fresh") which was confusing because the "current draft" might be
 * unrelated to the page the user came from. URL-driven intent removes
 * that ambiguity entirely.
 */
const AddToItineraryButton = ({ place }: AddToItineraryButtonProps) => {
    const { user } = useUser();
    const dispatch = useTripDispatch();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const tripId = searchParams.get('id');
    const [toast, setToast] = useState<string | null>(null);

    const countryQuery = useQuery({
        queryKey: ['add-to-itinerary-country', place.country],
        queryFn: () => lookupCountry(place.country),
        staleTime: 5 * 60 * 1000,
        enabled: Boolean(user),
    });

    const itinerariesQuery = useMyItineraries({
        enabled: Boolean(user && tripId),
    });
    const { data: itineraryTypes = [] } = useItineraryTypes();
    const { data: tripStatuses = [] } = useTripStatuses();
    const saveItinerary = useSaveItinerary();

    if (!user) return null;

    const country = countryQuery.data ?? null;
    const targetTrip = tripId
        ? itinerariesQuery.data?.find((t) => t.id === tripId) ?? null
        : null;
    const isTripMissing = Boolean(tripId) && itinerariesQuery.isSuccess && !targetTrip;
    const isCountryUnresolved = countryQuery.isSuccess && !country;

    const isLoading =
        countryQuery.isLoading ||
        (Boolean(tripId) && itinerariesQuery.isLoading) ||
        saveItinerary.isPending;
    const isDisabled = isLoading || !country || isTripMissing;

    // Surface the silent abort cases as a tooltip on the disabled
    // button so users understand WHY clicking does nothing. Previously
    // both "no country match" and "trip not in your list" rendered
    // the button as a generic disabled chip with no explanation.
    const disabledReason = (() => {
        if (isLoading) return undefined;
        if (isTripMissing) {
            return "This trip isn't in your list — you may not have access, or it was deleted.";
        }
        if (isCountryUnresolved) {
            return `Couldn't resolve "${place.country}" in our country catalog.`;
        }
        return undefined;
    })();

    const startFreshFlow = () => {
        if (!country) return;
        dispatchStartFreshTrip(place, country, dispatch);
        setToast(`Started a new trip with ${place.name}`);
        navigate(TRIP_BASIC.SINGLE.route);
    };

    const addToTripFlow = async () => {
        if (!tripId) {
            setToast('Missing trip id — refresh the page and try again.');
            return;
        }
        if (!country) {
            setToast(
                `Couldn't resolve "${place.country}" in our country catalog.`
            );
            return;
        }
        if (!targetTrip) {
            setToast(
                "This trip isn't in your list — you may not have access."
            );
            return;
        }
        if (itineraryTypes.length === 0) {
            setToast('Trip-type lookup not ready — try again in a moment.');
            return;
        }

        const baseState = apiToTripState(targetTrip);
        const matchingIndex = findMatchingDestinationIndex(
            baseState,
            place.country
        );
        const nextState = addPlaceToTripState(
            baseState,
            place,
            country,
            matchingIndex
        );

        const interaryTypeId = resolveInteraryTypeId(nextState, itineraryTypes);
        if (!interaryTypeId) {
            setToast('Could not resolve trip type — try again shortly.');
            return;
        }

        const currentStatusId =
            typeof nextState.status === 'object' &&
            nextState.status !== null &&
            typeof nextState.status.id === 'string'
                ? nextState.status.id
                : null;

        const input = tripStateToSaveInput(nextState, {
            id: tripId,
            interaryTypeId,
            tripStatusId: currentStatusId,
            // Quiet add: a single place insertion shouldn't trigger
            // the participant fan-out. Bulk edits go through the
            // wizard / edit page where the toggle is exposed.
            notifyParticipants: false,
            activityStatusLookup: new Map(
                tripStatuses.map((s) => [s.name, s.id])
            ),
        });

        try {
            await saveItinerary.mutateAsync(input);
            setToast(`Added ${place.name} to ${targetTrip.name ?? 'your trip'}`);
            navigate(`/trip-detail?id=${tripId}`);
        } catch (err) {
            // Log the full error so the user (or whoever is debugging)
            // can see the underlying GraphQL error in DevTools instead
            // of just a generic toast that auto-dismisses in 2s.
            // eslint-disable-next-line no-console
            console.error('Failed to add place to itinerary', err);
            setToast(
                err instanceof Error
                    ? `Failed to add place: ${err.message}`
                    : 'Failed to add place — see console for details.'
            );
        }
    };

    const handleClick = () => {
        if (isDisabled) return;
        if (tripId) {
            void addToTripFlow();
        } else {
            startFreshFlow();
        }
    };

    const buttonLabel = isLoading
        ? tripId
            ? 'Adding…'
            : 'Loading…'
        : tripId
            ? 'Add to itinerary'
            : 'Start a new trip';

    const ariaLabel = tripId
        ? `Add ${place.name} to your trip`
        : `Start a new trip with ${place.name}`;

    return (
        <>
            <button
                type="button"
                className={classNames('add-itinerary-pill', {
                    'is-disabled': isDisabled,
                })}
                aria-label={ariaLabel}
                disabled={isDisabled}
                title={disabledReason}
                onClick={handleClick}
            >
                <PlaylistAddRoundedIcon className="add-itinerary-icon" />
                <span>{buttonLabel}</span>
            </button>

            <Snackbar
                open={Boolean(toast)}
                onClose={() => setToast(null)}
                // 4.5s so error messages stay readable. The success case
                // navigates away immediately, so duration only matters
                // for failures the user needs time to read.
                autoHideDuration={4500}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                message={toast}
            />
        </>
    );
};

export default AddToItineraryButton;
