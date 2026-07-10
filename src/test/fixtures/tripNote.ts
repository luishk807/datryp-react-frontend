import type { TripNote } from 'api/tripNoteApi';

/** A well-formed recap note (typed as the FE's own interface so the fixture
 *  can't silently drift from `TripNote`). */
export const tripNoteFixture: TripNote = {
    note: 'We had a blast in Tokyo — the food markets were the highlight.',
};

/** Cleared note — the backend echoes `null` back after an empty save. */
export const tripNoteNullFixture: TripNote = {
    note: null,
};
