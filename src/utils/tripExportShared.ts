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
    // Collapse equal-or-missing pairs so we never render "1:00pm - 1:00pm"
    // (some legacy activities ship with both fields set to the same value)
    // or "1:00pm - " (one side missing). Either way the user only sees the
    // single meaningful time.
    if (s && e && s !== e) return `${s} - ${e}`;
    return s || e || '';
};

/** Headline schedule string for an activity row on the day timeline.
 *  Kind-aware so each entry shows the right time semantics:
 *  - Flight: depart→arrival pulled from the first/last `flightSegments`
 *    entry (top-level startTime/endTime aren't reliable for multi-leg
 *    flights and are sometimes blank).
 *  - Train / Bus / Rental car: same depart→arrival logic but against
 *    `transitSegments` (for rental cars: pickup→dropoff), falling back
 *    to top-level startTime/endTime when the segments haven't shipped
 *    yet (legacy / pre-segment-persistence rows).
 *  - Hotel check-in / check-out: single time only — the activity is
 *    a single bookend event, never a range.
 *  - Note: blank, notes are timeless.
 *  - Otherwise: standard `formatTimeRange(start, end)` with the
 *    equal-or-missing collapse from above. */
export const formatActivityTime = (a: Activity): string => {
    const kind = a.kind ?? ACTIVITY_KIND.PLACE;
    if (kind === ACTIVITY_KIND.NOTE) return '';
    if (kind === ACTIVITY_KIND.FLIGHT) {
        const segs = a.flightSegments ?? [];
        if (segs.length) {
            const first = segs[0];
            const last = segs[segs.length - 1];
            return formatTimeRange(first?.departTime, last?.arrivalTime);
        }
        // Fall through to the legacy top-level fields for the rare
        // flight saved before the segment join-table shipped.
        return formatTimeRange(a.startTime, a.endTime);
    }
    if (
        kind === ACTIVITY_KIND.TRAIN ||
        kind === ACTIVITY_KIND.BUS ||
        kind === ACTIVITY_KIND.RENTAL_CAR ||
        kind === ACTIVITY_KIND.OTHER
    ) {
        const segs = a.transitSegments ?? [];
        if (segs.length) {
            const first = segs[0];
            const last = segs[segs.length - 1];
            return formatTimeRange(first?.departTime, last?.arrivalTime);
        }
        return formatTimeRange(a.startTime, a.endTime);
    }
    if (
        kind === ACTIVITY_KIND.HOTEL_CHECKIN ||
        kind === ACTIVITY_KIND.HOTEL_CHECKOUT
    ) {
        // Single-time event: only the relevant bookend time is shown.
        // `endTime` is intentionally ignored even if a stale value
        // exists on a legacy row.
        return formatTimeOne(a.startTime);
    }
    return formatTimeRange(a.startTime, a.endTime);
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
    /** Sum of activity costs across the trip that aren't marked
     *  paid yet — the "still need to bring this much cash" total.
     *  Drives the new Outstanding row in the PDF totals table so
     *  the user has a concrete out-of-pocket number to budget for
     *  before the trip starts. */
    unpaidTotal: number;
    /** Sum of every activity's cost across the trip, independent of
     *  paid status, payer attribution, or whether the cost was split.
     *  Drives the "Total cost" row in the PDF + Excel overview blocks
     *  — a stable headline figure that always equals what the user
     *  typed into each activity. `grandTotal` differs in that it only
     *  counts costs that have been attributed to a payer (split or
     *  single-payer + marked paid), which excludes upcoming /
     *  unassigned activities and would read as $0 on planning trips. */
    totalCost: number;
}

export const computePayerTotals = (trip: TripState): PayerTotals => {
    const totals = new Map<string, number>();
    let grandTotal = 0;
    let unpaidTotal = 0;
    let totalCost = 0;
    for (const dest of trip.destinations ?? []) {
        for (const day of dest.itinerary ?? []) {
            for (const activity of day.activities ?? []) {
                totalCost += activityCostOf(activity);
                const budget = activity.budget ?? [];
                if (budget.length > 0) {
                    for (const b of budget) {
                        const name =
                            b.user?.label ?? b.user?.name ?? '(unknown)';
                        const amt =
                            typeof b.budget === 'number'
                                ? b.budget
                                : Number(b.budget) || 0;
                        totals.set(name, (totals.get(name) ?? 0) + amt);
                        grandTotal += amt;
                    }
                } else if (activity.paidAt && activity.paidBy?.name) {
                    // Single-payer fallback — when the user hit
                    // "Mark as paid" with one assigned payer (no
                    // split), the budget array stays empty but
                    // the payer + activity cost are still real
                    // attribution data. Without this branch the
                    // payer-totals table was silently dropping
                    // every single-payer activity, which read as
                    // "I assigned who paid but the report is
                    // missing them."
                    const name = activity.paidBy.name.trim();
                    const cost = activityCostOf(activity);
                    if (name) {
                        totals.set(name, (totals.get(name) ?? 0) + cost);
                        grandTotal += cost;
                    }
                }
                // Outstanding = sum of activity costs for any
                // activity NOT marked paid. Independent of who's
                // assigned to pay — even unassigned-but-priced
                // activities still drain cash. Skip when the
                // activity has no cost so a free "Note" entry
                // doesn't inflate the unpaid bucket.
                if (!activity.paidAt) {
                    unpaidTotal += activityCostOf(activity);
                }
            }
        }
    }
    const perPayer = Array.from(totals.entries())
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total);
    return { grandTotal, perPayer, unpaidTotal, totalCost };
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

