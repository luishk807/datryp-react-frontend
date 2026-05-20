import { useRef, useState } from 'react';
import './index.scss';
import { IconButton, Snackbar } from '@mui/material';
import Menu, { MenuActionItem } from 'components/common/Menu';
import IosShareIcon from '@mui/icons-material/IosShare';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import classNames from 'classnames';
import EmailShareModal, {
    type EmailShareModalHandle,
} from 'components/EmailShareModal';
import type { SharePlacePayload } from 'types';

export interface ShareButtonProps {
    /** What the user is sharing (city name, place name, country name, …). */
    title: string;
    /** Optional secondary line (e.g. "Vancouver · Canada"). Used in the
     *  native share sheet's `text` slot when present. */
    subtitle?: string;
    /** Canonical URL the recipient should land on. */
    url: string;
    /** `icon` (default): small circular icon button — used on result cards.
     *  `pill`: prominent icon+text pill — used as a primary action on the
     *  detail page. */
    variant?: 'icon' | 'pill';
    /** Payload for the SendGrid email template. When provided, the menu
     *  shows an "Email" option that opens the EmailShareModal. Omit on
     *  surfaces where an email share doesn't make sense (or until we
     *  generalize the email template). */
    emailPayload?: SharePlacePayload;
}

const canNativeShare = (): boolean =>
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

const ShareButton = ({
    title,
    subtitle,
    url,
    variant = 'icon',
    emailPayload,
}: ShareButtonProps) => {
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const emailModalRef = useRef<EmailShareModalHandle>(null);

    const closeMenu = () => setMenuAnchor(null);

    const handleNativeShare = async () => {
        closeMenu();
        try {
            await navigator.share({
                title,
                text: subtitle
                    ? `${title} — ${subtitle}`
                    : `Check out ${title} on daTryp`,
                url,
            });
        } catch {
            // User cancelled the share sheet or it's unsupported — silent.
        }
    };

    const handleCopy = async () => {
        closeMenu();
        try {
            await navigator.clipboard.writeText(url);
            setToast('Link copied to clipboard');
        } catch {
            setToast('Could not copy link');
        }
    };

    const handleEmail = () => {
        closeMenu();
        emailModalRef.current?.open();
    };

    return (
        <div className={classNames('share-button-wrap', `variant-${variant}`)}>
            {variant === 'pill' ? (
                <button
                    type="button"
                    className="share-button-pill"
                    aria-label={`Share ${title}`}
                    onClick={(e) => setMenuAnchor(e.currentTarget)}
                >
                    <IosShareIcon className="share-button-pill-icon" />
                    <span>Share</span>
                </button>
            ) : (
                <IconButton
                    className="share-button-trigger"
                    aria-label={`Share ${title}`}
                    onClick={(e) => setMenuAnchor(e.currentTarget)}
                    size="small"
                >
                    <IosShareIcon className="share-button-icon" />
                </IconButton>
            )}

            <Menu anchorEl={menuAnchor} onClose={closeMenu}>
                {canNativeShare() && (
                    <MenuActionItem
                        icon={<ShareRoundedIcon />}
                        label="Share…"
                        onClick={handleNativeShare}
                    />
                )}
                <MenuActionItem
                    icon={<ContentCopyRoundedIcon />}
                    label="Copy link"
                    onClick={handleCopy}
                />
                {emailPayload && (
                    <MenuActionItem
                        icon={<EmailRoundedIcon />}
                        label="Email"
                        onClick={handleEmail}
                    />
                )}
            </Menu>

            {emailPayload && (
                <EmailShareModal
                    ref={emailModalRef}
                    place={emailPayload}
                    searchUrl={url}
                />
            )}

            <Snackbar
                open={Boolean(toast)}
                onClose={() => setToast(null)}
                autoHideDuration={2200}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                message={toast}
            />
        </div>
    );
};

export default ShareButton;
