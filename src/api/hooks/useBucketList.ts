import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    addBucketListItem,
    deleteBucketListItem,
    enrichExistingBucketList,
    fetchBucketList,
    generateTripFromBucket,
    type BucketTripGenerationResult,
    type GenerateTripFromBucketInput,
} from 'api/bucketListApi';
import { useUser } from 'context/UserContext';
import type { BucketListItem } from 'types';

export interface GenerateTripFromBucketArgs {
    id: string;
    input?: GenerateTripFromBucketInput;
}

/** Query key for the user's bucket-list (newest first). Stable string
 *  array so other call sites can imperatively invalidate after a sibling
 *  flow (e.g. the future "Build itinerary from item" mutation) creates
 *  related rows. */
export const bucketListKey = ['me', 'bucket-list'] as const;

export const useBucketList = () => {
    const { user } = useUser();
    return useQuery<BucketListItem[]>({
        queryKey: bucketListKey,
        queryFn: fetchBucketList,
        enabled: Boolean(user),
        staleTime: 60 * 1000,
    });
};

export const useAddBucketListItem = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (text: string) => addBucketListItem(text),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: bucketListKey });
        },
    });
};

export const useDeleteBucketListItem = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteBucketListItem(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: bucketListKey });
        },
    });
};

/** POST /me/bucket-list/enrich-existing — Pro-only backfill. Writes the
 *  returned (fully-enriched) list straight into the cache so the cards
 *  re-render with their new titles/tags without a second fetch. */
export const useEnrichExistingBucketList = () => {
    const qc = useQueryClient();
    return useMutation<BucketListItem[], Error, void>({
        mutationFn: () => enrichExistingBucketList(),
        onSuccess: (items) => {
            qc.setQueryData(bucketListKey, items);
        },
    });
};

/** POST /me/bucket-list/{id}/itinerary — kicks off the OpenAI plan and
 *  the trip save. Invalidates the itineraries cache so /trips shows the
 *  fresh row when the user navigates back.
 *
 *  Accepts the legacy bare-string argument (`mutate('item-id')`) and
 *  the new args shape (`mutate({ id, input: { partySize, ... } })`) so
 *  existing call sites don't have to migrate in lockstep. */
export const useGenerateTripFromBucket = () => {
    const qc = useQueryClient();
    return useMutation<
        BucketTripGenerationResult,
        Error,
        string | GenerateTripFromBucketArgs
    >({
        mutationFn: (arg) => {
            if (typeof arg === 'string') {
                return generateTripFromBucket(arg);
            }
            return generateTripFromBucket(arg.id, arg.input);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['myItineraries'] });
        },
    });
};
