/**
 * `exportTripToExcel(trip)` — produces a 3-sheet .xlsx workbook
 * matching `datryp_sample.xlsx`:
 *
 *   1. Overview        — embedded logo + key/value summary (trip
 *                        name, dates, organizer, participants, budget).
 *   2. Itinerary       — embedded logo + Date | Time | Activity | Cost
 *                        | Who is Paying. Column-header row uses solid
 *                        black fill with white bold text. Date column
 *                        is merged across activities sharing a day;
 *                        notes get their own row directly under the
 *                        activity they annotate. (Per-activity
 *                        participants live on the Overview tab now;
 *                        the itinerary stays compact.)
 *   3. Expense Report  — embedded logo + Date | Item | Total table,
 *                        Paid By / Total breakdown, Subtotal +
 *                        Grand Total summary. Section header rows use
 *                        the same black-fill / white-bold treatment.
 *
 * Library: ExcelJS. Switched from `xlsx-js-style` (which couldn't
 * embed images) so the actual daTryp logo renders as a real PNG image
 * at the top of every sheet instead of a styled text wordmark. The
 * logo lives as `assets/logo.svg` and is rasterized to PNG via a
 * browser canvas at export time — no PNG asset needs to be checked
 * in. Same `exportTripToExcel(trip)` signature; share-modal wiring
 * unchanged.
 */
import moment from 'moment';

import logoSvgRaw from 'assets/logo.svg?raw';
import { ACTIVITY_KIND } from 'constants';
import type { Activity, BudgetItem, TripState } from 'types';
import {
    activityDisplayName,
    activityLocation,
    collapseWs,
    computePayerTotals,
    confirmedPaidEntries,
    formatActivityTime,
    joinNames,
    safeFilename,
    tripBudgetTotal,
} from 'utils/tripExportShared';

const CURRENCY_FORMAT = '"$"#,##0.00';
const DATE_FORMAT = 'mm/dd/yyyy';

// Brand palette. Excel ARGB format: 'FF' alpha + 6-digit RGB.
const ARGB = {
    headerFillBlack: 'FF000000',
    headerTextWhite: 'FFFFFFFF',
    borderGray: 'FFCCCCCC',
} as const;

const HEADER_FILL = {
    type: 'pattern' as const,
    pattern: 'solid' as const,
    fgColor: { argb: ARGB.headerFillBlack },
};
const HEADER_FONT = {
    bold: true,
    color: { argb: ARGB.headerTextWhite },
};

// Logo render size (in pixels). 526:319.3 native viewBox aspect → use
// proportional render to keep the wordmark crisp at retina-equivalent
// scaling. Excel embeds this PNG and the `ext` block below positions
// it.
const LOGO_RENDER_PX = { w: 526, h: 319 };
const LOGO_DISPLAY_PX = { w: 132, h: 80 };

// ── SVG → PNG (browser) ─────────────────────────────────────────────────────
//
// ExcelJS embeds images as PNG/JPEG/GIF buffers, not SVG. We convert
// `logo.svg` to PNG once per export via an off-DOM canvas. Two
// quirks worth knowing:
//   1. Adobe-Illustrator SVG uses `<style>.st0{fill:#3EB549}</style>`
//      with class selectors. Browsers WILL honor that styling when
//      the SVG is rasterized via <img>, but only if the <style>
//      block is self-contained — which Illustrator's output is. So
//      unlike pdfmake (which strips <style>), we can feed the raw
//      SVG directly here.
//   2. SVGs containing external references would tripped CORS taint
//      and `canvas.toDataURL()` would throw. Our logo is fully
//      inlined, so no taint.

let cachedLogoPngBase64: string | null = null;

