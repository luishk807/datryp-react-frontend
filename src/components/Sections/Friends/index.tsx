import { useState } from 'react';
import Layout from 'components/common/Layout/SubLayout';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import InviteFriendModal from 'components/InviteFriendModal';
import { useUser } from 'context/UserContext';
import './index.css';

export const Friends = () => {
    const { user, updateUser } = useUser();
    const [inviteOpen, setInviteOpen] = useState(false);

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
                                onClick={() => setInviteOpen(true)}
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

                <InviteFriendModal
                    open={inviteOpen}
                    onClose={() => setInviteOpen(false)}
                />
            </div>
        </Layout>
    );
};

export default Friends;
