import { ACTIVITY_KIND } from 'constants';
import type { FlightInfo, TransitInfo } from 'types';

/** The four real transport kinds AddDestination seeds. (`other` rides are
 *  out of scope for a destination-arrival transport.) */
export type TransportKind =
    | typeof ACTIVITY_KIND.FLIGHT
    | typeof ACTIVITY_KIND.TRAIN
    | typeof ACTIVITY_KIND.BUS
    | typeof ACTIVITY_KIND.RENTAL_CAR;

/** How the destination country on the draft was set, so the async
 *  derivation can prefer the authoritative source: a flight's arrival airport
 *  OVERRIDES a fuzzy text guess, but neither ever overrides an explicit user
 *  pick. `null` = not set yet. */
export type CountrySource = 'airport' | 'text' | 'user' | null;

export interface TransportDraft {
    /** null = no transport chosen yet (or "I'll add later"). */
    kind: TransportKind | null;
    /** Raw smart-box text from the Describe step. For "I'll add later" this
     *  holds the destination-only text the country is resolved from. */
    smartText: string;
    flightSegments: FlightInfo[];
    transitSegments: TransitInfo[];
    cost: string;
}
