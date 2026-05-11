import type { TripState } from 'types';

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

export const exportTripToExcel = async (trip: TripState) => {
    const XLSX = await import('xlsx');

    const wb = XLSX.utils.book_new();

    const overviewRows: (string | number)[][] = [
        ['Trip', trip.name ?? ''],
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
    overviewSheet['!cols'] = [{ wch: 14 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, overviewSheet, 'Overview');

    const itineraryHeader = [
        'Date',
        'Country',
        'Activity',
        'Location',
        'Start',
        'End',
        'Cost',
        'Notes',
    ];
    const itineraryRows: (string | number)[][] = [itineraryHeader];

    for (const dest of trip.destinations ?? []) {
        const country = dest.country?.name ?? '';
        for (const day of dest.itinerary ?? []) {
            const activities = day.activities ?? [];
            if (activities.length === 0) {
                itineraryRows.push([day.date ?? '', country, '', '', '', '', '', '']);
                continue;
            }
            for (const a of activities) {
                itineraryRows.push([
                    day.date ?? '',
                    country,
                    a.name ?? a.place ?? '',
                    a.location ?? '',
                    a.startTime ?? '',
                    a.endTime ?? '',
                    typeof a.cost === 'number' ? a.cost : a.cost ?? '',
                    a.note ?? '',
                ]);
            }
        }
    }
    const itinerarySheet = XLSX.utils.aoa_to_sheet(itineraryRows);
    itinerarySheet['!cols'] = [
        { wch: 12 },
        { wch: 16 },
        { wch: 28 },
        { wch: 24 },
        { wch: 8 },
        { wch: 8 },
        { wch: 10 },
        { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, itinerarySheet, 'Itinerary');

    const budgetRows: (string | number)[][] = [
        ['Activity', 'Date', 'Country', 'Payer', 'Amount'],
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
    if (budgetRows.length > 1) {
        const budgetSheet = XLSX.utils.aoa_to_sheet(budgetRows);
        budgetSheet['!cols'] = [
            { wch: 28 },
            { wch: 12 },
            { wch: 16 },
            { wch: 20 },
            { wch: 10 },
        ];
        XLSX.utils.book_append_sheet(wb, budgetSheet, 'Budget');
    }

    XLSX.writeFile(wb, `${safeFilename(trip.name)}.xlsx`);
};
