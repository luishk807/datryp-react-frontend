/**
 * Trip-level reminder hook. Sibling to `useActivityStartReminders` —
 * that one fires 15 min before each activity; this one fires:
 *
 *   1. Once when today === trip.startDate ("Your trip starts today!")
 *   2. Once per trip day, after `morningHour` local time, with a
 *      day-summary toast ("Today: 4 activities planned").
 *
 * Both events persist their fired-state to localStorage keyed by
 * trip id, so a refresh / tab close doesn't re-fire them. Browser
 * Notifications fire too when permission is granted; otherwise the
 * in-app toast still surfaces via the `onTripStart` / `onDayStart`
 * callbacks.
 *
 * Hosted on the trip-detail page (see TripDetail.useTripDayReminders).
 * Other surfaces (TripCard, MyTrips list) intentionally don't fire
 * these — the toast would race with whichever page actually has the
 * trip open.
 */
import { useEffect, useRef } from 'react';
import moment from 'moment';
import { useNow } from './useNow';
import type { TripState } from 'types';

const STORAGE_KEY = 'trip-day-reminders-fired-v1';

const loadFired = (): Set<string> => {
    if (typeof window === 'undefined') return new Set();
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return new Set();
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) return new Set(parsed.map(String));
        return new Set();
    } catch {
        return new Set();
    }
};

const persistFired = (set: Set<string>) => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(Array.from(set))
        );
    } catch {
        /* quota / disabled storage — silently skip */
    }
};

const fireNotification = (title: string, body: string) => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    try {
        new Notification(title, { body, icon: '/favicon.ico' });
    } catch {
        /* iOS Notification constructor can throw — silently skip */
    }
};

const countActivitiesForDate = (
    trip: TripState,
    dayDate: string
): number => {
    let total = 0;
    for (const dest of trip.destinations ?? []) {
        for (const day of dest.itinerary ?? []) {
            if (!day.date) continue;
            if (moment(day.date).isSame(moment(dayDate), 'day')) {
                total += (day.activities ?? []).length;
            }
        }
    }
    return total;
};

export interface UseTripDayRemindersOptions {
    /** Hour-of-day (0-23) at which the per-day toast fires. Default 8. */
    morningHour?: number;
    /** Trip-start callback — fired once when today is the trip's
     *  startDate. */
    onTripStart?: (trip: { name: string; id: string }) => void;
    /** Per-day callback — fired once per trip day, after morningHour. */
    onDayStart?: (
        trip: { name: string; id: string },
        dayDate: string,
        meta: { activityCount: number; dayIndex: number; totalDays: number }
    ) => void;
}

export const useTripDayReminders = (
    trip: TripState | null,
    options: UseTripDayRemindersOptions = {}
): void => {
    const { morningHour = 8, onTripStart, onDayStart } = options;
    // 30s cadence keeps us aligned with useActivityStartReminders and
    // useNow's default. Fine-grained enough for "fire when clock turns
    // 8:00am", cheap enough that the background tab won't notice.
    const now = useNow(30_000);
    const firedRef = useRef<Set<string>>(loadFired());

    useEffect(() => {
        if (!trip) return;
        const tripId = trip.apiId;
        if (!tripId) return;
        if (!trip.startDate || !trip.endDate) return;

        const tripName = trip.name?.trim() || 'Your trip';
        const todayMoment = moment(now);
        const startMoment = moment(trip.startDate);
        const endMoment = moment(trip.endDate);
        if (!startMoment.isValid() || !endMoment.isValid()) return;

        // Trip-start: today === startDate, fire once. Skip if today is
        // already past the trip end — joining a long-finished trip
        // shouldn't trigger a celebratory "your trip starts today" toast.
        if (todayMoment.isSame(startMoment, 'day')) {
            const key = `trip-${tripId}-start`;
            if (!firedRef.current.has(key)) {
                firedRef.current.add(key);
                persistFired(firedRef.current);
                onTripStart?.({ name: tripName, id: tripId });
                fireNotification(
                    `${tripName} starts today!`,
                    'Enjoy the trip — we will surface activity reminders as the day unfolds.'
                );
            }
        }

        // Per-day morning toast: fires once per trip day, after the
        // configured morning hour. Skip days outside the trip window.
        if (now.getHours() >= morningHour) {
            const inTrip =
                !todayMoment.isBefore(startMoment, 'day') &&
                !todayMoment.isAfter(endMoment, 'day');
            if (inTrip) {
                const todayIso = todayMoment.format('YYYY-MM-DD');
                const key = `trip-${tripId}-day-${todayIso}`;
                if (!firedRef.current.has(key)) {
                    firedRef.current.add(key);
                    persistFired(firedRef.current);
                    const activityCount = countActivitiesForDate(
                        trip,
                        todayIso
                    );
                    const dayIndex = todayMoment.diff(startMoment, 'days') + 1;
                    const totalDays =
                        endMoment.diff(startMoment, 'days') + 1;
                    onDayStart?.(
                        { name: tripName, id: tripId },
                        todayIso,
                        { activityCount, dayIndex, totalDays }
                    );
                    fireNotification(
                        `${tripName} · Day ${dayIndex} of ${totalDays}`,
                        activityCount === 0
                            ? 'Free day — nothing scheduled.'
                            : activityCount === 1
                              ? '1 activity planned today.'
                              : `${activityCount} activities planned today.`
                    );
                }
            }
        }
    }, [trip, now, morningHour, onTripStart, onDayStart]);
};
