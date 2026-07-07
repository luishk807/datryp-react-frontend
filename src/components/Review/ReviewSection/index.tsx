/**
 * User-authored reviews for a place — separate from the OpenAI rating.
 *
 * Renders below the place name/rating on the detail page. Features:
 * - Aggregate stats (count + average rating)
 * - "Leave a review" / "Edit your review" CTA, gated on auth
 * - Inline review form (1-5 stars + optional text)
 * - Per-review like with friend-likers list (which of your friends liked it)
 * - Owner controls (edit / delete) only on rows you authored
 *
 * The list is public — anyone can read. Writing requires login; for
 * unauthenticated users the CTA opens the existing `<LoginBtn>` modal
 * rather than navigating away.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import RateReviewRoundedIcon from "@mui/icons-material/RateReviewRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import classNames from "classnames";
import ButtonCustom from "components/common/FormFields/ButtonCustom";
import Pagination from "components/common/Pagination";
import RatingStats from "components/common/RatingStats";
import GoogleGlyph from "components/common/GoogleGlyph";
import Stars from "components/common/Stars";
import ReviewCard from "components/Review/ReviewCard";
import Skeleton from "components/common/Skeleton";
import { usePlaceReviews } from "api/hooks/useReviews";
import type { ReviewSort } from "api/reviewsApi";
import { getPlaceKey } from "utils/placeKey";
import { blendRatings } from "utils/blendedRating";
import { BUTTON_VARIANT } from "constants";
import "./index.scss";

interface ReviewSectionProps {
  placeName: string;
  placeCity: string;
  placeCountry: string;
  /** When a Google and/or OpenAI rating is passed (i.e. opened from an
   *  activity card, where these are persisted on the activity), the
   *  section renders a "Ratings" breakdown listing each source
   *  separately above the traveler reviews. Omitted on the place detail
   *  page — it already shows the global ratings in its own header, so
   *  the breakdown would duplicate them. */
  googleRating?: number | null;
  googleRatingCount?: number | null;
  openaiRating?: number | null;
}

// ── Main component ─────────────────────────────────────────────────────────

const SORT_OPTIONS: { value: ReviewSort; labelKey: string }[] = [
  { value: "recent", labelKey: "detail.reviews.sortRecent" },
  { value: "highest", labelKey: "detail.reviews.sortHighest" },
  { value: "lowest", labelKey: "detail.reviews.sortLowest" },
];

const ReviewSection = ({
  placeName,
  placeCity,
  placeCountry,
  googleRating,
  googleRatingCount,
  openaiRating,
}: ReviewSectionProps) => {
  const { t } = useTranslation();
  const placeKey = getPlaceKey(placeName, placeCity, placeCountry);
  // Only the activity-card entry point passes external ratings; the place
  // page omits them (it shows the same numbers in its own header).
  const showRatingBreakdown = googleRating != null || openaiRating != null;

  const [sort, setSort] = useState<ReviewSort>("recent");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = usePlaceReviews(placeKey, {
    page,
    pageSize: 10,
    sort,
  });

  // Blended "overall" across whichever of the three sources have data —
  // the same number the activity card shows. Only computed in the
  // breakdown context (activity entry); the place page keeps the plain
  // traveler-review stat in its own header.
  const blendedOverall = showRatingBreakdown
    ? blendRatings([
        { rating: googleRating, count: googleRatingCount },
        { rating: openaiRating },
        { rating: data?.averageRating, count: data?.total },
      ])
    : null;

  const handleSortChange = (next: ReviewSort) => {
    if (next === sort) return;
    setSort(next);
    setPage(1);
  };

  return (
    <section className="review-section">
      <header className="review-section-head">
        <h2 className="review-section-title">
          <RateReviewRoundedIcon className="review-section-title-icon" />
          {showRatingBreakdown
            ? t('detail.reviews.ratingsReviews')
            : t('detail.reviews.travelerReviews')}
        </h2>
        {/* The breakdown box below carries the overall + per-source
            ratings, so the header stat is only for the place page. */}
        {!showRatingBreakdown && data && (
          <RatingStats
            average={data.averageRating}
            total={data.total}
            size="sm"
          />
        )}
      </header>

      {showRatingBreakdown && (
        <ul className="review-section-ratings">
          {blendedOverall && (
            <li className="rating-row rating-row-overall">
              <span className="rating-row-source">
                {t('detail.reviews.overall')}
              </span>
              <span className="rating-row-value">
                <Stars rating={blendedOverall.average} />
              </span>
            </li>
          )}
          {googleRating != null && (
            <li className="rating-row">
              <span className="rating-row-source">
                <GoogleGlyph size={16} />
                Google
              </span>
              <span className="rating-row-value">
                <Stars rating={googleRating} />
                {googleRatingCount != null && googleRatingCount > 0 && (
                  <span className="rating-row-count">
                    ({googleRatingCount.toLocaleString()})
                  </span>
                )}
              </span>
            </li>
          )}
          {openaiRating != null && (
            <li className="rating-row">
              <span className="rating-row-source">
                <PublicRoundedIcon className="rating-row-icon" />
                OpenAI
              </span>
              <span className="rating-row-value">
                <Stars rating={openaiRating} />
              </span>
            </li>
          )}
          {data && data.averageRating != null && data.total > 0 && (
            <li className="rating-row">
              <span className="rating-row-source">
                <GroupsRoundedIcon className="rating-row-icon" />
                {t('detail.reviews.daTrypTravelers')}
              </span>
              <span className="rating-row-value">
                <Stars rating={data.averageRating} />
                <span className="rating-row-count">({data.total})</span>
              </span>
            </li>
          )}
        </ul>
      )}

      {/* No authoring here — a place's reviews come from travelers' own
          completed-trip activity reviews (the single source of truth), so
          this section only displays them + the aggregate. */}

      {/* List */}
      {isLoading && (
        <ul className="review-section-list">
          {Array.from({ length: 2 }).map((_, i) => (
            <li key={i} className="review-card">
              <Skeleton width="40%" height={14} radius={4} />
              <Skeleton width="95%" height={12} radius={4} />
              <Skeleton width="80%" height={12} radius={4} />
            </li>
          ))}
        </ul>
      )}

      {isError && (
        <p className="review-section-error" role="alert">
          {t('detail.reviews.loadError')}
        </p>
      )}

      {data && data.items.length === 0 && (
        <p className="review-section-empty">
          {t('detail.reviews.empty')}
        </p>
      )}

      {data && data.items.length > 0 && (
        <>
          <div
            className="review-section-sort"
            role="tablist"
            aria-label={t('detail.reviews.sortAria')}
          >
            {SORT_OPTIONS.map((opt) => (
              <ButtonCustom
                key={opt.value}
                type={BUTTON_VARIANT.NONE}
                capitalizeType="none"
                role="tab"
                ariaSelected={sort === opt.value}
                className={classNames("review-sort-tab", {
                  active: sort === opt.value,
                })}
                label={t(opt.labelKey)}
                onClick={() => handleSortChange(opt.value)}
              />
            ))}
          </div>

          <ul className="review-section-list">
            {data.items.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                placeKey={placeKey}
              />
            ))}
          </ul>

          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            onPageChange={setPage}
            ariaLabel={t('detail.reviews.paginationAria')}
          />
        </>
      )}
    </section>
  );
};

export default ReviewSection;
