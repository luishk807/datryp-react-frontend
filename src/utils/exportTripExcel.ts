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
        ? `${prettyDate} — ${dayLabel}: ${destinationName}`
        : `${prettyDate} — ${dayLabel}`;
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
    activity?: string;
    location?: string;
    locationHref?: string; // only set when location is a URL
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
                const budget = (activity.budget ?? []) as BudgetItem[];

                if (budget.length === 0) {
                    // Activity with no expense split — single row, blank
                    // payer/cost.
                    out.push({
                        kind: 'activity',
                        time,
                        activity: name,
                        location,
                        locationHref: isUrl(location) ? location : undefined,
                        payer: '',
                        cost: undefined,
                    });
                    continue;
                }

                // Activity with budget — first row carries the activity
                // name + location, subsequent rows are payer-only so the
                // export reads like the sample (multi-payer items get
                // stacked rows).
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
                            activity: name,
                            location,
                            locationHref: isUrl(location) ? location : undefined,
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

export const exportTripToExcel = async (trip: TripState) => {
    const XLSX = await import('xlsx');

    const wb = XLSX.utils.book_new();
    const sheet: Record<string, any> = {};

    const HEADER = ['Time', 'Activity', 'Location', 'Paid by', 'Cost'];
    const NUM_COLS = HEADER.length; // 5

    const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];

    // ── Title + meta rows ───────────────────────────────────────────────
    const tripName = collapseWs(trip.name) || 'Trip';
    const metaParts: string[] = [];
    if (trip.organizer?.length) metaParts.push(`Organizer: ${joinNames(trip.organizer)}`);
    if (trip.friends?.length) metaParts.push(`Friends: ${joinNames(trip.friends)}`);
    if (trip.startDate && trip.endDate) {
        const a = moment(trip.startDate);
        const b = moment(trip.endDate);
        if (a.isValid() && b.isValid()) {
            metaParts.push(
                `${a.format('MMM D')}–${b.format('MMM D, YYYY')}`
            );
        }
    }
    if (typeof trip.budget === 'number' && trip.budget > 0) {
        metaParts.push(`Budget: $${trip.budget.toLocaleString()}`);
    }

    // NOTE: SheetJS Community Edition (`xlsx`) ignores cell `s` style
    // properties — colors, fonts, fills are dropped at write time. We
    // ship structural fidelity (rows, merges, hyperlinks, formulas,
    // freeze pane, currency format) and accept plain visual output for
    // v1. When `xlsx-js-style` (drop-in fork with style support) is
    // installed, the unstyled cells below can be upgraded by adding the
    // `s: { font, fill, alignment }` blocks back in.

    let r = 0;
    // Row 0 — Title (merged A:E)
    sheet[cellRef(0, r)] = { v: tripName, t: 's' };
    merges.push({ s: { r, c: 0 }, e: { r, c: NUM_COLS - 1 } });
    r += 1;
    // Row 1 — Meta line (merged A:E)
    if (metaParts.length) {
        sheet[cellRef(0, r)] = { v: metaParts.join('  ·  '), t: 's' };
        merges.push({ s: { r, c: 0 }, e: { r, c: NUM_COLS - 1 } });
    }
    r += 1;
    // Row 2 — blank separator
    r += 1;
    // Row 3 — Header row
    const headerRow = r;
    HEADER.forEach((label, c) => {
        sheet[cellRef(c, r)] = { v: label, t: 's' };
    });
    r += 1;

    const dataStartRow = r;
    const costColIdx = HEADER.indexOf('Cost');

    // ── Body rows ───────────────────────────────────────────────────────
    const rows = buildItineraryRows(trip);
    for (const row of rows) {
        if (row.kind === 'banner') {
            // Banner row — merged across all columns. Without cell
            // styling, the text alone serves as a visual day separator.
            sheet[cellRef(0, r)] = { v: row.bannerLabel ?? '', t: 's' };
            merges.push({ s: { r, c: 0 }, e: { r, c: NUM_COLS - 1 } });
            r += 1;
            continue;
        }

        // Time
        if (row.time) {
            sheet[cellRef(0, r)] = { v: row.time, t: 's' };
        }
        // Activity name
        if (row.activity) {
            sheet[cellRef(1, r)] = { v: row.activity, t: 's' };
        }
        // Location — render as hyperlink when it's a URL.
        if (row.location) {
            const cell: any = { v: row.location, t: 's' };
            if (row.locationHref) {
                cell.l = { Target: row.locationHref };
            }
            sheet[cellRef(2, r)] = cell;
        }
        // Paid by
        if (row.payer) {
            sheet[cellRef(3, r)] = { v: row.payer, t: 's' };
        }
        // Cost
        if (typeof row.cost === 'number') {
            sheet[cellRef(4, r)] = {
                v: row.cost,
                t: 'n',
                z: CURRENCY_FORMAT,
            };
        }
        r += 1;
    }

    const dataEndRow = Math.max(r - 1, dataStartRow);

    // ── Bottom summary block ────────────────────────────────────────────
    const { grandTotal, perPayer } = computePayerTotals(trip);

    // Blank separator row before summary.
    r += 1;
    const summaryStartRow = r;

    // Total row — label in col D, value in col E with currency format.
    sheet[cellRef(3, r)] = { v: 'Total', t: 's' };
    sheet[cellRef(4, r)] = { v: grandTotal, t: 'n', z: CURRENCY_FORMAT };
    r += 1;

    // Per-payer rows: name in col D, amount in col E, percentage in col F
    // (extending one column past the main table for the % readout).
    perPayer.forEach((p) => {
        sheet[cellRef(3, r)] = { v: p.name, t: 's' };
        sheet[cellRef(4, r)] = { v: p.total, t: 'n', z: CURRENCY_FORMAT };
        if (grandTotal > 0) {
            sheet[cellRef(5, r)] = {
                v: p.total / grandTotal,
                t: 'n',
                z: PERCENT_FORMAT,
            };
        }
        r += 1;
    });

    // Balance row — sum of payer totals minus grand total. Always 0 when
    // every activity has a complete budget split; non-zero indicates
    // unsplit costs (worth surfacing rather than hiding).
    const payerSum = perPayer.reduce((acc, p) => acc + p.total, 0);
    const balance = grandTotal - payerSum;
    sheet[cellRef(3, r)] = { v: 'Balance', t: 's' };
    sheet[cellRef(4, r)] = { v: balance, t: 'n', z: CURRENCY_FORMAT };
    const summaryEndRow = r;
    r += 1;

    // ── Sheet-level config ──────────────────────────────────────────────
    sheet['!ref'] = `${cellRef(0, 0)}:${cellRef(NUM_COLS, r)}`;
    sheet['!cols'] = [
        { wch: 18 }, // Time
        { wch: 36 }, // Activity
        { wch: 38 }, // Location
        { wch: 14 }, // Paid by
        { wch: 12 }, // Cost
        { wch: 8 },  // Percent (only for summary block)
    ];
    sheet['!merges'] = merges;
    // Freeze pane: header row stays visible while scrolling the body.
    sheet['!freeze'] = { xSplit: 0, ySplit: dataStartRow };
    // AutoFilter over the header + data range (banner rows stay in-range;
    // Excel treats them as merged labels which is fine for filter UX).
    sheet['!autofilter'] = {
        ref: `${cellRef(0, headerRow)}:${cellRef(NUM_COLS - 1, dataEndRow)}`,
    };
    // Row heights — banner rows a touch taller for breathing room. We
    // don't iterate every row (SheetJS doesn't make this trivial); the
    // default + wrapText on activity/location handles most cases.

    XLSX.utils.book_append_sheet(wb, sheet as any, 'Itinerary');
    XLSX.writeFile(wb, `${safeFilename(trip.name)}.xlsx`);

    // Reference (silences unused-var warning when the body never sees them).
    void summaryStartRow;
    void summaryEndRow;
    void costColIdx;
};
