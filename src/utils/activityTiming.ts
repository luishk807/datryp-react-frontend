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

const HHMM_LOOSE_RE = /^\d{1,2}:\d{2}$/;
const HHMMSS_LOOSE_RE = /^\d{1,2}:\d{2}:\d{2}$/;

const buildDateTime = (date: string, time?: string): Date | null => {
    if (!date) return null;
    // The day key sometimes arrives as "YYYY-MM-DD" and sometimes as
    // a full "YYYY-MM-DDT00:00:00". Trim to the date portion so the
    // concat below never produces a double-T string ("...T00:00:00T15:00:00")
    // which parses to Invalid Date and silently makes the whole
    // past/current/upcoming binning return `null` — the original cause
    // of the "NOW line drops to the bottom" + "past activities never
    // gray out" bugs on /trip-detail.
    const dayKey = date.length > 10 ? date.slice(0, 10) : date;
    const safeTime = time ?? '00:00:00';
    let stamp: string;
    if (HHMM_RE.test(safeTime) || HHMM_LOOSE_RE.test(safeTime)) {
        stamp = `${dayKey}T${safeTime}:00`;
    } else if (HHMMSS_LOOSE_RE.test(safeTime)) {
        stamp = `${dayKey}T${safeTime}`;
    } else if (safeTime.includes('T')) {
        stamp = safeTime; // full ISO already, use as-is
    } else {
        stamp = `${dayKey}T00:00:00`;
    }
    const d = new Date(stamp);
    return Number.isFinite(d.getTime()) ? d : null;
};

export interface TimedActivityInput {
    startTime?: string | null;
    endTime?: string | null;
}

/**
 * Bin an activity relative to `now`:
 *
 * - `past`     — the activity's end time is before `now`, OR (when
 *                no end is set) its start time is more than the
 *                instant-event grace window in the past.
 * - `current`  — `now` falls within [start, end], OR start has just
 *                passed for a single-point event (no end set).
 * - `upcoming` — `now` is before the start time.
 * - `null`     — the activity has no time anchors we could parse;
 *                callers should skip live-state styling.
 *
 * Notes activities (timeless by design) return `null` — the day
 * itself can still be past, but the activity row carries no time
 * anchor to reason about.
 *
 * Single-point events (hotel checkout, flight depart, etc.) carry
 * a start time but no end. Without the grace window below they'd
 * stay "current" forever from the moment they pass — which means
 * yesterday's 10pm checkout still reads as "happening now" the next
 * day. The grace bounds it at 2 hours: after that the event flips
 * to `past` and gets dimmed alongside the rest of the timeline.
 */
const INSTANT_EVENT_GRACE_MS = 2 * 60 * 60 * 1000;

export const getActivityTiming = (
    activity: TimedActivityInput,
    dayDate: string,
    now: Date
): ActivityTimingState => {
    const start = buildDateTime(dayDate, activity.startTime ?? undefined);
    const end = buildDateTime(dayDate, activity.endTime ?? undefined);
    if (!start && !end) return null;
    const nowMs = now.getTime();
    if (end && nowMs > end.getTime()) return 'past';
    // Single-point event: no end, start has passed by more than the
    // grace window → treat as past.
    if (!end && start && nowMs > start.getTime() + INSTANT_EVENT_GRACE_MS) {
        return 'past';
    }
    if (start && nowMs < start.getTime()) return 'upcoming';
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
