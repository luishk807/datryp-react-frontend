import { useRef, useState, type ReactNode } from 'react';
import Layout from 'components/common/Layout/SubLayout';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import { useUser, type UserFriend } from 'context/UserContext';
import './index.css';

interface InviteFormValues {
    email: string;
}

const deriveNameFromEmail = (email: string): string => {
    const handle = email.split('@')[0] ?? email;
    return handle
        .split(/[._-]+/)
        .filter(Boolean)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ') || email;
};

export const Friends = () => {
    const { user, updateUser } = useUser();
    const modalRef = useRef<ModalButtonHandle>(null);

    if (!user) {
        return (
            <Layout title="Friends">
                <div className="friends-page friends-logged-out">
                    <p>Log in to manage your friends.</p>
                </div>
            </Layout>
        );
    }

    const friends = user.friends ?? [];

    const handleOpenInvite = () => {
        modalRef.current?.openModel();
    };

    const handleInvite = (data: InviteFormValues) => {
        const email = data.email.trim().toLowerCase();
        if (!email) return;
        if (friends.some((f) => f.email?.toLowerCase() === email)) {
            modalRef.current?.closeModal();
            return;
        }
        const newFriend: UserFriend = {
            id: email,
            name: deriveNameFromEmail(email),
            email,
            pending: true,
        };
        updateUser({ friends: [...friends, newFriend] });
        modalRef.current?.closeModal();
    };

    const handleRemove = (id: string) => {
        updateUser({ friends: friends.filter((f) => f.id !== id) });
    };

    return (
        <Layout title="Friends">
            <div className="friends-page">
                <section className="friends-card">
                    <div className="friends-card-header">
                        <div className="friends-card-headings">
                            <h2 className="friends-card-title">Your friends</h2>
                            <p className="friends-card-subtitle">
                                People you travel with — add them once and pick from
                                the list when planning a trip.
                            </p>
                        </div>
                        <div className="friends-card-actions">
                            <span className="friends-count">
                                {friends.length}{' '}
                                {friends.length === 1 ? 'friend' : 'friends'}
                            </span>
                            <ButtonCustom
                                type="standard"
                                capitalizeType="uppercase"
                                label="+ Invite friend"
                                onClick={handleOpenInvite}
                            />
                        </div>
                    </div>

                    <div className="friends-list">
                        {friends.length === 0 ? (
                            <p className="friends-empty">
                                No friends yet. Invite one to get started.
                            </p>
                        ) : (
                            friends.map((f) => (
                                <div key={f.id} className="friend-row">
                                    <div className="friend-avatar">
                                        {f.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="friend-info">
                                        <span className="friend-name">
                                            {f.name}
                                            {f.pending && (
                                                <span className="friend-pending-badge">
                                                    Invited
                                                </span>
                                            )}
                                        </span>
                                        {(f.email || f.phone) && (
                                            <div className="friend-meta">
                                                {f.email && (
                                                    <span className="friend-meta-item">
                                                        {f.email}
                                                    </span>
                                                )}
                                                {f.phone && (
                                                    <span className="friend-meta-item">
                                                        {f.phone}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="friend-actions">
                                        <button
                                            type="button"
                                            className="friend-remove"
                                            onClick={() => handleRemove(f.id)}
                                            aria-label={`Remove ${f.name}`}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                <ModalButton ref={modalRef} title="Invite a friend">
                    <InviteForm onSubmit={handleInvite} />
                </ModalButton>
            </div>
        </Layout>
    );
};

interface InviteFormProps {
    onSubmit: (data: InviteFormValues) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const InviteForm = ({ onSubmit }: InviteFormProps) => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSend = () => {
        const trimmed = email.trim();
        if (!EMAIL_RE.test(trimmed)) {
            setError('Enter a valid email address.');
            return;
        }
        setError(null);
        onSubmit({ email: trimmed });
    };

    return (
        <div className="friend-form">
            <p className="friend-form-helper">
                We'll send them an invite to join your trips.
            </p>
            <FriendField label="Email">
                <input
                    className="friends-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    autoFocus
                />
            </FriendField>

            {error && <div className="friend-form-error">{error}</div>}

            <div className="friend-form-actions">
                <ButtonCustom
                    type="standard"
                    capitalizeType="uppercase"
                    label="Send invite"
                    onClick={handleSend}
                />
            </div>
        </div>
    );
};

interface FriendFieldProps {
    label: string;
    children: ReactNode;
}

const FriendField = ({ label, children }: FriendFieldProps) => (
    <label className="friend-form-field">
        <span className="friend-form-label">{label}</span>
        {children}
    </label>
);

export default Friends;
