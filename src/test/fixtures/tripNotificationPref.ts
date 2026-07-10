import type { TripNotificationPref } from 'api/tripNotificationPrefApi';

/** A member who overrode this trip to notify them on both channels. */
export const tripNotificationPrefFixture: TripNotificationPref = {
    channel: 'both',
};

/** No override — the account-level default applies. */
export const tripNotificationPrefNullFixture: TripNotificationPref = {
    channel: null,
};
