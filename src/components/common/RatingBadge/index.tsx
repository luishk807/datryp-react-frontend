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
    /** Pre-resolved global rating snapshot. When provided (non-null), the
     *  badge renders it directly and SKIPS the live, Pro-gated Google
     *  lookup — so a rating captured at place-pull time and persisted on
     *  the activity shows to every viewer (including free users) without a
     *  fresh call. Falls back to the live lookup when null/undefined. */
    rating?: number | null;
    /** Review count paired with `rating` (the persisted snapshot). Only
     *  read when `rating` is provided. */
    ratingCount?: number | null;
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
    rating,
    ratingCount,
}: RatingBadgeProps) => {
    // A persisted snapshot short-circuits the live lookup — render it
    // directly (works for free users, no Google call). Only hit the
    // network when no snapshot was passed.
    const hasSnapshot = rating != null;
    // RatingBadge shows only the star + count — request the 'rating'
    // variant so the backend skips the (separately-billed) Place Photo
    // call and the pricier place-fields tier.
    const { data } = usePlaceRating(
        name,
        location,
        enabled && !hasSnapshot,
        'rating',
    );

    const effectiveRating = hasSnapshot ? rating : data?.rating ?? null;
    const effectiveCount = hasSnapshot
        ? ratingCount ?? null
        : data?.userRatingCount ?? null;
    // Maps deep-link only comes off the live lookup; the snapshot doesn't
    // persist the URI, so it renders as a non-linked span.
    const mapsUri = hasSnapshot ? null : data?.googleMapsUri ?? null;

    if (effectiveRating == null) return null;

    const ratingStr = effectiveRating.toFixed(1);
    const countStr =
        effectiveCount != null && effectiveCount > 0
            ? formatCount(effectiveCount)
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

    if (linkToMaps && mapsUri) {
        return (
            <a
                href={mapsUri}
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
