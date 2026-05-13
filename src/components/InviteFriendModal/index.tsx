import { useEffect, useState } from 'react';
import {
    IconButton,
    Modal,
    TextField,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import { useUser, type UserFriend } from 'context/UserContext';
import 'components/ModalButton/index.scss';
import './index.scss';

interface InviteFriendModalProps {
    open: boolean;
    onClose: () => void;
    onInvited?: (friend: UserFriend) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

const InviteFriendModal = ({
    open,
    onClose,
    onInvited,
}: InviteFriendModalProps) => {
    const { user, updateUser } = useUser();
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setEmail('');
            setError(null);
        }
    }, [open]);

    const handleSend = () => {
        const trimmed = email.trim().toLowerCase();
        if (!EMAIL_RE.test(trimmed)) {
            setError('Enter a valid email address.');
            return;
        }

        const friends = user?.friends ?? [];
        const existing = friends.find(
            (f) => f.email?.toLowerCase() === trimmed
        );

        let friend: UserFriend;
        if (existing) {
            friend = existing;
        } else {
            friend = {
                id: trimmed,
                name: deriveNameFromEmail(trimmed),
                email: trimmed,
                pending: true,
            };
            updateUser({ friends: [...friends, friend] });
        }

        onInvited?.(friend);
        onClose();
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            aria-labelledby="invite-friend-title"
        >
            <div className="modalCustom invite-friend-modal">
                <span className="modalCustom-stripe" aria-hidden="true" />
                <div className="modalCustom-header">
                    <h2 id="invite-friend-title" className="modalCustom-title">
                        Invite a friend
                    </h2>
                    <IconButton
                        className="modalCustom-close"
                        aria-label="Close"
                        onClick={onClose}
                    >
                        <CloseRoundedIcon />
                    </IconButton>
                </div>
                <div className="modalCustom-content">
                    <p className="invite-friend-helper">
                        We'll send them an invite by email.
                    </p>
                    <TextField
                        autoFocus
                        fullWidth
                        type="email"
                        label="Email"
                        placeholder="email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        error={!!error}
                        helperText={error ?? ' '}
                        sx={{ mt: 1 }}
                    />
                    <div className="invite-friend-actions">
                        <ButtonCustom
                            type="standard"
                            capitalizeType="uppercase"
                            label="Send invite"
                            onClick={handleSend}
                        />
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default InviteFriendModal;
