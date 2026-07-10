import type { TripExportEmailResult } from 'api/tripExportApi';

/** Reach summary after the itinerary was emailed to every trip member
 *  (typed as the FE's own interface). */
export const tripExportResultFixture: TripExportEmailResult = {
    recipients: 3,
    emails: 3,
};
