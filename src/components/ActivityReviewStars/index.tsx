import { useRef } from "react";
import ModalButton, { type ModalButtonHandle } from "components/ModalButton";
import ReviewSection from "components/Review/ReviewSection";
import Stars from "components/common/Stars";
import { usePlaceReviews } from "api/hooks/useReviews";
import { getPlaceKey } from "utils/placeKey";
import "./index.scss";

export interface ActivityReviewStarsProps {
    placeName: string;
    placeCity: string;
    placeCountry: string;
    /** Backend-stored slug when present — keeps the key identical to the
     *  place detail page so the rating + comments are the same data. */
    placeKey?: string | null;
}

/** The place's traveler-review rating, shown right under the activity title.
 *  Clicking opens the full reviews window (`ReviewSection` — the same
 *  comments + rate/review form the place detail page shows). Falls back to a
 *  "Rate this place" prompt when there are no reviews yet. */
const ActivityReviewStars = ({
    placeName,
    placeCity,
    placeCountry,
    placeKey,
}: ActivityReviewStarsProps) => {
    const key = placeKey || getPlaceKey(placeName, placeCity, placeCountry);
    const modalRef = useRef<ModalButtonHandle>(null);
    const { data } = usePlaceReviews(key);
    const average = data?.averageRating ?? null;
    const total = data?.total ?? 0;

    return (
        <>
            <button
                type="button"
                className="activity-review-stars"
                onClick={() => modalRef.current?.openModel()}
                aria-label={
                    average != null
                        ? `${average} out of 5 from ${total} review${
                              total === 1 ? "" : "s"
                          } — open reviews`
                        : `Rate ${placeName}`
                }
                title={
                    average != null
                        ? "View reviews"
                        : "Be the first to review"
                }
            >
                {average != null ? (
                    <>
                        <Stars rating={average} />
                        <span className="activity-review-count">
                            ({total})
                        </span>
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
                />
            </ModalButton>
        </>
    );
};

export default ActivityReviewStars;
