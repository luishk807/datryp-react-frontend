import {
    forwardRef,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import './index.scss';
import { Grid } from '@mui/material';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import InputField from 'components/common/FormFields/InputField';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import { useShareEmail } from 'api/hooks/useShareEmail';
import { useUser } from 'context/UserContext';
import { EMAIL_REGEX } from 'constants';
import type { SharePlacePayload } from 'types';

export interface EmailShareModalProps {
    /** Wire-shaped share payload — same fields the backend SendGrid
     *  template renders. `city` may be empty for shares that aren't
     *  city-scoped (e.g. a country share); `description` may be empty
     *  when the source page doesn't expose a one-line summary. */
    place: SharePlacePayload;
    /** Full URL the recipient should land on. */
    searchUrl: string;
}

export interface EmailShareModalHandle {
    /** Opens the modal and resets the form for a fresh share. */
    open: () => void;
    /** Closes the modal without touching form state. */
    close: () => void;
}

/**
 * Parse the comma/whitespace-separated "to" input into a deduplicated
 * list of valid addresses. Invalid tokens are returned separately so
 * the UI can flag them to the sender without dropping the field's text.
 */
const parseRecipients = (
    raw: string
): { valid: string[]; invalid: string[] } => {
    const seen = new Set<string>();
    const valid: string[] = [];
    const invalid: string[] = [];
    raw
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((token) => {
            const lower = token.toLowerCase();
            if (seen.has(lower)) return;
            seen.add(lower);
            if (EMAIL_REGEX.test(token)) {
                valid.push(token);
            } else {
                invalid.push(token);
            }
        });
    return { valid, invalid };
};

const EmailShareModal = forwardRef<EmailShareModalHandle, EmailShareModalProps>(
    ({ place, searchUrl }, ref) => {
        const { t } = useTranslation();
        const modalRef = useRef<ModalButtonHandle>(null);
        const { user } = useUser();
        const [recipients, setRecipients] = useState('');
        const [message, setMessage] = useState('');
        const [error, setError] = useState<string | null>(null);

        const { mutate, isPending, isSuccess, reset } = useShareEmail();

        useImperativeHandle(ref, () => ({
            open: () => {
                setRecipients('');
                setMessage('');
                setError(null);
                reset();
                modalRef.current?.openModel();
            },
            close: () => modalRef.current?.closeModal(),
        }));

        // Live parse — drives the helper hint under the input and the
        // disabled state of the Send button without forcing the user
        // to blur the field first.
        const parsed = useMemo(
            () => parseRecipients(recipients),
            [recipients]
        );

        const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
            e.preventDefault();
            if (parsed.invalid.length > 0) {
                setError(
                    t('share.email.invalidError', {
                        emails: parsed.invalid.join(', '),
                    })
                );
                return;
            }
            if (parsed.valid.length === 0) {
                setError(t('share.email.emptyError'));
                return;
            }
            setError(null);
            mutate(
                {
                    to: parsed.valid,
                    place,
                    search_url: searchUrl,
                    sender_name: user?.name ?? null,
                    personal_message: message.trim() || null,
                },
                {
                    onSuccess: () => {
                        setTimeout(() => modalRef.current?.closeModal(), 900);
                    },
                    onError: (err) => setError(err.message),
                }
            );
        };

        const recipientHint =
            parsed.valid.length > 0 || parsed.invalid.length > 0
                ? `${t('share.email.validCount', { n: parsed.valid.length })}${
                      parsed.invalid.length > 0
                          ? `, ${t('share.email.invalidCount', {
                                n: parsed.invalid.length,
                            })}`
                          : ''
                  }`
                : t('share.email.hint');

        return (
            <ModalButton ref={modalRef} title={t('share.email.title')}>
                <Grid container>
                    <Grid item lg={12} xs={12} md={12} className="form-input">
                        <div className="email-share-context">
                            <PlaceRoundedIcon className="email-share-context-icon" />
                            <div className="email-share-context-text">
                                <span className="email-share-context-name">
                                    {place.name}
                                </span>
                                <span className="email-share-context-location">
                                    {[place.city, place.country]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </span>
                            </div>
                        </div>
                    </Grid>
                    <Grid item lg={12} xs={12} md={12} className="form-input">
                        <InputField
                            label={t('share.email.recipients')}
                            type="text"
                            value={recipients}
                            onChange={(e) => setRecipients(e.target.value)}
                            placeholder="alex@example.com, jamie@example.com"
                            required={false}
                        />
                        <p className="email-share-hint">{recipientHint}</p>
                    </Grid>
                    <Grid item lg={12} xs={12} md={12} className="form-input">
                        <InputField
                            label={t('share.email.note')}
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={t('share.email.notePlaceholder')}
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
                            {parsed.valid.length === 1
                                ? t('share.email.sentOne', {
                                      n: parsed.valid.length,
                                  })
                                : t('share.email.sentOther', {
                                      n: parsed.valid.length,
                                  })}
                        </Grid>
                    )}
                    <Grid item lg={12} xs={12} md={12} className="form-input">
                        <ButtonCustom
                            label={
                                isPending
                                    ? t('share.email.sending')
                                    : t('share.email.send')
                            }
                            onClick={handleSubmit}
                            capitalizeType="uppercase"
                            disabled={
                                isPending ||
                                isSuccess ||
                                parsed.valid.length === 0 ||
                                parsed.invalid.length > 0
                            }
                        />
                    </Grid>
                </Grid>
            </ModalButton>
        );
    }
);

EmailShareModal.displayName = 'EmailShareModal';

export default EmailShareModal;
