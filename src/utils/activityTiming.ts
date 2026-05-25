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
// Loose HH:mm pattern used to gate display formatting. Matches "9:00"
// AND "09:00" and rejects ISO datetime strings ("2026-05-25T09:00:00")
// that occasionally leak in when an upstream code path forgot to call
// `apiTimeToHHmm`. Without this guard, `moment(iso, 'HH:mm')` returns
// an invalid moment and the UI displays the string "Invalid date" in
// the activity time row — looks like a real bug until you realize the
// underlying time IS set, just in the wrong shape.
const LOOSE_HHMM_RE = /^\d{1,2}:\d{2}(:\d{2})?$/;

/** Render an `HH:mm`-shaped time string as a 12h display ("9:00 AM").
 *  Returns empty string for missing / malformed input so the activity
 *  card never surfaces moment's "Invalid date" placeholder. */
export const safeFormatTime = (
    time: string | null | undefined
): string => {
    if (!time) return '';
    const trimmed = String(time).trim();
    if (!trimmed) return '';
    if (!LOOSE_HHMM_RE.test(trimmed)) return '';
    const [hStr, mStr] = trimmed.split(':');
    const h = Number(hStr);
    const m = Number(mStr);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return '';
    if (h < 0 || h > 23 || m < 0 || m > 59) return '';
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const mm = m.toString().padStart(2, '0');
    return `${h12}:${mm} ${period}`;
};

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