const svgToPngBase64 = (
    svgString: string,
    pixelW: number,
    pixelH: number,
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const svgBlob = new Blob([svgString], {
            type: 'image/svg+xml;charset=utf-8',
        });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = pixelW;
                canvas.height = pixelH;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    URL.revokeObjectURL(url);
                    reject(new Error('canvas 2D context unavailable'));
                    return;
                }
                ctx.drawImage(img, 0, 0, pixelW, pixelH);
                const dataUrl = canvas.toDataURL('image/png');
                // Strip the "data:image/png;base64," prefix — ExcelJS
                // wants just the base64 payload.
                const base64 = dataUrl.split(',', 2)[1] ?? '';
                URL.revokeObjectURL(url);
                resolve(base64);
            } catch (err) {
                URL.revokeObjectURL(url);
                reject(err);
            }
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('SVG image failed to load'));
        };
        img.src = url;
    });
};

const getLogoPng = async (): Promise<string> => {
    if (cachedLogoPngBase64 !== null) return cachedLogoPngBase64;
    try {
        cachedLogoPngBase64 = await svgToPngBase64(
            logoSvgRaw,
            LOGO_RENDER_PX.w,
            LOGO_RENDER_PX.h,
        );
    } catch {
        // Best-effort: if the conversion fails for any reason (older
        // browser, CSP, headless test env), fall back to no logo
        // rather than blowing up the entire export.
        cachedLogoPngBase64 = '';
    }
    return cachedLogoPngBase64;
};

// ── Activity-row helpers (library-agnostic) ─────────────────────────────────

/** Multi-line cell content describing a single activity:
 *    Line 1 — activity name (always)
 *    Line 2 — location or address (if any)
 *    Line 3 — flight number (only for flight kinds)
 *  Joined with `\n` so Excel renders multi-line when wrap-text is
 *  enabled. */
const activityCellLines = (a: Activity): string => {
    const lines: string[] = [activityDisplayName(a)];
    const loc = activityLocation(a);
    if (loc) lines.push(loc);
    if (a.kind === ACTIVITY_KIND.FLIGHT) {
        const numbers = (a.flightSegments ?? [])
            .map((s) => s.flightNumber ?? '')
            .filter(Boolean);
        if (numbers.length) {
            lines.push(`Flight No: ${numbers.join(' / ')}`);
        }
    }
    return lines.join('\n');
};

const payerCellLines = (budgetItems: BudgetItem[]): string =>
    budgetItems
        .map((b) => {
            const name = b.user?.label ?? b.user?.name ?? '(unknown)';
            const amt =
                typeof b.budget === 'number'
                    ? b.budget
                    : Number(b.budget) || 0;
            return `${name}: $${amt.toFixed(2)}`;
        })
        .join('\n');

const activityCost = (a: Activity, budgetItems: BudgetItem[]): number => {
    if (budgetItems.length > 0) {
        return budgetItems.reduce(
            (acc, b) =>
                acc +
                (typeof b.budget === 'number' ? b.budget : Number(b.budget) || 0),
            0
        );
    }
    const raw = a.cost;
    if (typeof raw === 'number') return raw;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
};

const parseDate = (raw: string | undefined | null): Date | null => {
    if (!raw) return null;
    const m = moment(raw);
    return m.isValid() ? m.toDate() : null;
};

// ── ExcelJS helpers ─────────────────────────────────────────────────────────

// Loose type aliases — we use unknown for the lazy-loaded ExcelJS so
// our top-level imports stay clean. Cast at call sites where helpful.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EWorkbook = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EWorksheet = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ECell = any;

const styleHeaderCell = (cell: ECell): void => {
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = { vertical: 'middle', wrapText: true };
};

const styleBodyCell = (cell: ECell): void => {
    cell.alignment = { vertical: 'top', wrapText: true };
};

const styleBoldBodyCell = (cell: ECell): void => {
    cell.font = { bold: true };
    cell.alignment = { vertical: 'top', wrapText: true };
};

/** Embed the daTryp logo at A1 of the given sheet and reserve row
 *  height for it. The image is anchored by top-left = (col 0, row 0)
 *  with a fixed display size. The first row's height is bumped to
 *  match the logo height so subsequent rows aren't pushed up under
 *  the image. */
