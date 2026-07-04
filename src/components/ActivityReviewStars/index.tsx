import { useRef } from "react";
import { useTranslation } from "react-i18next";
import ModalButton, { type ModalButtonHandle } from "components/ModalButton";
import ReviewSection from "components/Review/ReviewSection";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
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
 *  above the comments. Falls back to empty (clickable) stars when no source
 *  has a rating yet. */
const ActivityReviewStars = ({
    placeName,
    placeCity,
    placeCountry,
    placeKey,
    googleRating,
    googleRatingCount,
    openaiRating,
}: ActivityReviewStarsProps) => {
    const { t } = useTranslation();
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
                        ? blended.totalCount > 0
                            ? t("review.starsAriaWithCount", {
                                  rating: blended.average.toFixed(1),
                                  count: blended.totalCount,
                              })
                            : t("review.starsAria", {
                                  rating: blended.average.toFixed(1),
                              })
                        : t("review.rateNamed", { name: placeName })
                }
                title={
                    blended ? t("review.viewRatings") : t("review.beTheFirst")
                }
            >
                {blended ? (
                    // Scored — a compact "★ 4.5" chip (single gold star + the
                    // blended average), plus the review count when there is one.
                    <>
                        <span className="activity-review-score">
                            <StarRoundedIcon className="activity-review-star" />
                            {blended.average.toFixed(1)}
                        </span>
                        {blended.totalCount > 0 && (
                            <span className="activity-review-count">
                                ({blended.totalCount})
                            </span>
                        )}
                    </>
                ) : (
                    // No rating from any source yet — a compact "★ Rate your
                    // visit" prompt. Clicking opens the reviews window; the
                    // button's aria-label still names the place.
                    <span className="activity-review-rate">
                        <StarRoundedIcon className="activity-review-star" />
                        {t("review.rateYourVisit")}
                    </span>
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
