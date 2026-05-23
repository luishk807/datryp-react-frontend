/**
 * `exportTripToPdf(trip)` — generates a branded two-page PDF of the
 * trip itinerary + expense report and triggers a download.
 *
 * `printTripPdf(trip)` — same document, but opens the browser print
 * dialog so the user can send it to a printer (or save as PDF from
 * within that dialog). Both call sites in the share modal go through
 * one of these so Download PDF and Print produce IDENTICAL output —
 * there's no longer a separate CSS-driven `@media print` path that
 * could drift from the PDF layout.
 *
 * Layout follows the daTryp print mockup:
 *   Page 1 — Itinerary
 *     - Logo (top-left) + meta block (top-right): From / To / Country
 *       / Budget / Status
 *     - Organizer name(s)
 *     - Trip name
 *     - 4-column table: Date | Time | Activity | Budget, with the
 *       Date column row-spanned across activities sharing a day
 *   Page 2 — Expense Report
 *     - Logo (top-left) + generation date (top-right)
 *     - Date / Item / Total table (per-activity)
 *     - Paid By / Total table (per-payer)
 *     - Subtotal / Grand Total summary
 *
 * pdfmake is heavy (~400KB) so we lazy-import it at call time. The
 * caller's existing "Download" CTA stays snappy because the bundle
 * isn't paid for until someone actually clicks Download PDF or Print.
 */
import type {
    Content,
    TableCell,
    TDocumentDefinitions,
} from 'pdfmake/interfaces';

import logoSvgRaw from 'assets/logo.svg?raw';
import type { ItineraryRow } from 'utils/tripExportShared';
import {
    activityDisplayName,
    activityLocation,
    collapseWs,
    computePayerTotals,
    formatCurrency,
    formatDate,
    formatTimeRange,
    joinNames,
    safeFilename,
    tripBudgetTotal,
    walkItinerary,
} from 'utils/tripExportShared';
import { TRIP_STATUS } from 'constants';
import type { TripState } from 'types';

/** The logo SVG ships with Adobe Illustrator's CSS-class fills
 *  (`<style>.st0 { fill: #3EB549 }</style>`). pdfmake's SVG renderer
 *  (svg-to-pdfkit underneath) ignores embedded stylesheets and falls
 *  back to black for every path, so the colored Daтryp wordmark
 *  comes out as a solid black smear. Pre-process the SVG once at
 *  module load: strip the `<style>` block and inline the class →
 *  fill mapping directly onto each `<path class="...">` so PDFKit
 *  reads them via the standard `fill="..."` attribute path. */
const CLASS_FILL: Record<string, string> = {
    st0: '#3EB549', // brand green
    st1: '#F6891F', // brand orange
    st2: '#F7C61A', // brand yellow
    st3: '#F6891F', // hidden orange variant — set display:none below
};

const inlineSvgFills = (svg: string): string =>
    svg
        // Drop the embedded <style>…</style> block; we're replacing the
        // class selectors with attribute-level fills below.
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        // For each known class, convert `class="stX"` into a `fill="…"`
        // attribute on the same element so PDFKit picks it up directly.
        // `st3` was the hidden variant — fold its `display:none` in too.
        .replace(/class="([^"]*)"/g, (_match, classes: string) => {
            const list = classes.split(/\s+/).filter(Boolean);
            const attrs: string[] = [];
            for (const cls of list) {
                const fill = CLASS_FILL[cls];
                if (fill) {
                    attrs.push(`fill="${fill}"`);
                    if (cls === 'st3') attrs.push('display="none"');
                }
            }
            return attrs.join(' ');
        });

const LOGO_SVG = inlineSvgFills(logoSvgRaw);

const COLORS = {
    headerBg: '#000000',
    headerText: '#ffffff',
    cellBorder: '#cccccc',
    muted: '#666666',
    primary: '#1a1a1a',
};

/** Date the report was generated. Top-right of page 2. */
const formatToday = (): string =>
    new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });

const tripStatusLabel = (trip: TripState): string => {
    const status = trip.status;
    if (status && typeof status === 'object' && status.name) {
        return status.name;
    }
    return TRIP_STATUS.PLANNING;
};

const tripCountries = (trip: TripState): string =>
    (trip.destinations ?? [])
        .map((d) => d.country?.name)
        .filter((n): n is string => Boolean(n))
        .join(', ');

