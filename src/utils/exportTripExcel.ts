import moment from 'moment';

import type { Activity, BudgetItem, ItineraryDay, TripState } from 'types';
import { ACTIVITY_KIND } from 'constants';

const CURRENCY_FORMAT = '"$"#,##0.00';
const PERCENT_FORMAT = '0.0%';

const safeFilename = (name: string | undefined) =>
    (name && name.trim() ? name : 'trip')
        .replace(/[^a-z0-9-_]+/gi, '-')
        .replace(/-+/g, '-')
        .toLowerCase();

const joinNames = (entries?: { label?: string; name?: string }[]) =>
    (entries ?? [])
        .map((e) => e.label ?? e.name ?? '')
        .filter(Boolean)
        .join(', ');

const colLetter = (col: number): string => {
    let s = '';
    let n = col;
    while (n >= 0) {
        s = String.fromCharCode((n % 26) + 65) + s;
        n = Math.floor(n / 26) - 1;
    }
    return s;
};
const cellRef = (col: number, row: number) => `${colLetter(col)}${row + 1}`;

/** Compress consecutive whitespace + trim — keeps multi-line cell content
 *  readable without bloating Excel cell heights. */
const collapseWs = (s: string | undefined | null): string =>
    (s ?? '').replace(/\s+/g, ' ').trim();

/** "9:30 AM" or "11:00 AM – 3:00 PM" when both ends present; blank when neither. */
const formatTimeRange = (start: string | undefined, end: string | undefined): string => {
    const s = collapseWs(start);
    const e = collapseWs(end);
    if (s && e) return `${s} – ${e}`;
    return s || e || '';
};

/** Day banner label: "Tue Jun 9 — Day 1: Iceland". Falls back gracefully
 *  when the date doesn't parse or the destination name is blank. */
const formatDayBanner = (
    dateStr: string,
    dayNumber: number,
    destinationName: string
): string => {
    const m = moment(dateStr);
    const prettyDate = m.isValid() ? m.format('ddd MMM D') : dateStr;
    const dayLabel = `Day ${dayNumber}`;
    return destinationName
        ? `${prettyDate}  —  ${dayLabel}: ${destinationName}`
        : `${prettyDate}  —  ${dayLabel}`;
};

/** Flatten flightSegments into "EWR → KEF → LHR". */
const flightRouteOf = (a: Activity): string => {
    const segs = a.flightSegments ?? [];
    if (!segs.length) return '';
    const chain = [
        segs[0]?.departAirport ?? '',
        ...segs.map((s) => s.arrivalAirport ?? ''),
    ];
    return chain.filter(Boolean).join(' → ');
};

const flightNumbersOf = (a: Activity): string =>
    (a.flightSegments ?? [])
        .map((s) => s.flightNumber ?? '')
        .filter(Boolean)
        .join(' · ');

/** Pick the best display name for an activity. */
const activityDisplayName = (a: Activity): string =>
    collapseWs(a.name) || collapseWs(a.place) || '(untitled)';

/** Location string — for flights, prefer the route; otherwise the
 *  user-entered location. */
const activityLocation = (a: Activity): string => {
    if (a.kind === ACTIVITY_KIND.FLIGHT) {
        const route = flightRouteOf(a);
        const numbers = flightNumbersOf(a);
        return [route, numbers].filter(Boolean).join('  ·  ');
    }
    return collapseWs(a.location);
};

/** Human label for the activity-kind column. */
const activityTypeLabel = (a: Activity): string => {
    switch (a.kind) {
        case ACTIVITY_KIND.FLIGHT:
            return 'Flight';
        case ACTIVITY_KIND.NOTE:
            return 'Note';
        case ACTIVITY_KIND.PLACE:
            return 'Place';
        default:
            return 'Place';
    }
};

/** Human label for the activity status, or blank when none set. */
const activityStatusLabel = (a: Activity): string => {
    const status = a.status as
        | { name?: string; label?: string }
        | string
        | undefined;
    if (!status) return '';
    if (typeof status === 'string') return status;
    return status.label ?? status.name ?? '';
};

/** True when the location looks like a URL (Excel will render it as a
 *  clickable hyperlink if the cell has an `l.Target`). */
const isUrl = (s: string): boolean => /^https?:\/\//i.test(s);

