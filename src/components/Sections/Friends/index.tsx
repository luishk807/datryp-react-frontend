import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

type TFn = ReturnType<typeof useTranslation>['t'];

/** Pretty-print "2 days ago" / "today" — keeps the row terse but informative. */
const formatRelativeShort = (iso: string, t: TFn, locale: string): string => {
    const then = new Date(iso);
    if (Number.isNaN(then.getTime())) return '';
    const diff = Date.now() - then.getTime();
    const day = 24 * 60 * 60 * 1000;
    const days = Math.floor(diff / day);
    if (days < 1) return t('friends.relative.today');
    if (days === 1) return t('friends.relative.yesterday');
    if (days < 7) return t('friends.relative.daysAgo', { count: days });
    return then.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
};

const initial = (name: string | null | undefined, email: string): string =>
    (name?.charAt(0) || email.charAt(0) || '?').toUpperCase();

export const Friends = () => {
    const { t, i18n } = useTranslation();
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
            <Layout title={t('friends.title')}>
                <div className="friends-page friends-logged-out">
                    <p>{t('friends.loggedOut')}</p>
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
                    message: t('friends.toast.resent', {
                        name: req.otherUser.name ?? req.otherUser.email,
                    }),
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
        <Layout title={t('friends.title')}>
            <div className="friends-page">
                {/* ── Incoming pending requests ─────────────────────────── */}
                {incoming.length > 0 && (
                    <section className="friends-card">
                        <div className="friends-card-header">
                            <div className="friends-card-headings">
                                <h2 className="friends-card-title">
                                    {t('friends.requests.title')}
                                </h2>
                                <p className="friends-card-subtitle">
                                    {t('friends.requests.subtitle')}
                                </p>
                            </div>
                            <span className="friends-count">
                                {t('friends.requests.count', {
                                    count: incoming.length,
                                })}
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
                                                {t('friends.sentAgo', {
                                                    time: formatRelativeShort(
                                                        req.createdAt,
                                                        t,
                                                        i18n.language
                                                    ),
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="friend-actions friend-actions--respond">
                                        <ButtonCustom
                                            type={BUTTON_VARIANT.STANDARD_MINI}
                                            capitalizeType="uppercase"
                                            label={t('friends.actions.accept')}
                                            onClick={() => handleAccept(req)}
                                            disabled={respondMutation.isPending}
                                        />
                                        <button
                                            type="button"
                                            className="friend-remove"
                                            onClick={() => handleReject(req)}
                                            disabled={respondMutation.isPending}
                                        >
                                            {t('friends.actions.reject')}
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
                            <h2 className="friends-card-title">
                                {t('friends.yourFriends.title')}
                            </h2>
                            <p className="friends-card-subtitle">
                                {t('friends.yourFriends.subtitle')}
                            </p>
                        </div>
                        <div className="friends-card-actions">
                            <span className="friends-count">
                                {t('friends.yourFriends.count', {
                                    count: friends.length,
                                })}
                            </span>
                            <ButtonCustom
                                type={BUTTON_VARIANT.STANDARD_MINI}
                                capitalizeType="uppercase"
                                label={t('friends.actions.invite')}
                                onClick={() => inviteRef.current?.openModel()}
                            />
                        </div>
                    </div>
                    <div className="friends-list">
                        {friendsLoading ? (
                            <p className="friends-empty">
                                {t('friends.loading')}
                            </p>
                        ) : friends.length === 0 ? (
                            <p className="friends-empty">
                                {t('friends.yourFriends.empty')}
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
                                            <span className="friend-status-badge is-friend">
                                                {t('friends.badge.friend')}
                                            </span>
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
                                            aria-label={t('friends.actions.removeName', {
                                                name: f.name ?? f.email,
                                            })}
                                        >
                                            {t('friends.actions.remove')}
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
                            ariaLabel={t('friends.paginationAria')}
                        />
                    )}
                </section>

                {/* ── Outgoing pending requests ─────────────────────────── */}
                {outgoing.length > 0 && (
                    <section className="friends-card">
                        <div className="friends-card-header">
                            <div className="friends-card-headings">
                                <h2 className="friends-card-title">
                                    {t('friends.sent.title')}
                                </h2>
                                <p className="friends-card-subtitle">
                                    {t('friends.sent.subtitle')}
                                </p>
                            </div>
                            <span className="friends-count">
                                {t('friends.sent.count', {
                                    count: outgoing.length,
                                })}
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
                                                t('friends.sent.invitationSent')}
                                            <span className="friend-pending-badge">
                                                {t('friends.badge.pending')}
                                            </span>
                                        </span>
                                        <div className="friend-meta">
                                            <span className="friend-meta-item">
                                                {req.otherUser.email}
                                            </span>
                                            <span className="friend-meta-item">
                                                {t('friends.sentAgo', {
                                                    time: formatRelativeShort(
                                                        req.createdAt,
                                                        t,
                                                        i18n.language
                                                    ),
                                                })}
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
                                                ? t('friends.actions.resending')
                                                : t('friends.actions.resend')}
                                        </button>
                                        <button
                                            type="button"
                                            className="friend-remove"
                                            onClick={() => handleCancel(req)}
                                            disabled={cancelMutation.isPending}
                                        >
                                            {t('friends.actions.cancel')}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {requestsLoading && requests.length === 0 && (
                    <p className="friends-empty">
                        {t('friends.loadingRequests')}
                    </p>
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
                aria-labelledby="friends-remove-dialog-title"
            >
                <DialogTitle id="friends-remove-dialog-title">
                    {t('friends.removeDialog.title', {
                        name:
                            unfriendCandidate?.name ??
                            unfriendCandidate?.email ??
                            '',
                    })}
                </DialogTitle>
                <DialogContent>
                    <p>{t('friends.removeDialog.body')}</p>
                </DialogContent>
                <DialogActions>
                    <ButtonCustom
                        type={BUTTON_VARIANT.LINE}
                        capitalizeType="uppercase"
                        label={t('friends.removeDialog.keep')}
                        onClick={handleUnfriendCancel}
                        disabled={unfriendMutation.isPending}
                    />
                    <ButtonCustom
                        type={BUTTON_VARIANT.STANDARD}
                        capitalizeType="uppercase"
                        label={
                            unfriendMutation.isPending
                                ? t('friends.removeDialog.removing')
                                : t('friends.removeDialog.confirm')
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
