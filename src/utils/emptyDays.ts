/**
 * Empty-day detection used by the "skip empty day blocks once the trip
 * is Confirmed" rule.
 *
 * The trip itinerary is a destination → itinerary-days → activities tree.
 * A "day block" is empty when its `activities.length === 0`. Trip-level
 * data (the destination itself, flights, hotels at the trip level) does
 * NOT count — only the day-by-day timeline.
 *
 * `findEmptyDays(trip)` returns the ISO date strings for every empty day
 * across every destination, in destination then chronological order
 * (the same order they'd render in the timeline). The status-toggle
 * intercept uses the list to populate the confirm modal; the itinerary
 * view + exports use `isDayEmpty` to skip individual day blocks once
 * the trip is Confirmed.
 */
import type { ItineraryDay, TripState } from 'types';

export const isDayEmpty = (day: ItineraryDay | null | undefined): boolean =>
    !day || !day.activities || day.activities.length === 0;

export const findEmptyDays = (trip: TripState | null | undefined): string[] => {
    if (!trip) return [];
    const out: string[] = [];
    for (const dest of trip.destinations ?? []) {
        for (const day of dest.itinerary ?? []) {
            if (!day?.date) continue;
            if (isDayEmpty(day)) out.push(day.date);
        }
    }
    return out;
};
