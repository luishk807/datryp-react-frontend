/**
 * Typed error for the free-tier paywall hit on `saveItinerary`. Thrown by
 * `useSaveItinerary` when the GraphQL response carries a
 * `TRIP_CAP_REACHED` extension. UI consumes this to render the paywall
 * modal instead of a generic save-failed toast.
 */

export class TripCapReachedError extends Error {
    readonly currentCount: number;
    readonly cap: number;
    readonly blocked = true as const;

    constructor({
        currentCount,
        cap,
        message,
    }: {
        currentCount: number;
        cap: number;
        message?: string;
    }) {
        super(message ?? `Trip limit reached (${currentCount}/${cap}).`);
        this.name = 'TripCapReachedError';
        this.currentCount = currentCount;
        this.cap = cap;
    }
}

export const isTripCapReachedError = (
    err: unknown
): err is TripCapReachedError => err instanceof TripCapReachedError;