/** Right-aligned label/value meta block on page 1. Mirrors the
 *  mockup's "From / To / Country / Budget / Status" stack.
 *
 *  Pinned to the far right of the page via a `columns: [spacer, table]`
 *  layout. pdfmake's `alignment: 'right'` on a table only right-aligns
 *  cell text inside the table — it does NOT position the table within
 *  its container. To actually move the table flush with the right
 *  margin we put it in a 2-column flex layout: a `width: '*'` spacer
 *  swallows the remaining width on the left, and the table sits with
 *  `width: 'auto'` on the right. */
const buildMetaBlock = (trip: TripState): Content => {
    const rows: [string, string][] = [
        ['From:', formatDate(trip.startDate)],
        ['To:', formatDate(trip.endDate)],
        ['Country:', tripCountries(trip) || '—'],
        ['Budget:', formatCurrency(tripBudgetTotal(trip))],
        ['Status:', tripStatusLabel(trip)],
    ];
    return {
        columns: [
            { text: '', width: '*' },
            {
                width: 'auto',
                table: {
                    widths: ['auto', 'auto'],
                    body: rows.map(([label, value]) => [
                        {
                            text: label,
                            bold: true,
                            alignment: 'right',
                            color: COLORS.primary,
                        },
                        {
                            text: value,
                            alignment: 'right',
                            color: COLORS.primary,
                        },
                    ]),
                },
                layout: 'noBorders',
            },
        ],
    };
};

/** Activity cell — just the activity name (bold) + the location /
 *  flight number line. Notes are rendered as a follow-up row spanning
 *  the Activity column only. Matches the mockup's compact layout.
 *  Per-activity participants are no longer shown in the itinerary
 *  table; the full participant list lives in the header block at the
 *  top of the page. */
const buildActivityCell = (row: ItineraryRow): TableCell => {
    const stack: Content[] = [];
    stack.push({
        text: activityDisplayName(row.activity),
        bold: true,
    });
    const loc = activityLocation(row.activity);
    if (loc) stack.push({ text: loc });
    return { stack };
};

/** Total cost of the activity. Prefer the per-row sum of budget splits
 *  (matches what the user actually allocated); fall back to
 *  `activity.cost` only when no split exists. Renders blank for zero. */
const buildCostCell = (row: ItineraryRow): TableCell => ({
    text: row.rowTotal > 0 ? formatCurrency(row.rowTotal) : '',
});

/** "John doe: $50.00, Luis: $50.00" breakdown of the split. Blank when
 *  the activity has no per-payer budget items attached. */
const buildPaidByCell = (row: ItineraryRow): TableCell => {
    if (!row.budgetItems.length) return { text: '' };
    const parts = row.budgetItems.map((b) => {
        const name = b.user?.label ?? b.user?.name ?? '(unknown)';
        const amt =
            typeof b.budget === 'number' ? b.budget : Number(b.budget) || 0;
        return `${name}: ${formatCurrency(amt)}`;
    });
    return { text: parts.join(', ') };
};

/** Build the 4-column itinerary table. Date column is rowSpanned
 *  across activities sharing the same calendar day so the visual
 *  matches the mockup. */
const buildItineraryTable = (rows: ItineraryRow[]): Content => {
    const tableBody: TableCell[][] = [];
    // Header
    const HEADERS = ['Date', 'Time', 'Activity', 'Cost', 'Paid By'];
    tableBody.push(
        HEADERS.map((label) => ({
            text: label,
            bold: true,
            color: COLORS.headerText,
            fillColor: COLORS.headerBg,
        })),
    );

    // Group rows by date so we can rowSpan the Date column. Each
    // activity is one row; if it has a note, we insert an extra row
    // directly below carrying just the Note text in the Activity
    // column — matches the mockup. The Date rowSpan has to include
    // those note rows so the date cell still aligns visually.
    let cursor = 0;
    while (cursor < rows.length) {
        const date = rows[cursor].dateIso;
        let end = cursor + 1;
        while (end < rows.length && rows[end].dateIso === date) end += 1;
        const dayRows = rows.slice(cursor, end);

        // Total physical rows the date cell needs to span: one per
        // activity + one extra per activity that has a note.
        const physicalRowCount = dayRows.reduce(
            (acc, r) => acc + 1 + (collapseWs(r.activity.note) ? 1 : 0),
            0,
        );

        let isFirstOfDay = true;
        for (const r of dayRows) {
            const dateCell: TableCell = isFirstOfDay
                ? {
                      text: r.date,
                      rowSpan: physicalRowCount,
                      margin: [0, 2, 0, 0],
                  }
                : { text: '' };
            isFirstOfDay = false;

            tableBody.push([
                dateCell,
                { text: formatTimeRange(r.activity.startTime, r.activity.endTime) },
                buildActivityCell(r),
                buildCostCell(r),
                buildPaidByCell(r),
            ]);

            const note = collapseWs(r.activity.note);
            if (note) {
                tableBody.push([
                    { text: '' }, // date — covered by rowSpan from above
                    { text: '' }, // time
                    {
                        text: `Note: ${note}`,
                        italics: true,
                        color: COLORS.muted,
                    },
                    { text: '' }, // cost
                    { text: '' }, // paid by
                ]);
            }
        }
        cursor = end;
    }

    return {
        table: {
            headerRows: 1,
            // Date/Time/Cost compact; Activity/Paid By get the flex
            // space.
            widths: ['auto', 'auto', '*', 'auto', '*'],
            body: tableBody,
            dontBreakRows: true,
        },
        layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => COLORS.cellBorder,
            vLineColor: () => COLORS.cellBorder,
            paddingLeft: () => 6,
            paddingRight: () => 6,
            paddingTop: () => 4,
            paddingBottom: () => 4,
        },
    };
};

