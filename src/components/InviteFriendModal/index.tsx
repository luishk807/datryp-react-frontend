import {
    forwardRef,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import InputField from 'components/common/FormFields/InputField';
import { useUser, type UserFriend } from 'context/UserContext';
import { inviteFriendByEmail } from 'api/friendsApi';
import { EMAIL_REGEX } from 'constants';
import './index.scss';

interface InviteFriendModalProps {
    /** Fires after a successful invite — receives a UserFriend object so the
     *  parent can drop a pending row into FriendPicker / friends lists
     *  before the server-side state actually propagates. */
    onInvited?: (friend: UserFriend) => void;
}

const deriveNameFromEmail = (email: string): string => {
    const handle = email.split('@')[0] ?? email;
    return (
        handle
            .split(/[._-]+/)
            .filter(Boolean)
            .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
            .join(' ') || email
    );
};

/**
 * Email-driven friend invitation modal. Wraps `ModalButton` so it follows
 * the same imperative open/close pattern as every other modal in the app:
 * the parent grabs a ref, calls `inviteRef.current?.openModel()` to show it.
 *
 * Branch handling happens server-side via `POST /friends/invite-by-email`:
 * recipient is a daTryp user → friend request + email; not registered →
 * "Join daTryp" invitation email. Either branch returns a message string
 * the modal shows inline for a beat before auto-closing.
 */
const InviteFriendModal = forwardRef<ModalButtonHandle, InviteFriendModalProps>(
    ({ onInvited }, ref) => {
        const modalRef = useRef<ModalButtonHandle>(null);
        const { user, updateUser } = useUser();
        const [email, setEmail] = useState('');
        const [error, setError] = useState<string | null>(null);
        const [submitting, setSubmitting] = useState(false);
        const [confirm, setConfirm] = useState<string | null>(null);

        // Reset state on every parent-triggered open. ModalButton has no
        // `onOpen` callback, so we intercept the imperative open and clean
        // state ourselves before delegating to it.
        useImperativeHandle(ref, () => ({
            openModel: () => {
                setEmail('');
                setError(null);
                setConfirm(null);
                modalRef.current?.openModel();
            },
            closeModal: () => modalRef.current?.closeModal(),
        }));

        const handleSend = async () => {
            if (submitting) return;
            const trimmed = email.trim().toLowerCase();
            if (!EMAIL_REGEX.test(trimmed)) {
                setError('Enter a valid email address.');
                return;
            }
            setError(null);
            setSubmitting(true);
            try {
                const result = await inviteFriendByEmail(trimmed);

                // Optimistic local-friends update so FriendPicker reflects the
                // pending invite immediately. The Friends section pulls from
                // the backend directly, so it isn't affected.
                const friends = user?.friends ?? [];
                const existing = friends.find(
                    (f) => f.email?.toLowerCase() === trimmed
                );
                const friend: UserFriend = existing ?? {
                    id: trimmed,
                    name: deriveNameFromEmail(trimmed),
                    email: trimmed,
                    pending: true,
                };
                if (!existing) {
                    updateUser({ friends: [...friends, friend] });
                }
                onInvited?.(friend);

                setConfirm(result.message);
                // Brief flash so the user sees confirmation before close.
                window.setTimeout(() => modalRef.current?.closeModal(), 1400);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : 'Could not send the invite.'
                );
            } finally {
                setSubmitting(false);
            }
        };

        return (
            <ModalButton ref={modalRef} title="Invite a friend">
                <div className="invite-friend-content">
                    {confirm ? (
                        <p
                            className="invite-friend-confirm"
                            role="status"
                            aria-live="polite"
                        >
                            {confirm}
                        </p>
                    ) : (
                        <>
                            <p className="invite-friend-helper">
                                If they&rsquo;re already on daTryp,
                                we&rsquo;ll send them a friend request.
                                Otherwise we&rsquo;ll email them an invitation
                                to sign up.
                            </p>
                            <InputField
                                name="email"
                                type="email"
                                label="Email"
                                placeholder="email@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={submitting}
                                required
                            />
                            {error && (
                                <p
                                    className="invite-friend-error"
                                    role="alert"
                                >
                                    {error}
                                </p>
                            )}
                            <div className="invite-friend-actions">
                                <ButtonCustom
                                    type="standard"
                                    capitalizeType="uppercase"
                                    label={
                                        submitting ? 'Sending…' : 'Send invite'
                                    }
                                    onClick={handleSend}
                                    disabled={submitting}
                                />
                            </div>
                        </>
                    )}
                </div>
            </ModalButton>
        );
    }
);

InviteFriendModal.displayName = 'InviteFriendModal';

export default InviteFriendModal;