interface PayerSummary {
    name: string;
    total: number;
}

const computePayerTotals = (trip: TripState): {
    grandTotal: number;
    perPayer: PayerSummary[];
} => {
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

/** One row of the itinerary table. `bannerLabel` rows are merged across
 *  all columns and styled gray; activity rows are plain. */
type RowKind = 'banner' | 'activity' | 'activity-payer-only';

interface ItinRow {
    kind: RowKind;
    time?: string;
    type?: string;
    activity?: string;
    location?: string;
    locationHref?: string; // only set when location is a URL
    notes?: string;
    status?: string;
    payer?: string;
    cost?: number;
    bannerLabel?: string;
}

const buildItineraryRows = (trip: TripState): ItinRow[] => {
    const out: ItinRow[] = [];
    let dayCounter = 0;
    for (const dest of trip.destinations ?? []) {
        const destName = collapseWs(dest.country?.name);
        for (const day of (dest.itinerary as ItineraryDay[]) ?? []) {
            dayCounter += 1;
            out.push({
                kind: 'banner',
                bannerLabel: formatDayBanner(day.date, dayCounter, destName),
            });
            for (const activity of day.activities ?? []) {
                const time = formatTimeRange(activity.startTime, activity.endTime);
                const name = activityDisplayName(activity);
                const location = activityLocation(activity);
                const type = activityTypeLabel(activity);
                const status = activityStatusLabel(activity);
                const notes = collapseWs(activity.note);
                const budget = (activity.budget ?? []) as BudgetItem[];

                if (budget.length === 0) {
                    out.push({
                        kind: 'activity',
                        time,
                        type,
                        activity: name,
                        location,
                        locationHref: isUrl(location) ? location : undefined,
                        notes,
                        status,
                        payer: '',
                        cost: undefined,
                    });
                    continue;
                }

                // Activity with budget — first row carries the activity
                // name/location/notes, subsequent rows are payer-only so
                // multi-payer items get stacked rows.
                budget.forEach((b, idx) => {
                    const payer = b.user?.label ?? b.user?.name ?? '';
                    const amt =
                        typeof b.budget === 'number'
                            ? b.budget
                            : Number(b.budget) || 0;
                    if (idx === 0) {
                        out.push({
                            kind: 'activity',
                            time,
                            type,
                            activity: name,
                            location,
                            locationHref: isUrl(location) ? location : undefined,
                            notes,
                            status,
                            payer,
                            cost: amt,
                        });
                    } else {
                        out.push({
                            kind: 'activity-payer-only',
                            payer,
                            cost: amt,
                        });
                    }
                });
            }
        }
    }
    return out;
};

/** Build the primary "Itinerary" sheet. Returns the sheet object so it
 *  can be appended to the workbook by the caller. */
const buildItinerarySheet = (trip: TripState) => {
    const sheet: Record<string, any> = {};

    const HEADER = [
        'Time',
        'Type',
        'Activity',
        'Location',
        'Notes',
        'Status',
        'Paid by',
        'Cost',
    ];
    const NUM_COLS = HEADER.length; // 8

    const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];

    // ── Title + multi-row meta block ──────────────────────────────────────
    const tripName = collapseWs(trip.name) || 'Trip';
    const dateRange = (() => {
        if (!trip.startDate || !trip.endDate) return '';
        const a = moment(trip.startDate);
        const b = moment(trip.endDate);
        if (!a.isValid() || !b.isValid()) return '';
        return `${a.format('ddd MMM D')} – ${b.format('ddd MMM D, YYYY')}`;
    })();
    const nights = (() => {
        if (!trip.startDate || !trip.endDate) return '';
        const a = moment(trip.startDate);
        const b = moment(trip.endDate);
        if (!a.isValid() || !b.isValid()) return '';
        const diff = b.diff(a, 'days');
        if (!Number.isFinite(diff) || diff < 0) return '';
        return diff === 0 ? 'Day trip' : `${diff} night${diff === 1 ? '' : 's'}`;
    })();
    const organizers = joinNames(trip.organizer);
    const participants = joinNames(trip.friends);
    const totalBudget =
        typeof trip.budget === 'number' && trip.budget > 0
            ? `$${trip.budget.toLocaleString()}`
            : '';

    const metaRows: { label: string; value: string }[] = [];
    if (dateRange)
        metaRows.push({
            label: 'Dates',
            value: nights ? `${dateRange}  (${nights})` : dateRange,
        });
    if (organizers) metaRows.push({ label: 'Organizers', value: organizers });
    if (participants) metaRows.push({ label: 'Participants', value: participants });
    if (totalBudget) metaRows.push({ label: 'Budget', value: totalBudget });
    metaRows.push({
        label: 'Generated',
        value: moment().format('MMM D, YYYY h:mm A'),
    });

    let r = 0;
    // Row 0 — Trip name (merged across all columns).
    sheet[cellRef(0, r)] = { v: tripName, t: 's' };
    merges.push({ s: { r, c: 0 }, e: { r, c: NUM_COLS - 1 } });
    r += 1;

    // Meta block — one row per label/value. Label in col A, value
    // spanning B..end. Reads top-to-bottom like a dossier intro.
    for (const meta of metaRows) {
        sheet[cellRef(0, r)] = { v: meta.label, t: 's' };
        sheet[cellRef(1, r)] = { v: meta.value, t: 's' };
        merges.push({ s: { r, c: 1 }, e: { r, c: NUM_COLS - 1 } });
        r += 1;
    }

    // Blank separator before the table.
    r += 1;

    // Header row.
    const headerRow = r;
    HEADER.forEach((label, c) => {
        sheet[cellRef(c, r)] = { v: label, t: 's' };
    });
    r += 1;

    const dataStartRow = r;

    // ── Body rows ────────────────────────────────────────────────────────
    const rows = buildItineraryRows(trip);
    for (const row of rows) {
        if (row.kind === 'banner') {
            sheet[cellRef(0, r)] = { v: row.bannerLabel ?? '', t: 's' };
            merges.push({ s: { r, c: 0 }, e: { r, c: NUM_COLS - 1 } });
            r += 1;
            continue;
        }

        if (row.time) sheet[cellRef(0, r)] = { v: row.time, t: 's' };
        if (row.type) sheet[cellRef(1, r)] = { v: row.type, t: 's' };
        if (row.activity) sheet[cellRef(2, r)] = { v: row.activity, t: 's' };
        if (row.location) {
            const cell: any = { v: row.location, t: 's' };
            if (row.locationHref) cell.l = { Target: row.locationHref };
            sheet[cellRef(3, r)] = cell;
        }
        if (row.notes) sheet[cellRef(4, r)] = { v: row.notes, t: 's' };
        if (row.status) sheet[cellRef(5, r)] = { v: row.status, t: 's' };
        if (row.payer) sheet[cellRef(6, r)] = { v: row.payer, t: 's' };
        if (typeof row.cost === 'number') {
            sheet[cellRef(7, r)] = {
                v: row.cost,
                t: 'n',
                z: CURRENCY_FORMAT,
            };
        }
        r += 1;
    }

    const dataEndRow = Math.max(r - 1, dataStartRow);

    // ── Inline footer total — the full breakdown lives on sheet 2,
    // but a one-line "Grand total" keeps the itinerary sheet
    // self-summarizing.
    const { grandTotal } = computePayerTotals(trip);
    r += 1;
    sheet[cellRef(6, r)] = { v: 'Grand total', t: 's' };
    sheet[cellRef(7, r)] = { v: grandTotal, t: 'n', z: CURRENCY_FORMAT };
    r += 1;

    // ── Sheet-level config ──────────────────────────────────────────────
    sheet['!ref'] = `${cellRef(0, 0)}:${cellRef(NUM_COLS - 1, r)}`;
    sheet['!cols'] = [
        { wch: 18 }, // Time
        { wch: 8 },  // Type
        { wch: 34 }, // Activity
        { wch: 32 }, // Location
        { wch: 30 }, // Notes
        { wch: 12 }, // Status
        { wch: 14 }, // Paid by
        { wch: 12 }, // Cost
    ];
    sheet['!merges'] = merges;
    sheet['!freeze'] = { xSplit: 0, ySplit: dataStartRow };
    sheet['!autofilter'] = {
        ref: `${cellRef(0, headerRow)}:${cellRef(NUM_COLS - 1, dataEndRow)}`,
    };

    return sheet;
};