/** Page 2: "Date / Item / Total" table — one row per activity that
 *  has a non-zero row total. */
const buildExpenseItemTable = (rows: ItineraryRow[]): Content => {
    const body: TableCell[][] = [
        [
            {
                text: 'Date',
                bold: true,
                color: COLORS.headerText,
                fillColor: COLORS.headerBg,
            },
            {
                text: 'Item',
                bold: true,
                color: COLORS.headerText,
                fillColor: COLORS.headerBg,
            },
            {
                text: 'Total',
                bold: true,
                color: COLORS.headerText,
                fillColor: COLORS.headerBg,
            },
        ],
    ];

    let cursor = 0;
    while (cursor < rows.length) {
        const date = rows[cursor].dateIso;
        let end = cursor + 1;
        while (end < rows.length && rows[end].dateIso === date) end += 1;
        const groupSize = end - cursor;

        for (let i = cursor; i < end; i += 1) {
            const row = rows[i];
            const dateCell: TableCell =
                i === cursor
                    ? { text: row.date, rowSpan: groupSize }
                    : { text: '' };
            body.push([
                dateCell,
                { text: activityDisplayName(row.activity) },
                { text: formatCurrency(row.rowTotal), alignment: 'right' },
            ]);
        }
        cursor = end;
    }

    return {
        table: {
            headerRows: 1,
            widths: ['auto', '*', 'auto'],
            body,
            dontBreakRows: true,
        },
        layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => COLORS.cellBorder,
            vLineColor: () => COLORS.cellBorder,
            paddingLeft: () => 6,
            paddingRight: () => 6,
            paddingTop: () => 4,
            paddingBottom: () => 4,
        },
    };
};

/** Page 2: "Paid By / Total" table — per-payer totals only. Cells are
 *  right-aligned per the mockup. (The earlier "Remaining" row was
 *  dropped — the Subtotal / Grand Total table below already conveys
 *  the spend-vs-budget gap.) */
const buildPayerTable = (trip: TripState): Content => {
    const { perPayer } = computePayerTotals(trip);

    const body: TableCell[][] = [
        [
            {
                text: 'Paid By',
                bold: true,
                color: COLORS.headerText,
                fillColor: COLORS.headerBg,
                alignment: 'right',
            },
            {
                text: 'Total',
                bold: true,
                color: COLORS.headerText,
                fillColor: COLORS.headerBg,
                alignment: 'right',
            },
        ],
    ];

    perPayer.forEach((p) => {
        body.push([
            { text: p.name, alignment: 'right' },
            { text: formatCurrency(p.total), alignment: 'right' },
        ]);
    });

    return {
        table: {
            headerRows: 1,
            widths: ['*', 'auto'],
            body,
        },
        layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => COLORS.cellBorder,
            vLineColor: () => COLORS.cellBorder,
            paddingLeft: () => 6,
            paddingRight: () => 6,
            paddingTop: () => 4,
            paddingBottom: () => 4,
        },
        margin: [0, 14, 0, 0],
    };
};

const buildTotalsTable = (rows: ItineraryRow[]): Content => {
    const subtotal = rows.reduce((acc, r) => acc + r.rowTotal, 0);
    return {
        table: {
            widths: ['*', 'auto'],
            body: [
                [
                    { text: 'Subtotal', alignment: 'right' },
                    {
                        text: formatCurrency(subtotal),
                        alignment: 'right',
                    },
                ],
                [
                    { text: 'Grand Total', alignment: 'right', bold: true },
                    {
                        text: formatCurrency(subtotal),
                        alignment: 'right',
                        bold: true,
                    },
                ],
            ],
        },
        layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => COLORS.cellBorder,
            vLineColor: () => COLORS.cellBorder,
            paddingLeft: () => 6,
            paddingRight: () => 6,
            paddingTop: () => 4,
            paddingBottom: () => 4,
        },
        margin: [0, 14, 0, 0],
    };
};

