import { useMemo, useRef, useState } from 'react';
import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
} from '@mui/material';
import Layout from 'components/common/Layout/SubLayout';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import Pagination from 'components/common/Pagination';
import InviteFriendModal from 'components/InviteFriendModal';
import { type ModalButtonHandle } from 'components/ModalButton';
import { useUser } from 'context/UserContext';
import {
    useCancelFriendRequest,
    useFriends,
    useMyFriendRequests,
    useResendFriendRequest,
    useRespondToFriendRequest,
    useUnfriend,
    type ApiFriend,
    type ApiFriendRequest,
} from 'api/hooks/useFriends';
import { BUTTON_VARIANT, LIST_PAGE_SIZE } from 'constants';
import './index.scss';

/** Pretty-print "2 days ago" / "today" — keeps the row terse but informative. */
const formatRelativeShort = (iso: string): string => {
    const then = new Date(iso);
    if (Number.isNaN(then.getTime())) return '';
    const diff = Date.now() - then.getTime();
    const day = 24 * 60 * 60 * 1000;
    const days = Math.floor(diff / day);
    if (days < 1) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const initial = (name: string | null | undefined, email: string): string =>
    (name?.charAt(0) || email.charAt(0) || '?').toUpperCase();

export const Friends = () => {
    const { user } = useUser();
    const inviteRef = useRef<ModalButtonHandle>(null);

    const {
        data: friends = [],
        isLoading: friendsLoading,
    } = useFriends({ enabled: !!user });
    const {
        data: requests = [],
        isLoading: requestsLoading,
    } = useMyFriendRequests({ enabled: !!user });

    const respondMutation = useRespondToFriendRequest();
    const cancelMutation = useCancelFriendRequest();
    const resendMutation = useResendFriendRequest();
    const unfriendMutation = useUnfriend();
    // Transient toast for the "resent" / cooldown response — disappears on
    // the next mutation or after a few seconds via state cleanup.
    const [resendFeedback, setResendFeedback] = useState<{
        kind: 'success' | 'error';
        message: string;
    } | null>(null);

    // Paginate the friends list at LIST_PAGE_SIZE (shared constant).
    // Outgoing / incoming requests are typically small + transient so
    // they're not paginated.
    const [friendsPage, setFriendsPage] = useState(1);
    const friendsTotalPages = Math.max(
        1,
        Math.ceil(friends.length / LIST_PAGE_SIZE)
    );
    const pagedFriends = useMemo(() => {
        const start = (friendsPage - 1) * LIST_PAGE_SIZE;
        return friends.slice(start, start + LIST_PAGE_SIZE);
    }, [friends, friendsPage]);

    if (!user) {
        return (
            <Layout title="Friends">
                <div className="friends-page friends-logged-out">
                    <p>Log in to manage your friends.</p>
                </div>
            </Layout>
        );
    }

    const incoming = requests.filter((r) => r.direction === 'incoming');
    const outgoing = requests.filter((r) => r.direction === 'outgoing');

    const handleAccept = (req: ApiFriendRequest) => {
        respondMutation.mutate({ requestId: req.id, accept: true });
    };
    const handleReject = (req: ApiFriendRequest) => {
        respondMutation.mutate({ requestId: req.id, accept: false });
    };
    const handleCancel = (req: ApiFriendRequest) => {
        cancelMutation.mutate(req.id);
    };
    const handleResend = (req: ApiFriendRequest) => {
        setResendFeedback(null);
        resendMutation.mutate(req.id, {
            onSuccess: () =>
                setResendFeedback({
                    kind: 'success',
                    message: `Invite re-sent to ${
                        req.otherUser.name ?? req.otherUser.email
                    }.`,
                }),
            onError: (err) =>
                setResendFeedback({
                    kind: 'error',
                    message: err.message,
                }),
        });
    };
    // Two-step unfriend — opens a confirm dialog instead of removing
    // on the first click. Unfriending is hard to undo (the other
    // person has to re-accept a fresh request) and the row buttons
    // sit close together on mobile, so a confirm step prevents the
    // accidental tap.
    const [unfriendCandidate, setUnfriendCandidate] = useState<ApiFriend | null>(
        null
    );
    const handleUnfriendClick = (friend: ApiFriend) => {
        setUnfriendCandidate(friend);
    };
    const handleUnfriendConfirm = () => {
        if (!unfriendCandidate) return;
        unfriendMutation.mutate(unfriendCandidate.id, {
            onSettled: () => setUnfriendCandidate(null),
        });
    };
    const handleUnfriendCancel = () => {
        if (unfriendMutation.isPending) return;
        setUnfriendCandidate(null);
    };

    return (
        <Layout title="Friends">
            <div className="friends-page">
                {/* ── Incoming pending requests ─────────────────────────── */}
                {incoming.length > 0 && (
                    <section className="friends-card">
                        <div className="friends-card-header">
                            <div className="friends-card-headings">
                                <h2 className="friends-card-title">
                                    Friend requests
                                </h2>
                                <p className="friends-card-subtitle">
                                    Accept to connect and start planning trips
                                    together.
                                </p>
                            </div>
                            <span className="friends-count">
                                {incoming.length}{' '}
                                {incoming.length === 1 ? 'request' : 'requests'}
                            </span>
                        </div>
                        <div className="friends-list">
                            {incoming.map((req) => (
                                <div key={req.id} className="friend-row">
                                    <div className="friend-avatar">
                                        {initial(
                                            req.otherUser.name,
                                            req.otherUser.email
                                        )}
                                    </div>
                                    <div className="friend-info">
                                        <span className="friend-name">
                                            {req.otherUser.name ??
                                                req.otherUser.email}
                                        </span>
                                        <div className="friend-meta">
                                            <span className="friend-meta-item">
                                                {req.otherUser.email}
                                            </span>
                                            <span className="friend-meta-item">
                                                Sent {formatRelativeShort(req.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="friend-actions friend-actions--respond">
                                        <ButtonCustom
                                            type={BUTTON_VARIANT.STANDARD_MINI}
                                            capitalizeType="uppercase"
                                            label="Accept"
                                            onClick={() => handleAccept(req)}
                                            disabled={respondMutation.isPending}
                                        />
                                        <button
                                            type="button"
                                            className="friend-remove"
                                            onClick={() => handleReject(req)}
                                            disabled={respondMutation.isPending}
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* ── Accepted friends ──────────────────────────────────── */}
                <section className="friends-card">
                    <div className="friends-card-header">
                        <div className="friends-card-headings">
                            <h2 className="friends-card-title">Your friends</h2>
                            <p className="friends-card-subtitle">
                                People you travel with — add them once and pick
                                from the list when planning a trip.
                            </p>
                        </div>
                        <div className="friends-card-actions">
                            <span className="friends-count">
                                {friends.length}{' '}
                                {friends.length === 1 ? 'friend' : 'friends'}
                            </span>
                            <ButtonCustom
                                type={BUTTON_VARIANT.STANDARD_MINI}
                                capitalizeType="uppercase"
                                label="+ Invite friend"
                                onClick={() => inviteRef.current?.openModel()}
                            />
                        </div>
                    </div>
                    <div className="friends-list">
                        {friendsLoading ? (
                            <p className="friends-empty">Loading…</p>
                        ) : friends.length === 0 ? (
                            <p className="friends-empty">
                                No friends yet. Invite one to get started.
                            </p>
                        ) : (
                            pagedFriends.map((f) => (
                                <div key={f.id} className="friend-row">
                                    <div className="friend-avatar">
                                        {initial(f.name, f.email)}
                                    </div>
                                    <div className="friend-info">
                                        <span className="friend-name">
                                            {f.name ?? f.email}
                                        </span>
                                        {f.email && (
                                            <div className="friend-meta">
                                                <span className="friend-meta-item">
                                                    {f.email}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="friend-actions">
                                        <button
                                            type="button"
                                            className="friend-remove"
                                            onClick={() => handleUnfriendClick(f)}
                                            disabled={unfriendMutation.isPending}
                                            aria-label={`Unfriend ${f.name ?? f.email}`}
                                        >
                                            Unfriend
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    {friends.length > 0 && (
                        <Pagination
                            page={friendsPage}
                            totalPages={friendsTotalPages}
                            onPageChange={(p) => {
                                setFriendsPage(p);
                                window.scrollTo({
                                    top: 0,
                                    behavior: 'smooth',
                                });
                            }}
                            ariaLabel="Friends pagination"
                        />
                    )}
                </section>

                {/* ── Outgoing pending requests ─────────────────────────── */}
                {outgoing.length > 0 && (
                    <section className="friends-card">
                        <div className="friends-card-header">
                            <div className="friends-card-headings">
                                <h2 className="friends-card-title">
                                    Sent requests
                                </h2>
                                <p className="friends-card-subtitle">
                                    Waiting for them to accept. Resend the
                                    email if they didn&rsquo;t see it.
                                </p>
                            </div>
                            <span className="friends-count">
                                {outgoing.length} pending
                            </span>
                        </div>
                        {resendFeedback && (
                            <p
                                className={`friend-resend-feedback friend-resend-feedback--${resendFeedback.kind}`}
                                role="status"
                                aria-live="polite"
                            >
                                {resendFeedback.message}
                            </p>
                        )}
                        <div className="friends-list">
                            {outgoing.map((req) => (
                                <div key={req.id} className="friend-row">
                                    <div className="friend-avatar">
                                        {initial(
                                            req.otherUser.name,
                                            req.otherUser.email
                                        )}
                                    </div>
                                    <div className="friend-info">
                                        <span className="friend-name">
                                            {req.otherUser.name ??
                                                req.otherUser.email}
                                            <span className="friend-pending-badge">
                                                Pending
                                            </span>
                                        </span>
                                        <div className="friend-meta">
                                            <span className="friend-meta-item">
                                                {req.otherUser.email}
                                            </span>
                                            <span className="friend-meta-item">
                                                Sent {formatRelativeShort(req.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="friend-actions friend-actions--respond">
                                        <button
                                            type="button"
                                            className="friend-resend"
                                            onClick={() => handleResend(req)}
                                            disabled={resendMutation.isPending}
                                        >
                                            {resendMutation.isPending
                                                ? 'Resending…'
                                                : 'Resend'}
                                        </button>
                                        <button
                                            type="button"
                                            className="friend-remove"
                                            onClick={() => handleCancel(req)}
                                            disabled={cancelMutation.isPending}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {requestsLoading && requests.length === 0 && (
                    <p className="friends-empty">Loading requests…</p>
                )}

                <InviteFriendModal
                    ref={inviteRef}
                />
            </div>
            <Dialog
                open={unfriendCandidate !== null}
                onClose={handleUnfriendCancel}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>
                    Unfriend{' '}
                    {unfriendCandidate?.name ?? unfriendCandidate?.email}?
                </DialogTitle>
                <DialogContent>
                    <p>
                        They&rsquo;ll be removed from your friends list and
                        won&rsquo;t see your trips unless you&rsquo;re both
                        organizers on one. To reconnect, either of you will
                        need to send a fresh friend request.
                    </p>
                </DialogContent>
                <DialogActions>
                    <ButtonCustom
                        type={BUTTON_VARIANT.LINE}
                        capitalizeType="uppercase"
                        label="Keep as friend"
                        onClick={handleUnfriendCancel}
                        disabled={unfriendMutation.isPending}
                    />
                    <ButtonCustom
                        type={BUTTON_VARIANT.STANDARD}
                        capitalizeType="uppercase"
                        label={
                            unfriendMutation.isPending
                                ? 'Removing…'
                                : 'Unfriend'
                        }
                        onClick={handleUnfriendConfirm}
                        disabled={unfriendMutation.isPending}
                    />
                </DialogActions>
            </Dialog>
        </Layout>
    );
};

export default Friends;