const addLogo = async (
    workbook: EWorkbook,
    sheet: EWorksheet,
): Promise<void> => {
    const pngBase64 = await getLogoPng();
    if (!pngBase64) return;
    const imageId = workbook.addImage({
        base64: pngBase64,
        extension: 'png',
    });
    sheet.addImage(imageId, {
        tl: { col: 0, row: 0 },
        ext: { width: LOGO_DISPLAY_PX.w, height: LOGO_DISPLAY_PX.h },
    });
    // 1pt ≈ 1.333px → bump the first row by enough pts to clear the
    // logo. A little extra margin (8pt) makes the next row breathe.
    sheet.getRow(1).height = LOGO_DISPLAY_PX.h * 0.78;
};

// ── Sheet 1: Overview ───────────────────────────────────────────────────────

const buildOverviewSheet = async (
    workbook: EWorkbook,
    trip: TripState,
): Promise<void> => {
    const ws = workbook.addWorksheet('Overview');

    ws.columns = [
        { header: '', key: 'label', width: 18 },
        { header: '', key: 'value', width: 40 },
    ];

    await addLogo(workbook, ws);

    // Row 2 is the spacer between the logo image (anchored at row 1)
    // and the actual key/value rows. ExcelJS row indexes are 1-based.
    let r = 3;

    const writeRow = (
        label: string,
        value: string | number | Date | null,
        numFmt?: string,
    ): void => {
        const labelCell = ws.getCell(r, 1);
        labelCell.value = label;
        // Label column on the Overview sheet uses the same black-fill /
        // white-bold treatment as the section headers on the other
        // sheets — it acts as a row header for the value alongside it.
        labelCell.font = HEADER_FONT;
        labelCell.fill = HEADER_FILL;
        labelCell.alignment = { vertical: 'top', wrapText: true };

        const valueCell = ws.getCell(r, 2);
        if (value === null) {
            valueCell.value = '';
        } else {
            valueCell.value = value;
        }
        if (numFmt) valueCell.numFmt = numFmt;
        styleBodyCell(valueCell);
        r += 1;
    };

    writeRow('Trip name', collapseWs(trip.name) || 'Trip');
    writeRow('From Date:', parseDate(trip.startDate), DATE_FORMAT);
    writeRow('To Date', parseDate(trip.endDate), DATE_FORMAT);
    writeRow('Organizer', joinNames(trip.organizer));
    writeRow('Participants', joinNames(trip.friends));
    writeRow('Budget', tripBudgetTotal(trip), CURRENCY_FORMAT);
};

// ── Sheet 2: Itinerary ──────────────────────────────────────────────────────

interface ItineraryWriteRow {
    /** Excel JS Date for the activity's day. Repeated within the
     *  group; only the first row of the group writes the value, the
     *  others get merged into it. */
    date: Date | null;
    /** Plain ISO YYYY-MM-DD for grouping. */
    dateIso: string;
    isNoteOnly: boolean;
    time: string;
    activityCell: string;
    cost: number | null;
    whoIsPaying: string;
    /** Organizer's "marked paid" attestation. Empty strings when unpaid
     *  so the cell renders blank. `paidOn` is a JS Date so Excel's
     *  date-format styling applies. */
    paidBy: string;
    paidOn: Date | null;
    /** Per-person confirmation breakdown: each line = "<name>
     *  <amount> · <date>". Joined with `\n` so Excel renders the
     *  multi-payer split as a wrapped cell. Empty when the activity
     *  isn't marked paid. */
    confirmedPaid: string;
}

