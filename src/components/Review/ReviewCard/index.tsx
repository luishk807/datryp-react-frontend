import './index.scss';
import { useTranslation } from 'react-i18next';
import { Tooltip } from '@mui/material';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import classNames from 'classnames';
import moment from 'moment';
import ButtonIcon from 'components/common/FormFields/ButtonIcon';
import StarInput from 'components/common/FormFields/StarInput';
import { useDeleteReview, useToggleReviewLike } from 'api/hooks/useReviews';
import type { ReviewItem } from 'api/reviewsApi';
import { BUTTON_VARIANT } from 'constants';

export interface ReviewCardProps {
    review: ReviewItem;
    /** Slug of the place this review belongs to — used to invalidate the
     *  correct cache entry after like / delete mutations. */
    placeKey: string;
    /** Fires when the owner clicks "Edit" — the parent decides where the
     *  edit form opens (currently inline above the list). */
    onEditStart: () => void;
}

/**
 * One review row: author, rating, body, like button (with friend-likers
 * tooltip), and owner-only Edit / Delete actions. Stateless aside from the
 * inline mutations — list invalidation is handled by the hooks themselves.
 */
const ReviewCard = ({ review, placeKey, onEditStart }: ReviewCardProps) => {
    const { t } = useTranslation();
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
        if (!window.confirm(t('detail.reviews.deleteConfirm'))) return;
        deleteReview.mutate({ placeKey, reviewId: review.id });
    };

    const friendNames = review.friendLikers
        .map((f) => f.name || f.email)
        .filter(Boolean) as string[];

    const friendLine =
        friendNames.length > 0
            ? friendNames.length === 1
                ? t('detail.reviews.friendLikedOne', { name: friendNames[0] })
                : friendNames.length - 1 === 1
                  ? t('detail.reviews.friendLikedTwo', {
                        name: friendNames[0],
                        n: friendNames.length - 1,
                    })
                  : t('detail.reviews.friendLikedOther', {
                        name: friendNames[0],
                        n: friendNames.length - 1,
                    })
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
                            {review.author.name ||
                                t('detail.reviews.anonymous')}
                        </span>
                        <span className="review-card-time">
                            {moment(review.createdAt).fromNow()}
                            {review.updatedAt !== review.createdAt &&
                                ` · ${t('detail.reviews.edited')}`}
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
                                ? t('detail.reviews.clickToUnlike')
                                : t('detail.reviews.clickToLike')
                    }
                    arrow
                >
                    {/* span wrapper lets the Tooltip attach its listeners
                        cleanly to a function-component child (and still works
                        when the button is disabled). */}
                    <span className="review-like-tooltip-wrap">
                        <ButtonIcon
                            type={BUTTON_VARIANT.TEXT_PLAIN}
                            className={classNames('review-like-btn', {
                                active: review.viewerHasLiked,
                            })}
                            Icon={
                                review.viewerHasLiked
                                    ? FavoriteRoundedIcon
                                    : FavoriteBorderRoundedIcon
                            }
                            iconPosition="start"
                            iconProps={{ fontSize: 'small' }}
                            title={String(review.likeCount)}
                            ariaLabel={
                                review.viewerHasLiked
                                    ? t('detail.reviews.unlikeAria')
                                    : t('detail.reviews.likeAria')
                            }
                            onClick={handleLike}
                            disabled={toggleLike.isPending}
                        />
                    </span>
                </Tooltip>

                {friendLine && (
                    <span className="review-card-friend-likes">{friendLine}</span>
                )}

                {review.isOwner && (
                    <div className="review-card-owner-actions">
                        <ButtonIcon
                            type={BUTTON_VARIANT.TEXT_PLAIN}
                            className="review-card-owner-btn"
                            Icon={EditRoundedIcon}
                            iconPosition="start"
                            iconProps={{ fontSize: 'small' }}
                            title={t('detail.reviews.edit')}
                            ariaLabel={t('detail.reviews.editAria')}
                            onClick={onEditStart}
                        />
                        <ButtonIcon
                            type={BUTTON_VARIANT.TEXT_PLAIN}
                            className="review-card-owner-btn danger"
                            Icon={DeleteOutlineRoundedIcon}
                            iconPosition="start"
                            iconProps={{ fontSize: 'small' }}
                            title={t('detail.reviews.delete')}
                            ariaLabel={t('detail.reviews.deleteAria')}
                            onClick={handleDelete}
                            disabled={deleteReview.isPending}
                        />
                    </div>
                )}
            </div>
        </li>
    );
};

export default ReviewCard;
