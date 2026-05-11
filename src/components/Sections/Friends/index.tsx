import { useRef, useState, type ReactNode } from 'react';
import Layout from 'components/common/Layout/SubLayout';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import { useUser, type UserFriend } from 'context/UserContext';
import './index.css';

interface FriendFormValues {
    name: string;
    email?: string;
    phone?: string;
}

export const Friends = () => {
    const { user, updateUser } = useUser();
    const modalRef = useRef<ModalButtonHandle>(null);
    const [editing, setEditing] = useState<UserFriend | null>(null);

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

    const handleOpenAdd = () => {
        setEditing(null);
        modalRef.current?.openModel();
    };

    const handleOpenEdit = (friend: UserFriend) => {
        setEditing(friend);
        modalRef.current?.openModel();
    };

    const handleSubmit = (data: FriendFormValues) => {
        if (editing) {
            const next = friends.map((f) =>
                f.id === editing.id ? { ...f, ...data } : f
            );
            updateUser({ friends: next });
        } else {
            const newFriend: UserFriend = {
                id: Date.now().toString(),
                name: data.name,
                email: data.email,
                phone: data.phone,
            };
            updateUser({ friends: [...friends, newFriend] });
        }
        modalRef.current?.closeModal();
        setEditing(null);
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
                                label="+ Add friend"
                                onClick={handleOpenAdd}
                            />
                        </div>
                    </div>

                    <div className="friends-list">
                        {friends.length === 0 ? (
                            <p className="friends-empty">
                                No friends added yet. Add one to get started.
                            </p>
                        ) : (
                            friends.map((f) => (
                                <div key={f.id} className="friend-row">
                                    <div className="friend-avatar">
                                        {f.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="friend-info">
                                        <span className="friend-name">{f.name}</span>
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
                                            className="friend-edit"
                                            onClick={() => handleOpenEdit(f)}
                                            aria-label={`Edit ${f.name}`}
                                        >
                                            Edit
                                        </button>
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

                <ModalButton
                    ref={modalRef}
                    title={editing ? 'Edit friend' : 'Add friend'}
                >
                    <FriendForm
                        key={editing?.id ?? 'new'}
                        initial={editing}
                        onSubmit={handleSubmit}
                    />
                </ModalButton>
            </div>
        </Layout>
    );
};

interface FriendFormProps {
    initial: UserFriend | null;
    onSubmit: (data: FriendFormValues) => void;
}

const FriendForm = ({ initial, onSubmit }: FriendFormProps) => {
    const [name, setName] = useState(initial?.name ?? '');
    const [email, setEmail] = useState(initial?.email ?? '');
    const [phone, setPhone] = useState(initial?.phone ?? '');
    const [error, setError] = useState<string | null>(null);

    const handleSave = () => {
        if (!name.trim()) {
            setError('Name is required.');
            return;
        }
        setError(null);
        onSubmit({
            name: name.trim(),
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
        });
    };

    return (
        <div className="friend-form">
            <FriendField label="Name">
                <input
                    className="friends-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Friend's name"
                    autoFocus
                />
            </FriendField>
            <FriendField label="Email">
                <input
                    className="friends-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                />
            </FriendField>
            <FriendField label="Phone">
                <input
                    className="friends-input"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555 123 4567"
                />
            </FriendField>

            {error && <div className="friend-form-error">{error}</div>}

            <div className="friend-form-actions">
                <ButtonCustom
                    type="standard"
                    capitalizeType="uppercase"
                    label={initial ? 'Save changes' : 'Add friend'}
                    onClick={handleSave}
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
