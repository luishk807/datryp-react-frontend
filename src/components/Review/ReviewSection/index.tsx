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
import ReviewForm from "components/Review/ReviewForm";
import Skeleton from "components/common/Skeleton";
import { useUser } from "context/UserContext";
import {
  usePlaceReviews,
  useCreateReview,
  useUpdateReview,
} from "api/hooks/useReviews";
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

const SORT_OPTIONS: { value: ReviewSort; label: string }[] = [
  { value: "recent", label: "Most recent" },
  { value: "highest", label: "Highest rated" },
  { value: "lowest", label: "Lowest rated" },
];

const REVIEW_FORM_MODE = {
  CLOSED: "closed",
  CREATE: "create",
  EDIT: "edit",
} as const;

type ReviewFormMode = (typeof REVIEW_FORM_MODE)[keyof typeof REVIEW_FORM_MODE];

const ReviewSection = ({
  placeName,
  placeCity,
  placeCountry,
  googleRating,
  googleRatingCount,
  openaiRating,
}: ReviewSectionProps) => {
  const { user } = useUser();
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
  const createReview = useCreateReview();
  const updateReview = useUpdateReview();

  const [formMode, setFormMode] = useState<ReviewFormMode>(
    REVIEW_FORM_MODE.CLOSED,
  );

  // viewer_review_id is server-resolved across all pages, but the matching
  // item itself may not be on the current page — only use it to know the
  // user has reviewed; the form edit mode loads from the response or
  // falls back to a server fetch on open.
  const viewerReview = data?.items.find((r) => r.id === data.viewerReviewId);
  const hasOwnReview = Boolean(data?.viewerReviewId);

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

  const submitCreate = (rating: number, text: string) => {
    createReview.mutate(
      {
        placeKey,
        payload: {
          placeName,
          placeCity,
          placeCountry,
          rating,
          text: text || null,
        },
      },
      { onSuccess: () => setFormMode(REVIEW_FORM_MODE.CLOSED) },
    );
  };

  const submitEdit = (rating: number, text: string) => {
    if (!viewerReview) return;
    updateReview.mutate(
      {
        placeKey,
        reviewId: viewerReview.id,
        payload: { rating, text: text || null },
      },
      { onSuccess: () => setFormMode(REVIEW_FORM_MODE.CLOSED) },
    );
  };

  return (
    <section className="review-section">
      <header className="review-section-head">
        <h2 className="review-section-title">
          <RateReviewRoundedIcon className="review-section-title-icon" />
          {showRatingBreakdown ? "Ratings & reviews" : "Traveler reviews"}
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
              <span className="rating-row-source">Overall</span>
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
                daTryp travelers
              </span>
              <span className="rating-row-value">
                <Stars rating={data.averageRating} />
                <span className="rating-row-count">({data.total})</span>
              </span>
            </li>
          )}
        </ul>
      )}

      {/* CTA / form area. The `/place` route is auth-gated upstream
                via `<Gated>`, so we can assume `user` exists by the time
                this renders — the `user &&` guards below are defensive only. */}
      {user && formMode === REVIEW_FORM_MODE.CLOSED && (
        <div className="review-section-cta">
          <ButtonCustom
            type={BUTTON_VARIANT.STANDARD}
            label={hasOwnReview ? "Edit your review" : "Leave a review"}
            onClick={() => {
              if (!hasOwnReview) {
                setFormMode(REVIEW_FORM_MODE.CREATE);
                return;
              }
              if (viewerReview) {
                setFormMode(REVIEW_FORM_MODE.EDIT);
                return;
              }
              // Your review isn't on the current page — jump
              // back to recent / page 1 so it loads.
              setSort("recent");
              setPage(1);
            }}
          />
        </div>
      )}

      {user && formMode === REVIEW_FORM_MODE.CREATE && (
        <ReviewForm
          submitting={createReview.isPending}
          submitLabel="Post review"
          onSubmit={submitCreate}
          onCancel={() => setFormMode(REVIEW_FORM_MODE.CLOSED)}
        />
      )}

      {user && formMode === REVIEW_FORM_MODE.EDIT && viewerReview && (
        <ReviewForm
          initialRating={viewerReview.rating}
          initialText={viewerReview.text ?? ""}
          submitting={updateReview.isPending}
          submitLabel="Update review"
          onSubmit={submitEdit}
          onCancel={() => setFormMode(REVIEW_FORM_MODE.CLOSED)}
        />
      )}

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
          Couldn&rsquo;t load reviews.
        </p>
      )}

      {data && data.items.length === 0 && (
        <p className="review-section-empty">
          No reviews yet — be the first to share your experience.
        </p>
      )}

      {data && data.items.length > 0 && (
        <>
          <div
            className="review-section-sort"
            role="tablist"
            aria-label="Sort reviews"
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
                label={opt.label}
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
                onEditStart={() => setFormMode(REVIEW_FORM_MODE.EDIT)}
              />
            ))}
          </ul>

          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            onPageChange={setPage}
            ariaLabel="Reviews pagination"
          />
        </>
      )}
    </section>
  );
};

export default ReviewSection;