const collectItineraryRows = (trip: TripState): ItineraryWriteRow[] => {
    const out: ItineraryWriteRow[] = [];
    for (const dest of trip.destinations ?? []) {
        for (const day of dest.itinerary ?? []) {
            const date = parseDate(day.date);
            for (const activity of day.activities ?? []) {
                const budgetItems = (activity.budget ?? []) as BudgetItem[];
                out.push({
                    date,
                    dateIso: day.date,
                    isNoteOnly: false,
                    time: formatActivityTime(activity),
                    activityCell: activityCellLines(activity),
                    cost: activityCost(activity, budgetItems),
                    whoIsPaying: payerCellLines(budgetItems),
                    paidBy: activity.paidAt
                        ? activity.paidBy?.name?.trim() || 'Unknown'
                        : '',
                    paidOn: activity.paidAt ? parseDate(activity.paidAt) : null,
                    confirmedPaid: confirmedPaidEntries(activity).join('\n'),
                });
                const note = collapseWs(activity.note);
                if (note) {
                    out.push({
                        date,
                        dateIso: day.date,
                        isNoteOnly: true,
                        time: '',
                        activityCell: `Note: ${note}`,
                        cost: null,
                        whoIsPaying: '',
                        paidBy: '',
                        paidOn: null,
                        confirmedPaid: '',
                    });
                }
            }
        }
    }
    return out;
};

const buildItinerarySheet = async (
    workbook: EWorkbook,
    trip: TripState,
): Promise<void> => {
    const ws = workbook.addWorksheet('Itinerary');

    ws.columns = [
        { width: 12 }, // Date
        { width: 18 }, // Time
        { width: 36 }, // Activity (multi-line)
        { width: 12 }, // Cost
        { width: 16 }, // Paid By (organizer attestation)
        { width: 12 }, // Paid On
        { width: 26 }, // Who is Paying (per-friend budget split)
        { width: 34 }, // Confirmed Paid (per-person name · amount · date)
    ];

    // Per the sample, Itinerary has no logo at the top — column
    // headers sit at row 1, data immediately below. The Overview
    // sheet carries the logo for the whole workbook.
    // Paid By / Paid On sit right after Cost so the columns flow
    // chronologically along the row: schedule → cost → payment
    // attestation → budget split.
    const HEADER = [
        'Date',
        'Time',
        'Activity',
        'Cost',
        'Paid By',
        'Paid On',
        'Who is Paying',
        'Confirmed Paid',
    ];
    const headerRowIdx = 1;
    const headerRow = ws.getRow(headerRowIdx);
    HEADER.forEach((label, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = label;
        styleHeaderCell(cell);
    });
    headerRow.height = 22;

    // Freeze the header row + the logo strip so they stay visible while
    // the user scrolls the activities.
    ws.views = [{ state: 'frozen', ySplit: headerRowIdx }];

    const rows = collectItineraryRows(trip);

    let r = headerRowIdx + 1;
    let groupStart = -1;
    let groupDateIso = '';
    const flushGroup = (endRow: number): void => {
        if (groupStart >= 0 && endRow > groupStart) {
            ws.mergeCells(groupStart, 1, endRow, 1);
            // Center the merged date vertically within the block.
            ws.getCell(groupStart, 1).alignment = {
                vertical: 'top',
                wrapText: true,
            };
        }
        groupStart = -1;
        groupDateIso = '';
    };

    for (const row of rows) {
        if (row.dateIso !== groupDateIso) {
            flushGroup(r - 1);
            groupDateIso = row.dateIso;
            groupStart = r;
            if (row.date) {
                const dateCell = ws.getCell(r, 1);
                dateCell.value = row.date;
                dateCell.numFmt = DATE_FORMAT;
                styleBodyCell(dateCell);
            }
        }
        if (row.time) {
            const c = ws.getCell(r, 2);
            c.value = row.time;
            styleBodyCell(c);
        }
        const activityCell = ws.getCell(r, 3);
        activityCell.value = row.activityCell;
        styleBodyCell(activityCell);
        if (row.isNoteOnly) {
            // Italicize note rows so they're visually distinct from
            // real activities.
            activityCell.font = { italic: true, color: { argb: 'FF666666' } };
        }
        if (row.cost !== null) {
            const c = ws.getCell(r, 4);
            c.value = row.cost;
            c.numFmt = CURRENCY_FORMAT;
            styleBodyCell(c);
        }
        if (row.paidBy) {
            const c = ws.getCell(r, 5);
            c.value = row.paidBy;
            styleBodyCell(c);
        }
        if (row.paidOn) {
            const c = ws.getCell(r, 6);
            c.value = row.paidOn;
            c.numFmt = DATE_FORMAT;
            styleBodyCell(c);
        }
        if (row.whoIsPaying) {
            const c = ws.getCell(r, 7);
            c.value = row.whoIsPaying;
            styleBodyCell(c);
        }
        if (row.confirmedPaid) {
            const c = ws.getCell(r, 8);
            c.value = row.confirmedPaid;
            styleBodyCell(c);
            // Multi-payer breakdowns join lines with `\n` — Excel
            // only renders the wrap when `wrapText` is on.
            c.alignment = { ...(c.alignment ?? {}), wrapText: true };
        }
        r += 1;
    }
    flushGroup(r - 1);

    if (rows.length > 0) {
        ws.autoFilter = {
            from: { row: headerRowIdx, column: 1 },
            to: { row: r - 1, column: HEADER.length },
        };
    }
};

