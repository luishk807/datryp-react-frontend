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
import type { PlaceRecommendation } from 'types';

export interface ShareButtonProps {
    place: PlaceRecommendation;
    /** URL of the search results page (used for the share link and email deep-link). */
    searchUrl: string;
    /** `icon` (default): small circular icon button — used on result cards.
     *  `pill`: prominent icon+text pill — used as a primary action on the detail page. */
    variant?: 'icon' | 'pill';
}

const canNativeShare = (): boolean =>
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

const ShareButton = ({ place, searchUrl, variant = 'icon' }: ShareButtonProps) => {
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const emailModalRef = useRef<EmailShareModalHandle>(null);

    const closeMenu = () => setMenuAnchor(null);

    const handleNativeShare = async () => {
        closeMenu();
        try {
            await navigator.share({
                title: place.name,
                text: `Check out ${place.name} on daTryp`,
                url: searchUrl,
            });
        } catch {
            // User cancelled the share sheet or it's unsupported — silent.
        }
    };

    const handleCopy = async () => {
        closeMenu();
        try {
            await navigator.clipboard.writeText(searchUrl);
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
                    aria-label={`Share ${place.name}`}
                    onClick={(e) => setMenuAnchor(e.currentTarget)}
                >
                    <IosShareIcon className="share-button-pill-icon" />
                    <span>Share</span>
                </button>
            ) : (
                <IconButton
                    className="share-button-trigger"
                    aria-label={`Share ${place.name}`}
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
                <MenuActionItem
                    icon={<EmailRoundedIcon />}
                    label="Email"
                    onClick={handleEmail}
                />
            </Menu>

            <EmailShareModal
                ref={emailModalRef}
                place={place}
                searchUrl={searchUrl}
            />

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
