/**
 * Detail-page social proof chip: "Visited by N".
 *
 * Click → bottom-sheet drawer (same pattern as the account drawer in
 * `BottomNav`) listing every friend who visited the place / city /
 * country, with:
 *   - a search input filtering by name (lower-cased contains-match)
 *   - a scrollable list (the drawer's body scrolls when content
 *     overflows the viewport height)
 *
 * Self-hides on count=0 so detail pages without friend overlap don't
 * render a dead chip. The hook is gated on `enabled: !!user && !!key`
 * so anonymous viewers see nothing either.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, Drawer, useMediaQuery } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { useFriendsVisited } from 'api/hooks/useFriendsVisited';
import type { FriendsVisitedKind } from 'api/friendsVisitedApi';
import StarInput from 'components/common/FormFields/StarInput';
import './index.scss';

// Cap the chip's avatar stack — 3 overlapping mini-avatars reads
// cleanly without crowding. The full list always lives in the
// drawer modal that the chip opens, so we don't lose anyone.
const CHIP_AVATAR_CAP = 3;

export interface FriendsVisitedBadgeProps {
    kind: FriendsVisitedKind;
    /** place_key / city_slug / ISO-2. May be null while the detail
     *  page is mid-fetch — the hook is gated on a truthy key. */
    placeKey: string | null | undefined;
}

const formatVisitedAt = (iso: string): string => {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return '';
    return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

const initialsFor = (name: string): string => {
    const trimmed = name.trim();
    if (!trimmed) return '?';
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
    return (
        (parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')
    ).toUpperCase();
};

const FriendsVisitedBadge = ({
    kind,
    placeKey,
}: FriendsVisitedBadgeProps) => {
    const navigate = useNavigate();
    const { data, isLoading } = useFriendsVisited(kind, placeKey);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    // Desktop ≥ 720px gets a centered Dialog; mobile keeps the
    // bottom-sheet Drawer. Same content tree underneath — only the
    // container component switches. The breakpoint matches the
    // detail-page mobile/desktop cutover used elsewhere in this
    // section.
    const isDesktop = useMediaQuery('(min-width: 720px)');

    // Filtered list — pure client-side, case-insensitive name match.
    // Cheap because friend lists are bounded (typically dozens, not
    // thousands); a more elaborate search isn't worth the complexity.
    const filteredFriends = useMemo(() => {
        if (!data?.friends) return [];
        const trimmed = query.trim().toLowerCase();
        if (!trimmed) return data.friends;
        return data.friends.filter((f) =>
            f.name.toLowerCase().includes(trimmed),
        );
    }, [data, query]);

    // Hide on loading / empty so the chip never flickers in then
    // disappears on data arrival. Empty list = "no friend overlap on
    // this page" — the chip stays out of the layout entirely.
    if (isLoading || !data || data.count === 0) return null;

    const countLabel = `Visited by ${data.count}`;
    // Avatar stack feeds the chip preview — up to 3 friends, in the
    // order the backend returned them (no sort applied; the user
    // can see the full list in the drawer if order matters).
    const chipFriends = data.friends.slice(0, CHIP_AVATAR_CAP);

    const handleClose = () => {
        setOpen(false);
        // Clear the search on close so re-opening the drawer for the
        // same page starts fresh — the typical use is "look once,
        // close, maybe re-open later"; persisting a stale query would
        // be confusing.
        setQuery('');
    };

    return (
        <>
            <button
                type="button"
                className="friends-visited-badge-trigger"
                aria-label={`${countLabel} — open friend list`}
                onClick={() => setOpen(true)}
            >
                <span
                    className="friends-visited-chip-stack"
                    aria-hidden="true"
                >
                    {chipFriends.map((friend) =>
                        friend.profileImageUrl ? (
                            <img
                                key={friend.userId}
                                src={friend.profileImageUrl}
                                alt=""
                                className="friends-visited-chip-avatar"
                                loading="lazy"
                            />
                        ) : (
                            <span
                                key={friend.userId}
                                className="friends-visited-chip-avatar is-placeholder"
                            >
                                {initialsFor(friend.name)}
                            </span>
                        ),
                    )}
                </span>
                <span>{countLabel}</span>
            </button>

            {/* Shared content tree — wrapped in either Dialog (desktop)
                or Drawer (mobile) below. Pulled out to a variable so a
                future viewport-specific tweak only touches the outer
                container, not the body. */}
            {(() => {
                const body = (
                    <div className="friends-visited-drawer">
                        <header className="friends-visited-drawer-head">
                            <h2 className="friends-visited-drawer-title">
                                Friends who visited
                            </h2>
                            <button
                                type="button"
                                className="friends-visited-drawer-close"
                                aria-label="Close"
                                onClick={handleClose}
                            >
                                <CloseRoundedIcon />
                            </button>
                        </header>

                        <div className="friends-visited-search">
                            <SearchRoundedIcon
                                className="friends-visited-search-icon"
                                aria-hidden="true"
                            />
                            <input
                                type="text"
                                className="friends-visited-search-input"
                                placeholder="Search friends..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                aria-label="Search friends"
                            />
                        </div>

                        <ul className="friends-visited-list">
                            {filteredFriends.length === 0 ? (
                                <li className="friends-visited-empty">
                                    No friends match &ldquo;{query}&rdquo;
                                </li>
                            ) : (
                                filteredFriends.map((friend) => (
                                    <li
                                        key={friend.userId}
                                        className={
                                            friend.rating
                                                ? 'friends-visited-row has-review'
                                                : 'friends-visited-row'
                                        }
                                        onClick={() => {
                                            handleClose();
                                            // No public profile route today —
                                            // /friends is the closest. Wire to
                                            // the future profile page when it
                                            // exists.
                                            navigate(`/friends`);
                                        }}
                                    >
                                        {friend.profileImageUrl ? (
                                            <img
                                                src={friend.profileImageUrl}
                                                alt=""
                                                className="friends-visited-avatar"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <span
                                                className="friends-visited-avatar is-placeholder"
                                                aria-hidden="true"
                                            >
                                                {initialsFor(friend.name)}
                                            </span>
                                        )}
                                        <span className="friends-visited-row-text">
                                            <span className="friends-visited-row-name">
                                                {friend.name}
                                            </span>
                                            {friend.rating ? (
                                                <StarInput
                                                    value={friend.rating}
                                                    readonly
                                                    size="sm"
                                                />
                                            ) : null}
                                            {friend.reviewText ? (
                                                <span className="friends-visited-row-quote">
                                                    &ldquo;{friend.reviewText}&rdquo;
                                                </span>
                                            ) : null}
                                            <span className="friends-visited-row-date">
                                                Visited{' '}
                                                {formatVisitedAt(friend.visitedAt)}
                                            </span>
                                        </span>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>
                );

                return isDesktop ? (
                    <Dialog
                        open={open}
                        onClose={handleClose}
                        maxWidth="xs"
                        fullWidth
                        PaperProps={{
                            className: 'friends-visited-dialog-paper',
                        }}
                    >
                        {body}
                    </Dialog>
                ) : (
                    <Drawer
                        anchor="bottom"
                        open={open}
                        onClose={handleClose}
                        PaperProps={{
                            className: 'friends-visited-drawer-paper',
                        }}
                    >
                        {body}
                    </Drawer>
                );
            })()}
        </>
    );
};

export default FriendsVisitedBadge;
