/**
 * Blend an activity's available ratings — Google, OpenAI/recommender, and
 * daTryp traveler reviews — into a single star value for the card.
 *
 * Equal weight across whichever sources actually have a rating: a place
 * with all three averages them; a place with only Google shows Google.
 * `totalCount` sums the REAL review counts (Google + daTryp); the OpenAI
 * rating is a model estimate with no count, so it lifts the average but
 * adds nothing to the volume shown next to the stars.
 */
export interface RatingSourceInput {
    rating?: number | null;
    /** Real review count backing this rating. OpenAI has none. */
    count?: number | null;
}

export interface BlendedRating {
    /** Equal-weight mean of the contributing sources, 0-5. */
    average: number;
    /** Sum of real review counts across contributing sources. */
    totalCount: number;
    /** How many sources contributed (1-3). */
    sourceCount: number;
}

export const blendRatings = (
    sources: RatingSourceInput[],
): BlendedRating | null => {
    const valid = sources.filter(
        (s): s is { rating: number; count?: number | null } =>
            s.rating != null && s.rating > 0,
    );
    if (valid.length === 0) return null;
    const sum = valid.reduce((acc, s) => acc + s.rating, 0);
    const totalCount = valid.reduce((acc, s) => acc + (s.count ?? 0), 0);
    return {
        average: sum / valid.length,
        totalCount,
        sourceCount: valid.length,
    };
};
