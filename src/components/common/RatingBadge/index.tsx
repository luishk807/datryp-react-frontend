import classNames from 'classnames';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import { usePlaceRating } from 'api/hooks/usePlaceRating';
import './index.scss';

export interface RatingBadgeProps {
    /** Place / activity / hotel name. Required — the lookup keys off this. */
    name: string;
    /** Optional city / country / address context to disambiguate. The
     *  backend appends it to the textQuery so common names land on the
     *  right place (e.g. "Hilton" → "Hilton, Tokyo"). */
    location?: string;
    /** Skip the lookup entirely. Useful when a parent renders the badge
     *  conditionally on something else (e.g. only when an activity has
     *  a place_key). */
    enabled?: boolean;
    /** Optional className on the wrapper. */
    className?: string;
    /** When `true`, the chip is wrapped in an `<a>` to the Google Maps
     *  listing for the place (opens in a new tab). Defaults to `true`.
     *  Pass `false` if the parent already wraps the whole card in a
     *  link — nesting <a>s breaks click semantics. */
    linkToMaps?: boolean;
    /** Display variant:
     *  - `'chip'` (default) — pill with star + rating + count.
     *  - `'compact'` — inline "★ 4.6" without the review count, for
     *    tight cards where space is at a premium. */
    variant?: 'chip' | 'compact';
}

const formatCount = (n: number): string => {
    if (n >= 1000) {
        return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k`;
    }
    return n.toLocaleString();
};

/**
 * Small Google-Places-backed rating pill. Renders nothing while
 * loading, on no-match, or when the backend has no Google key
 * configured — so a parent can drop it in unconditionally without
 * worrying about empty placeholders.
 *
 * Example:
 *   <RatingBadge name="Eiffel Tower" location="Paris" />
 *   → ★ 4.6 · 374k
 */
const RatingBadge = ({
    name,
    location,
    enabled = true,
    className,
    linkToMaps = true,
    variant = 'chip',
}: RatingBadgeProps) => {
    const { data } = usePlaceRating(name, location, enabled);

    if (!data || data.rating == null) return null;

    const ratingStr = data.rating.toFixed(1);
    const countStr =
        data.userRatingCount != null && data.userRatingCount > 0
            ? formatCount(data.userRatingCount)
            : null;

    const content = (
        <>
            <StarRoundedIcon
                className="rating-badge-star"
                fontSize="inherit"
                aria-hidden="true"
            />
            <span className="rating-badge-value">{ratingStr}</span>
            {variant === 'chip' && countStr && (
                <span className="rating-badge-count">· {countStr}</span>
            )}
        </>
    );

    const ariaLabel =
        `Rated ${ratingStr} out of 5` +
        (countStr ? ` based on ${countStr} reviews` : '');

    if (linkToMaps && data.googleMapsUri) {
        return (
            <a
                href={data.googleMapsUri}
                target="_blank"
                rel="noopener noreferrer"
                className={classNames(
                    'rating-badge',
                    `rating-badge-${variant}`,
                    'rating-badge-link',
                    className,
                )}
                aria-label={`${ariaLabel} (opens Google Maps)`}
                onClick={(e) => e.stopPropagation()}
            >
                {content}
            </a>
        );
    }

    return (
        <span
            className={classNames(
                'rating-badge',
                `rating-badge-${variant}`,
                className,
            )}
            aria-label={ariaLabel}
        >
            {content}
        </span>
    );
};

export default RatingBadge;
