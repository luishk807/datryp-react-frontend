import type { TripState } from 'types';
import { ACTIVITY_KIND } from 'constants';

const safeFilename = (name: string | undefined) =>
    (name && name.trim() ? name : 'trip')
        .replace(/[^a-z0-9-_]+/gi, '-')
        .replace(/-+/g, '-')
        .toLowerCase();

const formatStatus = (status: TripState['status']) => {
    if (!status) return '';
    if (typeof status === 'object') return status.name ?? '';
    return String(status);
};

const joinNames = (entries?: { label?: string; name?: string }[]) =>
    (entries ?? [])
        .map((e) => e.label ?? e.name ?? '')
        .filter(Boolean)
        .join(', ');

/** Cell ref helpers — Excel column letters from a 0-based index. */
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

/** Apply a number-format string (e.g. currency) to one column across a
 *  given row range. SheetJS Community honors `z` on individual cells. */
const formatColumn = (
    sheet: Record<string, any>,
    col: number,
    rowStart: number,
    rowEnd: number,
    z: string
) => {
    for (let r = rowStart; r <= rowEnd; r++) {
        const ref = cellRef(col, r);
        const cell = sheet[ref];
        if (cell && cell.v != null) cell.z = z;
    }
};

const CURRENCY_FORMAT = '"$"#,##0.00';

