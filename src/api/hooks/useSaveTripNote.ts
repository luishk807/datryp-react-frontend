/**
 * Mutation that persists a trip's recap note via PUT /me/trip-note/{id}.
 * On success it refreshes the itineraries list so a reload reflects the
 * saved note. Used by the editable note under the title on /trip-detail.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { setTripNote, type TripNote } from 'api/tripNoteApi';

interface SaveTripNoteVars {
    tripId: string;
    note: string | null;
}

export const useSaveTripNote = () => {
    const queryClient = useQueryClient();
    return useMutation<TripNote, Error, SaveTripNoteVars>({
        mutationFn: ({ tripId, note }) => setTripNote(tripId, note),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['myItineraries'] });
        },
    });
};
