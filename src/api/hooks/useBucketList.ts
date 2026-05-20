import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    addBucketListItem,
    deleteBucketListItem,
    fetchBucketList,
} from 'api/bucketListApi';
import { useUser } from 'context/UserContext';
import type { BucketListItem } from 'types';

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
