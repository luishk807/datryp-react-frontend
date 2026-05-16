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
import { useState } from 'react';
import { Tooltip } from '@mui/material';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarOutlineRoundedIcon from '@mui/icons-material/StarOutlineRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import RateReviewRoundedIcon from '@mui/icons-material/RateReviewRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import moment from 'moment';
import classNames from 'classnames';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import LoginBtn from 'components/common/LoginBtn';
import SignUpBtn from 'components/common/SignUpBtn';
import Skeleton from 'components/common/Skeleton';
import { useUser } from 'context/UserContext';
import {
    usePlaceReviews,
    useCreateReview,
    useUpdateReview,
    useDeleteReview,
    useToggleReviewLike,
} from 'api/hooks/useReviews';
import type { ReviewItem } from 'api/reviewsApi';
import { getPlaceKey } from 'utils/placeKey';
import { BUTTON_VARIANT } from 'constants';
import type { LoginForm } from 'components/common/LoginBtn';
import type { SignUpForm } from 'components/common/SignUpBtn';
import './index.scss';

interface ReviewSectionProps {
    placeName: string;
    placeCity: string;
    placeCountry: string;
}

// ── Star picker / display ──────────────────────────────────────────────────

interface StarInputProps {
    value: number;
    onChange?: (v: number) => void;
    readonly?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

const StarInput = ({ value, onChange, readonly = false, size = 'md' }: StarInputProps) => {
    const [hover, setHover] = useState<number | null>(null);
    const display = hover ?? value;
    return (
        <span
            className={classNames('review-stars', `size-${size}`, { readonly })}
            role={readonly ? 'img' : 'radiogroup'}
            aria-label={readonly ? `${value} out of 5 stars` : 'Pick a rating'}
        >
            {[1, 2, 3, 4, 5].map((n) => {
                const filled = n <= display;
                const Icon = filled ? StarRoundedIcon : StarOutlineRoundedIcon;
                return (
                    <Icon
                        key={n}
                        className={classNames('review-star', { filled })}
                        onMouseEnter={readonly ? undefined : () => setHover(n)}
                        onMouseLeave={readonly ? undefined : () => setHover(null)}
                        onClick={readonly ? undefined : () => onChange?.(n)}
                        role={readonly ? undefined : 'radio'}
                        aria-checked={!readonly && value === n ? true : undefined}
                    />
                );
            })}
        </span>
    );
};

// ── Review form (used for both create and edit) ────────────────────────────

interface ReviewFormProps {
    initialRating?: number;
    initialText?: string;
    submitting?: boolean;
    submitLabel: string;
    onSubmit: (rating: number, text: string) => void;
    onCancel?: () => void;
}

const ReviewForm = ({
    initialRating = 0,
    initialText = '',
    submitting = false,
    submitLabel,
    onSubmit,
    onCancel,
}: ReviewFormProps) => {
    const [rating, setRating] = useState(initialRating);
    const [text, setText] = useState(initialText);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = () => {
        if (rating < 1 || rating > 5) {
            setError('Pick a 1-5 star rating.');
            return;
        }
        setError(null);
        onSubmit(rating, text.trim());
    };

    return (
        <div className="review-form">
            <label className="review-form-row">
                <span className="review-form-label">Your rating</span>
                <StarInput value={rating} onChange={setRating} size="lg" />
            </label>
            <label className="review-form-row">
                <span className="review-form-label">Your thoughts (optional)</span>
                <textarea
                    className="review-form-textarea"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="What stood out? Where would you stay? Anything to avoid?"
                    maxLength={4000}
                    rows={4}
                />
            </label>
            {error && (
                <p className="review-form-error" role="alert">
                    {error}
                </p>
            )}
            <div className="review-form-actions">
                {onCancel && (
                    <ButtonCustom
                        type={BUTTON_VARIANT.LINE}
                        label="Cancel"
                        onClick={onCancel}
                        disabled={submitting}
                    />
                )}
                <ButtonCustom
                    type={BUTTON_VARIANT.STANDARD}
                    label={submitting ? 'Saving…' : submitLabel}
                    onClick={handleSubmit}
                    disabled={submitting}
                />
            </div>
        </div>
    );
};

// ── Single review card ─────────────────────────────────────────────────────

interface ReviewCardProps {
    review: ReviewItem;
    placeKey: string;
    onEditStart: () => void;
}

const ReviewCard = ({ review, placeKey, onEditStart }: ReviewCardProps) => {
    const toggleLike = useToggleReviewLike();
    const deleteReview = useDeleteReview();

    const handleLike = () => {
        toggleLike.mutate({
            placeKey,
            reviewId: review.id,
            currentlyLiked: review.viewerHasLiked,
        });
    };

    const handleDelete = () => {
        if (!window.confirm('Delete your review?')) return;
        deleteReview.mutate({ placeKey, reviewId: review.id });
    };

    const friendNames = review.friendLikers
        .map((f) => f.name || f.email)
        .filter(Boolean) as string[];

    const friendLine =
        friendNames.length > 0
            ? friendNames.length === 1
                ? `${friendNames[0]} liked this`
                : `${friendNames[0]} and ${friendNames.length - 1} other friend${
                      friendNames.length - 1 === 1 ? '' : 's'
                  } liked this`
            : null;

    return (
        <li className="review-card">
            <div className="review-card-head">
                <div className="review-card-author">
                    <span className="review-card-avatar" aria-hidden="true">
                        {(review.author.name?.charAt(0) ?? '?').toUpperCase()}
                    </span>
                    <div className="review-card-author-meta">
                        <span className="review-card-author-name">
                            {review.author.name || 'Anonymous'}
                        </span>
                        <span className="review-card-time">
                            {moment(review.createdAt).fromNow()}
                            {review.updatedAt !== review.createdAt && ' · edited'}
                        </span>
                    </div>
                </div>
                <StarInput value={review.rating} readonly size="sm" />
            </div>

            {review.text && <p className="review-card-text">{review.text}</p>}

            <div className="review-card-footer">
                <Tooltip
                    title={
                        review.friendLikers.length > 0
                            ? friendNames.join(', ')
                            : review.viewerHasLiked
                                ? 'Click to unlike'
                                : 'Click to like'
                    }
                    arrow
                >
                    <button
                        type="button"
                        className={classNames('review-like-btn', {
                            active: review.viewerHasLiked,
                        })}
                        onClick={handleLike}
                        disabled={toggleLike.isPending}
                        aria-label={review.viewerHasLiked ? 'Unlike review' : 'Like review'}
                    >
                        {review.viewerHasLiked ? (
                            <FavoriteRoundedIcon fontSize="small" />
                        ) : (
                            <FavoriteBorderRoundedIcon fontSize="small" />
                        )}
                        <span className="review-like-count">{review.likeCount}</span>
                    </button>
                </Tooltip>

                {friendLine && (
                    <span className="review-card-friend-likes">{friendLine}</span>
                )}

                {review.isOwner && (
                    <div className="review-card-owner-actions">
                        <button
                            type="button"
                            className="review-card-owner-btn"
                            onClick={onEditStart}
                            aria-label="Edit your review"
                        >
                            <EditRoundedIcon fontSize="small" /> Edit
                        </button>
                        <button
                            type="button"
                            className="review-card-owner-btn danger"
                            onClick={handleDelete}
                            disabled={deleteReview.isPending}
                            aria-label="Delete your review"
                        >
                            <DeleteOutlineRoundedIcon fontSize="small" /> Delete
                        </button>
                    </div>
                )}
            </div>
        </li>
    );
};

// ── Compact summary (rating + count + "View all" link) ────────────────────

interface ReviewSummaryProps {
    placeName: string;
    placeCity: string;
    placeCountry: string;
    /** id of the DOM node to scroll to when the user clicks "View all". */
    targetId?: string;
}

/**
 * Small summary chip — fits next to the OpenAI rating on the place header.
 * Uses the same `usePlaceReviews` query as the full section; TanStack Query
 * dedupes so the page fires one request regardless of how many summaries
 * are on screen.
 */
export const ReviewSummary = ({
    placeName,
    placeCity,
    placeCountry,
    targetId = 'reviews',
}: ReviewSummaryProps) => {
    const placeKey = getPlaceKey(placeName, placeCity, placeCountry);
    const { data, isLoading } = usePlaceReviews(placeKey);

    const handleViewAll = () => {
        const node = document.getElementById(targetId);
        if (node) {
            node.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    if (isLoading) {
        return (
            <div className="review-summary">
                <Skeleton width={120} height={16} radius={4} />
            </div>
        );
    }

    const total = data?.total ?? 0;
    const avg = data?.averageRating ?? 0;

    return (
        <div className="review-summary">
            <Tooltip title="Traveler reviews" arrow>
                <span
                    className="review-summary-icon"
                    role="img"
                    aria-label="Traveler reviews"
                >
                    <GroupsRoundedIcon />
                </span>
            </Tooltip>
            {total > 0 ? (
                <>
                    <StarInput value={Math.round(avg)} readonly size="md" />
                    <span className="review-summary-avg">{avg.toFixed(1)}</span>
                    <span className="review-summary-count">
                        ({total} review{total === 1 ? '' : 's'})
                    </span>
                    <button
                        type="button"
                        className="review-summary-link"
                        onClick={handleViewAll}
                    >
                        View all
                    </button>
                </>
            ) : (
                <>
                    <span className="review-summary-empty">No reviews yet</span>
                    <button
                        type="button"
                        className="review-summary-link"
                        onClick={handleViewAll}
                    >
                        Be the first
                    </button>
                </>
            )}
        </div>
    );
};

// ── Main component ─────────────────────────────────────────────────────────

const ReviewSection = ({ placeName, placeCity, placeCountry }: ReviewSectionProps) => {
    const { user, login, signup } = useUser();
    const placeKey = getPlaceKey(placeName, placeCity, placeCountry);
    const { data, isLoading, isError } = usePlaceReviews(placeKey);
    const createReview = useCreateReview();
    const updateReview = useUpdateReview();

    const [formMode, setFormMode] = useState<'closed' | 'create' | 'edit'>('closed');

    const viewerReview = data?.items.find((r) => r.id === data.viewerReviewId);

    // Re-uses the same handlers Header uses — keeps auth UX consistent.
    const handleLogin = async (form: LoginForm) => {
        const email = form.username?.trim();
        const password = form.password ?? '';
        if (!email || !password) throw new Error('Email and password are required.');
        await login(email, password);
    };

    const handleSignUp = async (form: SignUpForm) => {
        const email = (form.email || form.username)?.trim();
        const password = form.password ?? '';
        if (!email || !password) throw new Error('Email and password are required.');
        if (!form.dob) throw new Error('Date of birth is required.');
        await signup({
            email,
            password,
            dob: form.dob,
            name: form.name,
            phone: form.phone,
        });
    };

    const submitCreate = (rating: number, text: string) => {
        createReview.mutate(
            {
                placeKey,
                payload: { placeName, placeCity, placeCountry, rating, text: text || null },
            },
            { onSuccess: () => setFormMode('closed') }
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
            { onSuccess: () => setFormMode('closed') }
        );
    };

    return (
        <section className="review-section">
            <header className="review-section-head">
                <h2 className="review-section-title">
                    <RateReviewRoundedIcon className="review-section-title-icon" />
                    Traveler reviews
                </h2>
                {data && data.total > 0 && (
                    <div className="review-section-stats">
                        <StarInput
                            value={Math.round(data.averageRating ?? 0)}
                            readonly
                            size="sm"
                        />
                        <span className="review-section-avg">
                            {data.averageRating?.toFixed(1) ?? '—'}
                        </span>
                        <span className="review-section-total">
                            ({data.total} review{data.total === 1 ? '' : 's'})
                        </span>
                    </div>
                )}
            </header>

            {/* CTA / form area */}
            {!user && (
                <div className="review-section-auth-cta">
                    <p className="review-section-auth-msg">
                        Sign in to leave a review.
                    </p>
                    <div className="review-section-auth-buttons">
                        <LoginBtn onClick={handleLogin} />
                        <SignUpBtn onClick={handleSignUp} />
                    </div>
                </div>
            )}

            {user && formMode === 'closed' && (
                <div className="review-section-cta">
                    <ButtonCustom
                        type={BUTTON_VARIANT.STANDARD}
                        label={viewerReview ? 'Edit your review' : 'Leave a review'}
                        onClick={() => setFormMode(viewerReview ? 'edit' : 'create')}
                    />
                </div>
            )}

            {user && formMode === 'create' && (
                <ReviewForm
                    submitting={createReview.isPending}
                    submitLabel="Post review"
                    onSubmit={submitCreate}
                    onCancel={() => setFormMode('closed')}
                />
            )}

            {user && formMode === 'edit' && viewerReview && (
                <ReviewForm
                    initialRating={viewerReview.rating}
                    initialText={viewerReview.text ?? ''}
                    submitting={updateReview.isPending}
                    submitLabel="Update review"
                    onSubmit={submitEdit}
                    onCancel={() => setFormMode('closed')}
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
                <ul className="review-section-list">
                    {data.items.map((review) => (
                        <ReviewCard
                            key={review.id}
                            review={review}
                            placeKey={placeKey}
                            onEditStart={() => setFormMode('edit')}
                        />
                    ))}
                </ul>
            )}
        </section>
    );
};

export default ReviewSection;
