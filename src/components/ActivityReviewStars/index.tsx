import { useRef } from "react";
import ModalButton, { type ModalButtonHandle } from "components/ModalButton";
import ReviewSection from "components/Review/ReviewSection";
import Stars from "components/common/Stars";
import { usePlaceReviews } from "api/hooks/useReviews";
import { getPlaceKey } from "utils/placeKey";
import { blendRatings } from "utils/blendedRating";
import "./index.scss";

export interface ActivityReviewStarsProps {
    placeName: string;
    placeCity: string;
    placeCountry: string;
    /** Backend-stored slug when present — keeps the key identical to the
     *  place detail page so the rating + comments are the same data. */
    placeKey?: string | null;
    /** Persisted Google Places rating snapshot for the place. */
    googleRating?: number | null;
    googleRatingCount?: number | null;
    /** Persisted OpenAI/recommender "overall rating" snapshot. */
    openaiRating?: number | null;
}

/** One consolidated rating for the activity, shown right under the title:
 *  a single blended star value across whichever of the three sources have
 *  data — Google, OpenAI/recommender, and daTryp traveler reviews. Clicking
 *  opens the reviews window, where the three are broken out separately
 *  above the comments. Falls back to a "Rate this place" prompt when no
 *  source has a rating yet. */
const ActivityReviewStars = ({
    placeName,
    placeCity,
    placeCountry,
    placeKey,
    googleRating,
    googleRatingCount,
    openaiRating,
}: ActivityReviewStarsProps) => {
    const key = placeKey || getPlaceKey(placeName, placeCity, placeCountry);
    const modalRef = useRef<ModalButtonHandle>(null);
    const { data } = usePlaceReviews(key);
    const travelerAverage = data?.averageRating ?? null;
    const travelerTotal = data?.total ?? 0;

    // Equal-weight blend across whichever sources have a rating. Real
    // review counts (Google + traveler) feed the "(N)" beside the stars;
    // the OpenAI estimate lifts the average but carries no count.
    const blended = blendRatings([
        { rating: googleRating, count: googleRatingCount },
        { rating: openaiRating },
        { rating: travelerAverage, count: travelerTotal },
    ]);

    return (
        <>
            <button
                type="button"
                className="activity-review-stars"
                onClick={() => modalRef.current?.openModel()}
                aria-label={
                    blended
                        ? `${blended.average.toFixed(1)} out of 5` +
                          (blended.totalCount > 0
                              ? ` from ${blended.totalCount} review${
                                    blended.totalCount === 1 ? "" : "s"
                                }`
                              : "") +
                          " — open ratings & reviews"
                        : `Rate ${placeName}`
                }
                title={blended ? "View ratings & reviews" : "Be the first to review"}
            >
                {blended ? (
                    <>
                        <Stars rating={blended.average} />
                        {blended.totalCount > 0 && (
                            <span className="activity-review-count">
                                ({blended.totalCount})
                            </span>
                        )}
                    </>
                ) : (
                    <>
                        <Stars rating={0} showValue={false} />
                        <span className="activity-review-rate">
                            Rate this place
                        </span>
                    </>
                )}
            </button>
            <ModalButton ref={modalRef} title={placeName} buttonProps={null}>
                <ReviewSection
                    placeName={placeName}
                    placeCity={placeCity}
                    placeCountry={placeCountry}
                    googleRating={googleRating}
                    googleRatingCount={googleRatingCount}
                    openaiRating={openaiRating}
                />
            </ModalButton>
        </>
    );
};

export default ActivityReviewStars;
