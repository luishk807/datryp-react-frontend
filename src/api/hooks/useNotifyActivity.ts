import { useMutation } from '@tanstack/react-query';
import {
    notifyActivityParticipants,
    type NotifyActivityResult,
} from 'api/tripAlertsApi';

interface NotifyActivityVars {
    tripId: string;
    activityId: string;
    message?: string;
    /** When set, only these backend user UUIDs are alerted; omit to notify
     *  every other member (the default fan-out). */
    recipientIds?: string[];
}

/**
 * Fire-and-summarize wrapper around `POST /trips/:id/activities/:id/notify`.
 * No cache to invalidate — the call has no read-side effect on the client;
 * it just hands the reach summary back so the caller can toast it.
 */
export const useNotifyActivity = () =>
    useMutation<NotifyActivityResult, Error, NotifyActivityVars>({
        mutationFn: ({ tripId, activityId, message, recipientIds }) =>
            notifyActivityParticipants(
                tripId,
                activityId,
                message,
                recipientIds
            ),
    });
