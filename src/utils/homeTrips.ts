/**
 * Shared derivations for the mobile home dashboard's trip modules.
 *
 * `selectInProgressTrips` is the single source of truth for "which of the
 * user's trips are in progress, and in what order" — the Continue-planning
 * hero takes index 0, the Upcoming-trips list takes the rest, so the same
 * trip never appears in both. Both modules call `useMyItineraries` (React
 * Query dedupes the request) and run this selector, so the split stays
 * consistent without threading props through the Home page.
 *
 * Imports `apiToTripEntry` directly (not via the `utils` barrel) to avoid a
 * circular import — the adapter itself imports from `utils`.
 */
import { apiToTripEntry } from 'utils/itineraryAdapter';
import { formatDate, isValidDate } from 'utils/date';
import { TRIP_STATUS } from 'constants';
import type { ApiItinerary } from 'api/hooks/useItineraries';
import type { TripBoxData } from 'components/common/TripBox';
import type { MultipleDestinations, SingleDestination } from 'types';

export type HomeTripEntry = TripBoxData & { apiId: string };

/** Only Planning + Confirmed count as "in progress"; Planning sorts first
 *  because those are the trips a user is actively still building. */
const IN_PROGRESS_RANK: Record<string, number> = {
    [TRIP_STATUS.PLANNING.toLowerCase()]: 0,
    [TRIP_STATUS.CONFIRMED.toLowerCase()]: 1,
};

const startTime = (t: HomeTripEntry): number => {
    const ts = Date.parse(t.startDate ?? '');
    return Number.isNaN(ts) ? Infinity : ts;
};

export const selectInProgressTrips = (
    itins: ApiItinerary[] | undefined
): HomeTripEntry[] => {
    if (!itins?.length) return [];
    return itins
        .map((it) => apiToTripEntry(it) as HomeTripEntry)
        .filter((t) => t.status.name.toLowerCase() in IN_PROGRESS_RANK)
        .sort((a, b) => {
            const byStatus =
                IN_PROGRESS_RANK[a.status.name.toLowerCase()] -
                IN_PROGRESS_RANK[b.status.name.toLowerCase()];
            if (byStatus !== 0) return byStatus;
            // Soonest start first within a status group; dateless trips sink.
            return startTime(a) - startTime(b);
        });
};

const isSingle = (t: TripBoxData): t is SingleDestination =>
    (t as SingleDestination).country !== undefined;

/** Destination country for the card's flag + subtitle — the single trip's
 *  country, or the first leg of a multi-destination trip. */
export const tripPrimaryCountry = (
    t: TripBoxData
): { name?: string; code?: string } => {
    const country = isSingle(t)
        ? t.country
        : (t as MultipleDestinations).intenaryDates?.[0]?.country;
    return { name: country?.name || undefined, code: country?.code || undefined };
};

/** Compact "Mar 3 – Mar 9, 2026" range for the trip rows. Empty when the
 *  dates are missing/unparseable so the caller can drop the line. */
export const formatTripDateRange = (start: string, end: string): string => {
    if (!isValidDate(start) || !isValidDate(end)) return '';
    if (formatDate(start, 'YYYY') === formatDate(end, 'YYYY')) {
        return `${formatDate(start, 'MMM D')} – ${formatDate(end, 'MMM D, YYYY')}`;
    }
    return `${formatDate(start, 'MMM D, YYYY')} – ${formatDate(end, 'MMM D, YYYY')}`;
};