/** Build the "Budget Summary" sheet — clean payer breakdown with totals
 *  and per-payer percentages. Lives on its own sheet so heavy travelers
 *  can copy/sort/filter without touching the itinerary. */
const buildBudgetSheet = (trip: TripState) => {
    const sheet: Record<string, any> = {};
    const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];
    const HEADER = ['Person', 'Amount', '% of total'];
    const NUM_COLS = HEADER.length;

    const tripName = collapseWs(trip.name) || 'Trip';
    const { grandTotal, perPayer } = computePayerTotals(trip);
    const payerSum = perPayer.reduce((acc, p) => acc + p.total, 0);
    const balance = grandTotal - payerSum;

    let r = 0;
    // Row 0 — title.
    sheet[cellRef(0, r)] = { v: `${tripName} — Budget Summary`, t: 's' };
    merges.push({ s: { r, c: 0 }, e: { r, c: NUM_COLS - 1 } });
    r += 1;
    // Row 1 — total budget line (if set).
    if (typeof trip.budget === 'number' && trip.budget > 0) {
        sheet[cellRef(0, r)] = { v: 'Planned budget', t: 's' };
        sheet[cellRef(1, r)] = { v: trip.budget, t: 'n', z: CURRENCY_FORMAT };
        const used = grandTotal / trip.budget;
        sheet[cellRef(2, r)] = { v: used, t: 'n', z: PERCENT_FORMAT };
        r += 1;
    }
    sheet[cellRef(0, r)] = { v: 'Total spent', t: 's' };
    sheet[cellRef(1, r)] = { v: grandTotal, t: 'n', z: CURRENCY_FORMAT };
    r += 1;

    // Blank separator.
    r += 1;

    // Header row.
    const headerRow = r;
    HEADER.forEach((label, c) => {
        sheet[cellRef(c, r)] = { v: label, t: 's' };
    });
    r += 1;

    const dataStartRow = r;

    // Per-payer rows.
    perPayer.forEach((p) => {
        sheet[cellRef(0, r)] = { v: p.name, t: 's' };
        sheet[cellRef(1, r)] = { v: p.total, t: 'n', z: CURRENCY_FORMAT };
        if (grandTotal > 0) {
            sheet[cellRef(2, r)] = {
                v: p.total / grandTotal,
                t: 'n',
                z: PERCENT_FORMAT,
            };
        }
        r += 1;
    });

    const dataEndRow = Math.max(r - 1, dataStartRow);

    // Balance row.
    r += 1;
    sheet[cellRef(0, r)] = { v: 'Balance', t: 's' };
    sheet[cellRef(1, r)] = { v: balance, t: 'n', z: CURRENCY_FORMAT };
    r += 1;

    sheet['!ref'] = `${cellRef(0, 0)}:${cellRef(NUM_COLS - 1, r)}`;
    sheet['!cols'] = [
        { wch: 24 }, // Person
        { wch: 14 }, // Amount
        { wch: 12 }, // % of total
    ];
    sheet['!merges'] = merges;
    sheet['!freeze'] = { xSplit: 0, ySplit: dataStartRow };
    sheet['!autofilter'] = {
        ref: `${cellRef(0, headerRow)}:${cellRef(NUM_COLS - 1, dataEndRow)}`,
    };

    return sheet;
};

export const exportTripToExcel = async (trip: TripState) => {
    const XLSX = await import('xlsx');

    // NOTE: SheetJS Community Edition (`xlsx`) ignores cell `s` style
    // properties — colors, fonts, fills are dropped at write time. We
    // ship structural fidelity (rich header rows, day banners, hyperlinks,
    // freeze pane, autofilter, currency formatting, dedicated budget
    // sheet) and accept plain visual output for v1. Drop-in upgrade to
    // `xlsx-js-style` (style-aware fork) would let the same data carry
    // bold headers, banded rows, and green day banners with zero data
    // changes — only the import line.

    const wb = XLSX.utils.book_new();
    const itinerarySheet = buildItinerarySheet(trip);
    const budgetSheet = buildBudgetSheet(trip);

    XLSX.utils.book_append_sheet(wb, itinerarySheet as any, 'Itinerary');
    XLSX.utils.book_append_sheet(wb, budgetSheet as any, 'Budget Summary');
    XLSX.writeFile(wb, `${safeFilename(trip.name)}.xlsx`);
};