// ── Sheet 3: Expense Report ─────────────────────────────────────────────────

interface ExpenseItemRow {
    date: Date | null;
    dateIso: string;
    item: string;
    total: number;
}

const collectExpenseItems = (trip: TripState): ExpenseItemRow[] => {
    const out: ExpenseItemRow[] = [];
    for (const dest of trip.destinations ?? []) {
        for (const day of dest.itinerary ?? []) {
            const date = parseDate(day.date);
            for (const activity of day.activities ?? []) {
                const budgetItems = (activity.budget ?? []) as BudgetItem[];
                out.push({
                    date,
                    dateIso: day.date,
                    item: activityDisplayName(activity),
                    total: activityCost(activity, budgetItems),
                });
            }
        }
    }
    return out;
};

const buildExpenseSheet = async (
    workbook: EWorkbook,
    trip: TripState,
): Promise<void> => {
    const ws = workbook.addWorksheet('Expense Report');

    ws.columns = [
        { width: 12 }, // Date
        { width: 26 }, // Item / label
        { width: 16 }, // Total
    ];

    // Per the sample, Expense Report has no logo at the top — the
    // section header sits at row 1.
    let r = 1;
    const itemHeaderRow = ws.getRow(r);
    ['Date', 'Item', 'Total'].forEach((label, i) => {
        const c = itemHeaderRow.getCell(i + 1);
        c.value = label;
        styleHeaderCell(c);
    });
    itemHeaderRow.height = 22;
    r += 1;

    // Item rows with date-column merges.
    const items = collectExpenseItems(trip);
    let groupStart = -1;
    let groupDateIso = '';
    const flushGroup = (endRow: number): void => {
        if (groupStart >= 0 && endRow > groupStart) {
            ws.mergeCells(groupStart, 1, endRow, 1);
            ws.getCell(groupStart, 1).alignment = {
                vertical: 'top',
                wrapText: true,
            };
        }
        groupStart = -1;
        groupDateIso = '';
    };

    for (const it of items) {
        if (it.dateIso !== groupDateIso) {
            flushGroup(r - 1);
            groupDateIso = it.dateIso;
            groupStart = r;
            if (it.date) {
                const dateCell = ws.getCell(r, 1);
                dateCell.value = it.date;
                dateCell.numFmt = DATE_FORMAT;
                styleBodyCell(dateCell);
            }
        }
        const itemCell = ws.getCell(r, 2);
        itemCell.value = it.item;
        styleBodyCell(itemCell);
        const totalCell = ws.getCell(r, 3);
        totalCell.value = it.total;
        totalCell.numFmt = CURRENCY_FORMAT;
        styleBodyCell(totalCell);
        r += 1;
    }
    flushGroup(r - 1);

    // Two blank spacer rows between the items table and the Paid By
    // section — matches the sample's visual breathing room.
    r += 2;

    // Paid By / Total sub-header. Col A stays blank — labels go in B,
    // totals in C, matching the sample.
    const paidByHeaderRow = ws.getRow(r);
    const paidByLabelCell = paidByHeaderRow.getCell(2);
    paidByLabelCell.value = 'Paid By';
    styleHeaderCell(paidByLabelCell);
    const paidByTotalCell = paidByHeaderRow.getCell(3);
    paidByTotalCell.value = 'Total';
    styleHeaderCell(paidByTotalCell);
    paidByHeaderRow.height = 22;
    r += 1;

    const { grandTotal, perPayer, unpaidTotal } = computePayerTotals(trip);
    for (const p of perPayer) {
        const nameCell = ws.getCell(r, 2);
        nameCell.value = p.name;
        styleBodyCell(nameCell);
        const totalCell = ws.getCell(r, 3);
        totalCell.value = p.total;
        totalCell.numFmt = CURRENCY_FORMAT;
        styleBodyCell(totalCell);
        r += 1;
    }

    // One blank spacer row before the Subtotal / Grand Total summary
    // — matches the sample.
    r += 1;

    // Subtotal + Grand Total summary. The earlier Budget + Remaining
    // rows were dropped to match the updated sample.
    const writeSummaryRow = (label: string, value: number): void => {
        const labelCell = ws.getCell(r, 2);
        labelCell.value = label;
        styleBoldBodyCell(labelCell);
        const valueCell = ws.getCell(r, 3);
        valueCell.value = value;
        valueCell.numFmt = CURRENCY_FORMAT;
        styleBoldBodyCell(valueCell);
        r += 1;
    };
    writeSummaryRow('Subtotal', grandTotal);
    // Outstanding row — only when there's actually an unpaid
    // balance. Same reasoning as the PDF: a fully-settled trip
    // shouldn't get a noise row of "$0.00 outstanding".
    if (unpaidTotal > 0) {
        writeSummaryRow('Outstanding (unpaid)', unpaidTotal);
    }
    writeSummaryRow('Grand Total', grandTotal);
};