/** Top-of-page header row used on both pages. `right` slot differs
 *  (meta block vs. generation date) so we accept it as a Content. */
const buildPageHeader = (right: Content): Content => ({
    columns: [
        // Brand logo, pre-inlined fills (see `inlineSvgFills` above)
        // so pdfmake's SVG renderer reads the colors correctly without
        // honoring `<style>` blocks.
        {
            svg: LOGO_SVG,
            width: 110,
            // Aspect ratio comes from the viewBox (526 × 319.3 → ~1.65),
            // so 110px wide ≈ 67px tall — slots nicely beside the
            // meta block / date stamp without dwarfing them.
        },
        right,
    ],
    columnGap: 20,
});

/** Build the pdfmake doc definition for `trip`. Pure data → doc
 *  transformation, no side effects, so both the download and the
 *  print path render identical output. */
const buildTripDocDefinition = (trip: TripState): TDocumentDefinitions => {
    const rows = walkItinerary(trip);
    const organizers = joinNames(trip.organizer) || '—';
    const participants = joinNames(trip.friends) || '—';
    const tripName = collapseWs(trip.name) || 'My Trip';

    return {
        pageSize: 'A4',
        pageMargins: [40, 40, 40, 40],
        defaultStyle: {
            fontSize: 9,
            color: COLORS.primary,
        },
        content: [
            // ── Page 1: Itinerary ────────────────────────────────────
            buildPageHeader(buildMetaBlock(trip)),
            {
                text: 'Organizer:',
                bold: true,
                margin: [0, 18, 0, 2],
            },
            { text: organizers, margin: [0, 0, 0, 8] },
            {
                text: 'Participants:',
                bold: true,
                margin: [0, 0, 0, 2],
            },
            { text: participants, margin: [0, 0, 0, 16] },
            {
                text: [
                    { text: 'Name: ', bold: true },
                    tripName,
                ],
                fontSize: 14,
                margin: [0, 0, 0, 12],
            },
            buildItineraryTable(rows),

            // ── Page 2: Expense Report ───────────────────────────────
            {
                text: '',
                pageBreak: 'after',
            },
            buildPageHeader({
                text: [
                    { text: 'Date', bold: true },
                    `: ${formatToday()}`,
                ],
                alignment: 'right',
                margin: [0, 6, 0, 0],
            }),
            {
                text: 'Expense Report',
                fontSize: 16,
                bold: true,
                margin: [0, 18, 0, 12],
            },
            buildExpenseItemTable(rows),
            buildPayerTable(trip),
            buildTotalsTable(rows),
        ],
    };
};

/** Resolve pdfmake's runtime export — bundler-config dependent, can
 *  surface as a default export or as the namespace itself. */
interface PdfDocHandle {
    download: (filename?: string) => void;
    print: () => void;
    open: () => void;
}
interface PdfMakeRuntime {
    createPdf: (def: TDocumentDefinitions) => PdfDocHandle;
}
const loadPdfMake = async (): Promise<PdfMakeRuntime> => {
    // Lazy-import — pdfmake adds ~400KB compressed to the bundle, only
    // worth paying when the user actually clicks Download PDF or Print.
    const pdfMakeModule = await import('pdfmake/build/pdfmake');
    // The vfs_fonts side-effect import attaches Roboto into
    // pdfmake.vfs via `pdfMake.addVirtualFileSystem(vfs)`. Without
    // it, createPdf throws "File 'Roboto-Regular.ttf' not found in
    // virtual file system".
    await import('pdfmake/build/vfs_fonts');
    const maybeDefault = (pdfMakeModule as { default?: unknown }).default;
    return (maybeDefault ?? pdfMakeModule) as PdfMakeRuntime;
};

export const exportTripToPdf = async (trip: TripState): Promise<void> => {
    const pdfMake = await loadPdfMake();
    pdfMake
        .createPdf(buildTripDocDefinition(trip))
        .download(`${safeFilename(trip.name)}.pdf`);
};

/** Same document as `exportTripToPdf`, but routed to the browser's
 *  print dialog instead of a file download. Used by the share modal's
 *  "Print" option so Print and Download PDF produce IDENTICAL output —
 *  there's no separate CSS-driven `@media print` path that could
 *  drift from the PDF layout over time. */
export const printTripPdf = async (trip: TripState): Promise<void> => {
    const pdfMake = await loadPdfMake();
    pdfMake.createPdf(buildTripDocDefinition(trip)).print();
};
