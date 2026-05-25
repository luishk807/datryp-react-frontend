/**
 * Activity timing helper. Pairs the day-level ISO date with the
 * activity's `HH:mm[:ss]` start/end times to produce concrete Date
 * objects, then bins the activity relative to "now" into one of
 * `past` / `current` / `upcoming` / `null` (no time set).
 *
 * Lives in utils/ because it's consumed by the Activities timeline
 * component for visual styling AND by the auto-mark-completed
 * effect that flips past-due activities to Completed without a
 * user click.
 */

/** Timing state of an activity relative to a reference clock. */
export type ActivityTimingState = 'past' | 'current' | 'upcoming' | null;

const HHMM_RE = /^\d{2}:\d{2}$/;

const buildDateTime = (date: string, time?: string): Date | null => {
    if (!date) return null;
    const safeTime = time ?? '00:00:00';
    const padded = HHMM_RE.test(safeTime) ? `${safeTime}:00` : safeTime;
    const iso = `${date}T${padded}`;
    const d = new Date(iso);
    return Number.isFinite(d.getTime()) ? d : null;
};

export interface TimedActivityInput {
    startTime?: string | null;
    endTime?: string | null;
}

/**
 * Bin an activity relative to `now`:
 *
 * - `past`     — the activity's end time is before `now` (or its
 *                start time is, when no end is set).
 * - `current`  — `now` falls within [start, end] (or after start
 *                with no end).
 * - `upcoming` — `now` is before the start time.
 * - `null`     — the activity has no start time we could parse;
 *                callers should skip live-state styling.
 *
 * Notes activities (timeless by design) return `null` — the day
 * itself can still be past, but the activity row carries no time
 * anchor to reason about.
 */
export const getActivityTiming = (
    activity: TimedActivityInput,
    dayDate: string,
    now: Date
): ActivityTimingState => {
    const start = buildDateTime(dayDate, activity.startTime ?? undefined);
    const end = buildDateTime(dayDate, activity.endTime ?? undefined);
    if (!start && !end) return null;
    if (end && now.getTime() > end.getTime()) return 'past';
    if (start && now.getTime() < start.getTime()) return 'upcoming';
    return 'current';
};

/** Progress (0..1) through a currently-running activity. Returns null
 *  if not currently running or if any boundary is missing. Used by
 *  the "now" stripe to grow as time elapses. */
export const getActivityProgress = (
    activity: TimedActivityInput,
    dayDate: string,
    now: Date
): number | null => {
    const start = buildDateTime(dayDate, activity.startTime ?? undefined);
    const end = buildDateTime(dayDate, activity.endTime ?? undefined);
    if (!start || !end) return null;
    const total = end.getTime() - start.getTime();
    if (total <= 0) return null;
    const elapsed = now.getTime() - start.getTime();
    if (elapsed < 0) return 0;
    if (elapsed > total) return 1;
    return elapsed / total;
};
