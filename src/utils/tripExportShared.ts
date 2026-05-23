/**
 * Shared helpers for trip export pipelines (Excel + PDF).
 *
 * Both `exportTripExcel.ts` and `exportTripPdf.ts` need to walk the same
 * trip state and pull the same shape of itinerary / payer / activity
 * data. Keeping the extraction logic here means a fix to e.g. flight
 * naming applies to both exports for free.
 */
import moment from 'moment';

import { ACTIVITY_KIND } from 'constants';
import type { Activity, BudgetItem, TripState } from 'types';

export const safeFilename = (name: string | undefined): string =>
    (name && name.trim() ? name : 'trip')
        .replace(/[^a-z0-9-_]+/gi, '-')
        .replace(/-+/g, '-')
        .toLowerCase();

export const collapseWs = (s: string | undefined | null): string =>
    (s ?? '').replace(/\s+/g, ' ').trim();

export const joinNames = (
    entries?: { label?: string; name?: string }[]
): string =>
    (entries ?? [])
        .map((e) => e.label ?? e.name ?? '')
        .filter(Boolean)
        .join(', ');

/** Format a single time field. Activity times can arrive in three
 *  shapes depending on where the data came from:
 *    - `"HH:mm"` — fresh local input from the AddPlaceBtn modal
 *    - `"HH:mm:ss"` — same, with seconds attached
 *    - full ISO datetime (`"2026-05-23T13:30:00"`) — when read back
 *      from the API after a save round-trip
 *  All three normalize to a clock string like `"1:30pm"` matching the
 *  PDF/Excel mockup. Unparseable input falls through as-is so we
 *  never silently lose data. */
const formatTimeOne = (raw: string | undefined): string => {
    if (!raw) return '';
    const cleaned = collapseWs(raw);
    if (!cleaned) return '';
    const parsed = moment(
        cleaned,
        ['HH:mm', 'HH:mm:ss', moment.ISO_8601],
        false
    );
    if (!parsed.isValid()) return cleaned;
    // "1:30pm" — lowercase am/pm, no space between time and period.
    return parsed.format('h:mma');
};

export const formatTimeRange = (
    start: string | undefined,
    end: string | undefined
): string => {
    const s = formatTimeOne(start);
    const e = formatTimeOne(end);
    if (s && e) return `${s} - ${e}`;
    return s || e || '';
};

export const formatDate = (raw?: string | null, fmt = 'MM/DD/YYYY'): string => {
    if (!raw) return '';
    const m = moment(raw);
    return m.isValid() ? m.format(fmt) : raw;
};

export const formatDayBanner = (
    dateStr: string,
    dayNumber: number,
    destinationName: string
): string => {
    const m = moment(dateStr);
    const prettyDate = m.isValid() ? m.format('ddd MMM D') : dateStr;
    const dayLabel = `Day ${dayNumber}`;
    return destinationName
        ? `${prettyDate} - ${dayLabel}: ${destinationName}`
        : `${prettyDate} - ${dayLabel}`;
};

/** "EWR → KEF → LHR" for multi-segment flights, blank for non-flights. */
export const flightRouteOf = (a: Activity): string => {
    const segs = a.flightSegments ?? [];
    if (!segs.length) return '';
    const chain = [
        segs[0]?.departAirport ?? '',
        ...segs.map((s) => s.arrivalAirport ?? ''),
    ];
    return chain.filter(Boolean).join(' -> ');
};

export const flightNumbersOf = (a: Activity): string =>
    (a.flightSegments ?? [])
        .map((s) => s.flightNumber ?? '')
        .filter(Boolean)
        .join(' / ');

export const activityDisplayName = (a: Activity): string =>
    collapseWs(a.name) || collapseWs(a.place) || '(untitled)';

export const activityLocation = (a: Activity): string => {
    if (a.kind === ACTIVITY_KIND.FLIGHT) {
        const route = flightRouteOf(a);
        const numbers = flightNumbersOf(a);
        return [route, numbers].filter(Boolean).join('  ·  ');
    }
    return collapseWs(a.location);
};

export interface PayerSummary {
    name: string;
    total: number;
}

export interface PayerTotals {
    grandTotal: number;
    perPayer: PayerSummary[];
}

export const computePayerTotals = (trip: TripState): PayerTotals => {
    const totals = new Map<string, number>();
    let grandTotal = 0;
    for (const dest of trip.destinations ?? []) {
        for (const day of dest.itinerary ?? []) {
            for (const activity of day.activities ?? []) {
                for (const b of activity.budget ?? []) {
                    const name = b.user?.label ?? b.user?.name ?? '(unknown)';
                    const amt =
                        typeof b.budget === 'number'
                            ? b.budget
                            : Number(b.budget) || 0;
                    totals.set(name, (totals.get(name) ?? 0) + amt);
                    grandTotal += amt;
                }
            }
        }
    }
    const perPayer = Array.from(totals.entries())
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total);
    return { grandTotal, perPayer };
};

/** Sum of `activity.cost` (per-row cost, separate from the per-payer
 *  budget split). Used by the PDF expense report's first table. */
export const activityCostOf = (a: Activity): number => {
    const raw = a.cost;
    if (typeof raw === 'number') return raw;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
};

/** Inclusive `budget` field on a TripState — number, numeric string, or
 *  undefined — normalized to a finite number (0 when missing/garbage). */
export const tripBudgetTotal = (trip: TripState): number => {
    const raw = trip.budget;
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
};

export const formatCurrency = (amount: number): string =>
    `$${amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

/** Walk every activity in the trip, yielding rows of (date, activity,
 *  participants, budgetItems, costSubtotal). The PDF generator's
 *  itinerary table and expense report both iterate this shape. */
export interface ItineraryRow {
    date: string;
    dateIso: string;
    activity: Activity;
    participants: string[];
    budgetItems: BudgetItem[];
    /** Sum of `budgetItems[].budget`; equals `activity.cost` when no
     *  per-payer split is present. Used as the line total in the
     *  itinerary's Budget column. */
    rowTotal: number;
}

export const walkItinerary = (trip: TripState): ItineraryRow[] => {
    const rows: ItineraryRow[] = [];
    for (const dest of trip.destinations ?? []) {
        for (const day of dest.itinerary ?? []) {
            for (const activity of day.activities ?? []) {
                const budgetItems = (activity.budget ?? []) as BudgetItem[];
                // The data model doesn't track per-activity participants
                // as a separate field — they're implicit via the budget
                // split. Dedupe by displayable name so a single payer
                // who appears twice in the split shows up once in the
                // "Participants" list.
                const participantSet = new Set<string>();
                for (const b of budgetItems) {
                    const name = b.user?.label ?? b.user?.name ?? '';
                    if (name) participantSet.add(name);
                }
                const participants = Array.from(participantSet);
                const rowTotal =
                    budgetItems.length > 0
                        ? budgetItems.reduce(
                              (acc, b) =>
                                  acc +
                                  (typeof b.budget === 'number'
                                      ? b.budget
                                      : Number(b.budget) || 0),
                              0
                          )
                        : activityCostOf(activity);
                rows.push({
                    date: formatDate(day.date),
                    dateIso: day.date,
                    activity,
                    participants,
                    budgetItems,
                    rowTotal,
                });
            }
        }
    }
    return rows;
};
