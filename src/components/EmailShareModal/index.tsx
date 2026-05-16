import { useEffect, useState } from 'react';
import './index.scss';
import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
} from '@mui/material';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import InputField from 'components/common/FormFields/InputField';
import { useShareEmail } from 'api/hooks/useShareEmail';
import { useUser } from 'context/UserContext';
import { BUTTON_VARIANT } from 'constants';
import type { PlaceRecommendation } from 'types';

export interface EmailShareModalProps {
    open: boolean;
    onClose: () => void;
    place: PlaceRecommendation;
    /** Full URL of the search page to deep-link the recipient back to. */
    searchUrl: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EmailShareModal = ({ open, onClose, place, searchUrl }: EmailShareModalProps) => {
    const { user } = useUser();
    const [recipient, setRecipient] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState<string | null>(null);

    const { mutate, isPending, isSuccess, reset } = useShareEmail();

    // Reset form whenever the modal opens for a new place.
    useEffect(() => {
        if (open) {
            setRecipient('');
            setMessage('');
            setError(null);
            reset();
        }
    }, [open, place.name, reset]);

    const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        const to = recipient.trim();
        if (!EMAIL_RE.test(to)) {
            setError('Enter a valid email address.');
            return;
        }
        setError(null);
        mutate(
            {
                to,
                place: {
                    name: place.name,
                    city: place.city,
                    country: place.country,
                    description: place.description,
                    image_url: place.imageUrl,
                },
                search_url: searchUrl,
                sender_name: user?.name ?? null,
                personal_message: message.trim() || null,
            },
            {
                onSuccess: () => {
                    // Brief success state then close.
                    setTimeout(onClose, 900);
                },
                onError: (err) => setError(err.message),
            }
        );
    };

    return (
        <Dialog open={open} onClose={onClose} className="email-share-dialog" maxWidth="xs" fullWidth>
            <DialogTitle className="email-share-title">Email this place</DialogTitle>
            <DialogContent className="email-share-content">
                <p className="email-share-subtitle">
                    Sending <strong>{place.name}</strong> ({place.city} · {place.country})
                </p>
                <div className="email-share-field">
                    <InputField
                        variant="bare"
                        label="Recipient email"
                        type="email"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        placeholder="friend@example.com"
                        required={false}
                    />
                </div>
                <div className="email-share-field">
                    <InputField
                        variant="bare"
                        label="Personal note (optional)"
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Thought you'd love this!"
                        required={false}
                    />
                </div>
                {error && (
                    <p className="email-share-error" role="alert">
                        {error}
                    </p>
                )}
                {isSuccess && !error && (
                    <p className="email-share-success" role="status">
                        Email sent.
                    </p>
                )}
            </DialogContent>
            <DialogActions className="email-share-actions">
                <ButtonCustom
                    type={BUTTON_VARIANT.STANDARD_SMALL}
                    capitalizeType="none"
                    label="Cancel"
                    onClick={onClose}
                    disabled={isPending}
                />
                <ButtonCustom
                    type={BUTTON_VARIANT.STANDARD_SMALL}
                    capitalizeType="uppercase"
                    label={isPending ? 'Sending…' : 'Send'}
                    onClick={handleSubmit}
                    disabled={isPending || isSuccess}
                />
            </DialogActions>
        </Dialog>
    );
};

export default EmailShareModal;
