import type { NOTIFICATION_KIND } from 'constants';

export type NotificationKind =
    (typeof NOTIFICATION_KIND)[keyof typeof NOTIFICATION_KIND];

/** Denormalized payload set by the backend when a notification is fanned
 *  out. Carries everything the inbox UI needs to render a row without a
 *  follow-up join — so a trip that was later deleted or an actor whose
 *  account is gone still surfaces sensibly. */
export interface NotificationPayload {
    trip_name?: string;
    trip_url?: string;
    actor_name?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    /** For `trip_status_changed` / `trip_completed` / `trip_cancelled`. */
    new_status?: string | null;
}

export interface ApiNotification {
    id: string;
    kind: string;
    tripId: string | null;
    actorUserId: string | null;
    payload: NotificationPayload;
    readAt: string | null;
    createdAt: string;
}
