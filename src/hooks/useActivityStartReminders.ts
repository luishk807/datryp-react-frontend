/**
 * Client-side activity-start reminder. Fires a one-time browser
 * notification + a state callback when any activity in the supplied
 * list is within `leadMinutes` of its start time. Tracks already-
 * notified activity ids in sessionStorage so a tab refresh doesn't
 * re-fire reminders the user has already dismissed.
 *
 * This is the FOREGROUND counterpart to the (still-unbuilt) backend
 * web-push pipeline. With the app open in a tab, the user gets a
 * timely heads-up. The full "notify every participant whether or not
 * they have the app open" feature needs a backend scheduler +
 * pywebpush + VAPID keys + a service worker — see
 * `docs/push-notifications.md` for the plan.
 */
import { useEffect, useRef } from 'react';
import type { Activity } from 'types';
import { useNow } from './useNow';

const STORAGE_KEY = 'activity-reminders-fired-v1';
const HHMM_RE = /^\d{2}:\d{2}$/;

interface ActivityWithDate {
    activity: Activity;
    /** ISO `YYYY-MM-DD` for the day the activity sits on. */
    dayDate: string;
}

const loadFired = (): Set<string> => {
    if (typeof window === 'undefined') return new Set();
    try {
        const raw = window.sessionStorage.getItem(STORAGE_KEY);
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
        window.sessionStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(Array.from(set))
        );
    } catch {
        /* quota / disabled storage — silently skip */
    }
};

const buildStart = (dayDate: string, time?: string | null): Date | null => {
    if (!dayDate) return null;
    const safe = time ?? '00:00:00';
    const padded = HHMM_RE.test(safe) ? `${safe}:00` : safe;
    const d = new Date(`${dayDate}T${padded}`);
    return Number.isFinite(d.getTime()) ? d : null;
};

export interface UseActivityStartRemindersOptions {
    /** How many minutes before start_time we should fire the reminder.
     *  Default 15 — long enough to leave the apartment, short enough
     *  the user doesn't tune out. */
    leadMinutes?: number;
    /** Optional consumer hook for a toast / snackbar. The hook fires a
     *  native browser Notification too (if granted); call this to also
     *  surface an in-app banner. */
    onReminder?: (activity: Activity, minutesUntil: number) => void;
}

export const useActivityStartReminders = (
    items: ActivityWithDate[],
    options: UseActivityStartRemindersOptions = {}
): void => {
    const { leadMinutes = 15, onReminder } = options;
    // Re-check every 30s. activityTiming uses the same cadence so the
    // two stay in lockstep.
    const now = useNow(30_000);
    // Mutable so we don't trigger a re-render when we add ids.
    const firedRef = useRef<Set<string>>(loadFired());

    useEffect(() => {
        const fired = firedRef.current;
        const windowEnd = now.getTime() + leadMinutes * 60_000;
        for (const { activity, dayDate } of items) {
            const id = String(activity.id);
            if (fired.has(id)) continue;
            const start = buildStart(dayDate, activity.startTime);
            if (!start) continue;
            const startMs = start.getTime();
            const nowMs = now.getTime();
            // Skip already-started activities; the "happening now"
            // stripe handles those. Skip activities further out than
            // leadMinutes.
            if (startMs <= nowMs) continue;
            if (startMs > windowEnd) continue;

            const minutesUntil = Math.max(
                1,
                Math.round((startMs - nowMs) / 60_000)
            );
            fired.add(id);
            persistFired(fired);

            onReminder?.(activity, minutesUntil);

            // Best-effort native notification too. No-op if the user
            // hasn't granted permission yet — we don't prompt here
            // because surprise permission popups are hostile UX. The
            // permission prompt lives behind an explicit user action
            // on the settings page (TODO).
            if (
                typeof window !== 'undefined' &&
                'Notification' in window &&
                Notification.permission === 'granted'
            ) {
                try {
                    new Notification(activity.name || 'Upcoming activity', {
                        body:
                            minutesUntil === 1
                                ? 'Starts in 1 minute'
                                : `Starts in ${minutesUntil} minutes`,
                        tag: `activity-${id}`,
                        icon: '/favicon.ico',
                    });
                } catch {
                    /* Notification constructor can throw on iOS — ignore */
                }
            }
        }
    }, [items, now, leadMinutes, onReminder]);
};