export const exportTripToExcel = async (trip: TripState) => {
    const XLSX = await import('xlsx');

    const wb = XLSX.utils.book_new();

    // ── Overview sheet ──────────────────────────────────────────────────
    const overviewRows: (string | number)[][] = [
        [trip.name?.trim() || 'Trip overview'],
        [], // visual separator
        ['Type', trip.type?.name ?? ''],
        ['Status', formatStatus(trip.status)],
        ['Start date', trip.startDate ?? ''],
        ['End date', trip.endDate ?? ''],
        ['Budget', typeof trip.budget === 'number' ? trip.budget : trip.budget ?? ''],
        ['Organizer', joinNames(trip.organizer)],
        ['Friends', joinNames(trip.friends)],
    ];
    if (trip.note) overviewRows.push(['Notes', trip.note]);
    const overviewSheet = XLSX.utils.aoa_to_sheet(overviewRows);
    overviewSheet['!cols'] = [{ wch: 16 }, { wch: 60 }];
    overviewSheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    ];
    // Currency on the Budget row (row 6 = index 6 in the AOA, column B = 1).
    formatColumn(overviewSheet, 1, 6, 6, CURRENCY_FORMAT);
    XLSX.utils.book_append_sheet(wb, overviewSheet, 'Overview');

    // ── Itinerary sheet ─────────────────────────────────────────────────
    const itineraryHeader = [
        'Date',
        'Country',
        'Kind',
        'Activity',
        'Location / Route',
        'Flight #',
        'Start',
        'End',
        'Cost',
        'Notes',
    ];
    const itineraryRows: (string | number)[][] = [
        [trip.name?.trim() ? `${trip.name} — Itinerary` : 'Itinerary'],
        [],
        itineraryHeader,
    ];

    const flightRouteOf = (a: { flightSegments?: { departAirport?: string; arrivalAirport?: string }[] }) => {
        const segs = a.flightSegments ?? [];
        if (!segs.length) return '';
        const chain = [
            segs[0]?.departAirport ?? '',
            ...segs.map((s) => s.arrivalAirport ?? ''),
        ];
        return chain.filter(Boolean).join(' → ');
    };
    const flightNumbersOf = (a: { flightSegments?: { flightNumber?: string }[] }) =>
        (a.flightSegments ?? [])
            .map((s) => s.flightNumber ?? '')
            .filter(Boolean)
            .join(' · ');

    for (const dest of trip.destinations ?? []) {
        const country = dest.country?.name ?? '';
        for (const day of dest.itinerary ?? []) {
            const activities = day.activities ?? [];
            if (activities.length === 0) {
                itineraryRows.push([day.date ?? '', country, '', '', '', '', '', '', '', '']);
                continue;
            }
            for (const a of activities) {
                const kind = a.kind ?? ACTIVITY_KIND.PLACE;
                const isFlight = kind === ACTIVITY_KIND.FLIGHT;
                itineraryRows.push([
                    day.date ?? '',
                    country,
                    kind,
                    a.name ?? a.place ?? '',
                    isFlight ? flightRouteOf(a) : a.location ?? '',
                    isFlight ? flightNumbersOf(a) : '',
                    a.startTime ?? '',
                    a.endTime ?? '',
                    typeof a.cost === 'number' ? a.cost : a.cost ?? '',
                    a.note ?? '',
                ]);
            }
        }
    }

    // Totals row — SUM of the Cost column over the data range.
    const headerRowIdx = 2; // 0-based, after title + blank
    const dataStartRow = headerRowIdx + 1;
    const dataEndRow = itineraryRows.length - 1;
    if (dataEndRow >= dataStartRow) {
        const costCol = itineraryHeader.indexOf('Cost'); // 0-based
        itineraryRows.push([
            '', '', '', '', '', '', '', 'Total',
            { f: `SUM(${cellRef(costCol, dataStartRow)}:${cellRef(costCol, dataEndRow)})` } as unknown as number,
            '',
        ]);
    }

    const itinerarySheet = XLSX.utils.aoa_to_sheet(itineraryRows);
    itinerarySheet['!cols'] = [
        { wch: 12 }, // Date
        { wch: 16 }, // Country
        { wch: 8 },  // Kind
        { wch: 28 }, // Activity
        { wch: 28 }, // Location / Route
        { wch: 14 }, // Flight #
        { wch: 8 },  // Start
        { wch: 8 },  // End
        { wch: 12 }, // Cost
        { wch: 30 }, // Notes
    ];
    itinerarySheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: itineraryHeader.length - 1 } },
    ];
    // Freeze the header row (everything above row 3 / 0-indexed 3 stays).
    itinerarySheet['!freeze'] = { xSplit: 0, ySplit: dataStartRow };
    // AutoFilter over the header + data range (sheet-ref form for SheetJS).
    itinerarySheet['!autofilter'] = {
        ref: `${cellRef(0, headerRowIdx)}:${cellRef(itineraryHeader.length - 1, Math.max(dataEndRow, dataStartRow))}`,
    };
    // Currency on Cost column for every data row + the totals row.
    const costCol = itineraryHeader.indexOf('Cost');
    formatColumn(
        itinerarySheet,
        costCol,
        dataStartRow,
        Math.max(dataEndRow + 1, dataStartRow),
        CURRENCY_FORMAT
    );
    XLSX.utils.book_append_sheet(wb, itinerarySheet, 'Itinerary');

    // ── Budget sheet ────────────────────────────────────────────────────
    const budgetHeader = ['Activity', 'Date', 'Country', 'Payer', 'Amount'];
    const budgetRows: (string | number)[][] = [
        [trip.name?.trim() ? `${trip.name} — Budget split` : 'Budget split'],
        [],
        budgetHeader,
    ];
    for (const dest of trip.destinations ?? []) {
        const country = dest.country?.name ?? '';
        for (const day of dest.itinerary ?? []) {
            for (const a of day.activities ?? []) {
                if (!a.budget?.length) continue;
                for (const b of a.budget) {
                    budgetRows.push([
                        a.name ?? a.place ?? '',
                        day.date ?? '',
                        country,
                        b.user?.label ?? b.user?.name ?? '',
                        typeof b.budget === 'number' ? b.budget : b.budget ?? '',
                    ]);
                }
            }
        }
    }
    if (budgetRows.length > 3) {
        const budgetDataStart = 3;
        const budgetDataEnd = budgetRows.length - 1;
        budgetRows.push([
            '', '', '', 'Total',
            { f: `SUM(${cellRef(4, budgetDataStart)}:${cellRef(4, budgetDataEnd)})` } as unknown as number,
        ]);
        const budgetSheet = XLSX.utils.aoa_to_sheet(budgetRows);
        budgetSheet['!cols'] = [
            { wch: 28 },
            { wch: 12 },
            { wch: 16 },
            { wch: 22 },
            { wch: 14 },
        ];
        budgetSheet['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: budgetHeader.length - 1 } },
        ];
        budgetSheet['!freeze'] = { xSplit: 0, ySplit: budgetDataStart };
        budgetSheet['!autofilter'] = {
            ref: `${cellRef(0, 2)}:${cellRef(budgetHeader.length - 1, budgetDataEnd)}`,
        };
        // Currency on Amount column (col index 4) for data + totals row.
        formatColumn(
            budgetSheet,
            4,
            budgetDataStart,
            budgetDataEnd + 1,
            CURRENCY_FORMAT
        );
        XLSX.utils.book_append_sheet(wb, budgetSheet, 'Budget');
    }

    XLSX.writeFile(wb, `${safeFilename(trip.name)}.xlsx`);
};
