import { useRef, useState } from 'react';
import Layout from 'components/common/Layout/SubLayout';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
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
import { BUTTON_VARIANT } from 'constants';
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
    const handleUnfriend = (friend: ApiFriend) => {
        unfriendMutation.mutate(friend.id);
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
                            friends.map((f) => (
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
                                            onClick={() => handleUnfriend(f)}
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
        </Layout>
    );
};

export default Friends;