/** Per-person confirmed-payment line for the Confirmed Paid column on
 *  both the PDF + Excel exports. Returns one line per confirmed payer:
 *  "<name> <amount> · <date>".
 *
 *  Source-of-truth note: the backend resolves `paidByUserId` to
 *  `paidBy.name` on refetch, so any formatted multi-payer string we
 *  write into `paidBy.name` ("Alice & Bob") gets overwritten back to
 *  the single resolved user name on the next load. That makes
 *  `paidBy.name` an unreliable channel for "who else confirmed".
 *
 *  Instead we treat the `budget` array as canonical: when the activity
 *  is marked paid AND has a per-person budget breakdown, every budget
 *  entry counts as confirmed. This matches the user's mental model
 *  ("if I split this and marked it paid, everyone in the split paid
 *  their share") and is the only durable signal until backend gains a
 *  per-person confirmation column. */
export const confirmedPaidEntries = (activity: Activity): string[] => {
    if (!activity.paidAt) return [];
    const dateLabel = formatDate(activity.paidAt);
    const budget = (activity.budget ?? []) as BudgetItem[];

    if (budget.length > 0) {
        return budget.map((b) => {
            const name = (
                b.user?.label ??
                b.user?.name ??
                '(unknown)'
            ).trim();
            const amt =
                typeof b.budget === 'number'
                    ? b.budget
                    : Number(b.budget) || 0;
            const amountPart = amt > 0 ? ` ${formatCurrency(amt)}` : '';
            return dateLabel
                ? `${name}${amountPart} · ${dateLabel}`
                : `${name}${amountPart}`;
        });
    }

    // Fallback for paid activities without a budget breakdown — surface
    // the single payer + total activity cost so the column isn't
    // empty when the user just hit "Mark as paid" without setting a
    // split.
    const fallbackName = activity.paidBy?.name?.trim() || 'Unknown';
    const cost = activityCostOf(activity);
    const amountPart = cost > 0 ? ` ${formatCurrency(cost)}` : '';
    return [
        dateLabel
            ? `${fallbackName}${amountPart} · ${dateLabel}`
            : `${fallbackName}${amountPart}`,
    ];
};

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

/** Stable content signature for dedupe — used when two backend rows
 *  share the same activity content but carry different ids (e.g. a
 *  save race that double-inserted). Mirrors the fields a human would
 *  use to decide "these are the same activity": kind, name, time
 *  window, cost, and the first transport segment's endpoints. */
const activityContentSig = (a: Activity): string => {
    const kind = a.kind ?? ACTIVITY_KIND.PLACE;
    let segHint = '';
    if (kind === ACTIVITY_KIND.FLIGHT) {
        const s = a.flightSegments?.[0];
        segHint = [
            s?.departAirport ?? '',
            s?.arrivalAirport ?? '',
            s?.flightNumber ?? '',
            s?.departDate ?? '',
            s?.departTime ?? '',
        ].join('|');
    } else if (
        kind === ACTIVITY_KIND.TRAIN ||
        kind === ACTIVITY_KIND.BUS ||
        kind === ACTIVITY_KIND.RENTAL_CAR ||
        kind === ACTIVITY_KIND.OTHER
    ) {
        const s = a.transitSegments?.[0];
        segHint = [
            s?.departStation ?? '',
            s?.arrivalStation ?? '',
            s?.number ?? '',
            s?.departDate ?? '',
            s?.departTime ?? '',
        ].join('|');
    }
    return [
        kind,
        (a.name ?? '').trim().toLowerCase(),
        a.startTime ?? '',
        a.endTime ?? '',
        String(a.cost ?? ''),
        segHint,
    ].join('::');
};

export const walkItinerary = (trip: TripState): ItineraryRow[] => {
    const rows: ItineraryRow[] = [];
    // Dedupe by activity.id — a stale or corrupted backend state can
    // surface the same activity in multiple itinerary days (saw this
    // on /trip-detail where a single Manuel Antonio entry rendered
    // twice in the exported PDF). Track IDs we've already emitted and
    // skip repeats. Activities without an id (rare; fresh drafts
    // before save) still render — they can't be deduped reliably.
    const seenIds = new Set<number>();
    // Secondary dedupe by content signature, scoped to the day. A save
    // race / duplicate insert produces two backend rows with DIFFERENT
    // ids but identical content — the id-based pass above misses them.
    // Scoped per-date so the same recurring activity ("Breakfast") on
    // two different days still both render.
    const seenSigsByDate = new Map<string, Set<string>>();
    for (const dest of trip.destinations ?? []) {
        for (const day of dest.itinerary ?? []) {
            for (const activity of day.activities ?? []) {
                if (activity.id != null) {
                    if (seenIds.has(activity.id)) continue;
                    seenIds.add(activity.id);
                }
                const sig = activityContentSig(activity);
                const dayKey = day.date ?? '';
                let dateSigs = seenSigsByDate.get(dayKey);
                if (!dateSigs) {
                    dateSigs = new Set<string>();
                    seenSigsByDate.set(dayKey, dateSigs);
                }
                if (dateSigs.has(sig)) continue;
                dateSigs.add(sig);
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
