/** Wire-shape fixture for `POST /me/trip-complete-ai/{tripId}` success. The raw
 *  snake_case type isn't exported from the module, so we pin the wire shape
 *  locally here. */
export interface CompleteTripWithAiWire {
    itinerary_id: string;
    added_count: number;
}

export const completeTripWithAiFixture: CompleteTripWithAiWire = {
    itinerary_id: 'itin-abc123',
    added_count: 7,
};
