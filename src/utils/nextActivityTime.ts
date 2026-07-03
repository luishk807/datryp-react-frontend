import type { Activity } from 'types';
import { ACTIVITY_KIND } from 'constants';

/**
 * Suggests the default start/end time for a NEW activity added to a day that
 * already holds `activities`, so the user isn't dropped at the current
 * wall-clock time on top of everything they've already planned.
 *
 * Rule (chosen with the user): take the LATEST end time on the day and round
 * UP to the next whole hour — i.e. floor-to-hour + 1h, so a 3:00 PM end
 * suggests 4:00 PM, 10:45 → 11:00, 11:24 → 12:00. The new activity gets a
 * 1-hour slot. An empty (or fully timeless) day starts at 9:00 AM rather than
 * "now". All times are same-day "HH:mm" strings.
 */

const HHMM = /^(\d{1,2}):(\d{2})$/;

const DEFAULT_START_MIN = 9 * 60; // 9:00 AM for the first activity of a day
const LAST_START_MIN = 23 * 60; // never roll a suggestion past 23:00
const DAY_LAST_MIN = 23 * 60 + 59; // 23:59 hard cap for the end

const toMinutes = (value?: string | null): number | null => {
    if (!value) return null;
    const match = HHMM.exec(value.trim());
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
};

const toHHMM = (mins: number): string => {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

/** Latest meaningful time an activity occupies, in minutes since midnight.
 *  Flights use their last segment's arrival (else first depart); notes are
 *  timeless; everything else prefers `endTime`, falling back to `startTime`. */
const endMinutesOf = (activity: Activity): number | null => {
    if (activity.kind === ACTIVITY_KIND.NOTE) return null;
    if (activity.kind === ACTIVITY_KIND.FLIGHT) {
        const segments = activity.flightSegments ?? [];
        const last = segments[segments.length - 1];
        return toMinutes(last?.arrivalTime) ?? toMinutes(segments[0]?.departTime);
    }
    return toMinutes(activity.endTime) ?? toMinutes(activity.startTime);
};

export const nextActivityTime = (
    activities: Activity[] | null | undefined,
): { startTime: string; endTime: string } => {
    let latest: number | null = null;
    for (const activity of activities ?? []) {
        const end = endMinutesOf(activity);
        if (end !== null && (latest === null || end > latest)) latest = end;
    }

    let startMin: number;
    if (latest === null) {
        startMin = DEFAULT_START_MIN;
    } else {
        // Floor to the hour then add one → the next whole hour strictly after
        // the last activity (so an on-the-hour 3:00 end suggests 4:00).
        startMin = Math.min((Math.floor(latest / 60) + 1) * 60, LAST_START_MIN);
    }

    const endMin = Math.min(startMin + 60, DAY_LAST_MIN);
    return { startTime: toHHMM(startMin), endTime: toHHMM(endMin) };
};