// ── Public entry ────────────────────────────────────────────────────────────

export const exportTripToExcel = async (trip: TripState): Promise<void> => {
    try {
        // Lazy-import — ExcelJS adds ~600KB to the bundle and we
        // only want that cost paid when someone actually clicks
        // Download Excel. Handle both ESM and CJS-interop shapes
        // (Vite resolves `exceljs` to its UMD browser bundle, which
        // depending on bundler config can surface the `Workbook`
        // ctor on the module namespace or under `.default`).
        const mod = await import('exceljs');
        const candidate =
            (mod as { default?: unknown }).default ?? mod;
        const ExcelJS = candidate as { Workbook: new () => EWorkbook };
        if (typeof ExcelJS.Workbook !== 'function') {
            // eslint-disable-next-line no-console
            console.error(
                '[exportTripToExcel] exceljs module did not expose a Workbook constructor. Module shape:',
                Object.keys(mod ?? {}),
            );
            throw new Error(
                'exceljs failed to load — check the browser console for details.',
            );
        }

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'daTryp';
        workbook.created = new Date();

        await buildOverviewSheet(workbook, trip);
        await buildItinerarySheet(workbook, trip);
        await buildExpenseSheet(workbook, trip);

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeFilename(trip.name)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        // Surface a real error to the user — silent failures were
        // making the Download Excel CTA look broken. Caller can
        // still catch this and route to a toast; minimum, the
        // console gets a stack so we can diagnose.
        // eslint-disable-next-line no-console
        console.error('[exportTripToExcel] failed:', err);
        throw err;
    }
};
