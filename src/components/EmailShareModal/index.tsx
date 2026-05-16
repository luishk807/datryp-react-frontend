import {
    forwardRef,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';
import './index.scss';
import { Grid } from '@mui/material';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import InputField from 'components/common/FormFields/InputField';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import { useShareEmail } from 'api/hooks/useShareEmail';
import { useUser } from 'context/UserContext';
import { EMAIL_REGEX } from 'constants';
import type { PlaceRecommendation } from 'types';

export interface EmailShareModalProps {
    place: PlaceRecommendation;
    /** Full URL of the search page to deep-link the recipient back to. */
    searchUrl: string;
}

export interface EmailShareModalHandle {
    /** Opens the modal and resets the form for a fresh share. */
    open: () => void;
    /** Closes the modal without touching form state. */
    close: () => void;
}

const EmailShareModal = forwardRef<EmailShareModalHandle, EmailShareModalProps>(
    ({ place, searchUrl }, ref) => {
        const modalRef = useRef<ModalButtonHandle>(null);
        const { user } = useUser();
        const [recipient, setRecipient] = useState('');
        const [message, setMessage] = useState('');
        const [error, setError] = useState<string | null>(null);

        const { mutate, isPending, isSuccess, reset } = useShareEmail();

        useImperativeHandle(ref, () => ({
            open: () => {
                // Reset form state for a clean share — same effect the old
                // `open` prop + useEffect achieved.
                setRecipient('');
                setMessage('');
                setError(null);
                reset();
                modalRef.current?.openModel();
            },
            close: () => modalRef.current?.closeModal(),
        }));

        const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
            e.preventDefault();
            const to = recipient.trim();
            if (!EMAIL_REGEX.test(to)) {
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
                        setTimeout(() => modalRef.current?.closeModal(), 900);
                    },
                    onError: (err) => setError(err.message),
                }
            );
        };

        return (
            <ModalButton ref={modalRef} title="Email this place">
                <Grid container>
                    <Grid item lg={12} xs={12} md={12} className="form-input">
                        <div className="email-share-context">
                            <PlaceRoundedIcon className="email-share-context-icon" />
                            <div className="email-share-context-text">
                                <span className="email-share-context-name">
                                    {place.name}
                                </span>
                                <span className="email-share-context-location">
                                    {place.city} · {place.country}
                                </span>
                            </div>
                        </div>
                    </Grid>
                    <Grid item lg={12} xs={12} md={12} className="form-input">
                        <InputField
                            label="Recipient email"
                            type="email"
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            placeholder="friend@example.com"
                            required={false}
                        />
                    </Grid>
                    <Grid item lg={12} xs={12} md={12} className="form-input">
                        <InputField
                            label="Personal note (optional)"
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Thought you'd love this!"
                            required={false}
                        />
                    </Grid>
                    {error && (
                        <Grid
                            item
                            lg={12}
                            xs={12}
                            md={12}
                            className="form-input form-error"
                            role="alert"
                        >
                            {error}
                        </Grid>
                    )}
                    {isSuccess && !error && (
                        <Grid
                            item
                            lg={12}
                            xs={12}
                            md={12}
                            className="form-input email-share-success"
                            role="status"
                        >
                            Email sent.
                        </Grid>
                    )}
                    <Grid item lg={12} xs={12} md={12} className="form-input">
                        <ButtonCustom
                            label={isPending ? 'Sending…' : 'Send'}
                            onClick={handleSubmit}
                            capitalizeType="uppercase"
                            disabled={isPending || isSuccess}
                        />
                    </Grid>
                </Grid>
            </ModalButton>
        );
    }
);

EmailShareModal.displayName = 'EmailShareModal';

export default EmailShareModal;
