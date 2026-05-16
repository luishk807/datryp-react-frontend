import { useState } from 'react';
import './index.scss';
import { IconButton, Menu, MenuItem, Snackbar } from '@mui/material';
import IosShareIcon from '@mui/icons-material/IosShare';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import EmailShareModal from 'components/EmailShareModal';
import type { PlaceRecommendation } from 'types';

export interface ShareButtonProps {
    place: PlaceRecommendation;
    /** URL of the search results page (used for the share link and email deep-link). */
    searchUrl: string;
}

const canNativeShare = (): boolean =>
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

const ShareButton = ({ place, searchUrl }: ShareButtonProps) => {
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const [emailOpen, setEmailOpen] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

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
        setEmailOpen(true);
    };

    return (
        <div className="share-button-wrap">
            <IconButton
                className="share-button-trigger"
                aria-label={`Share ${place.name}`}
                onClick={(e) => setMenuAnchor(e.currentTarget)}
                size="small"
            >
                <IosShareIcon className="share-button-icon" />
            </IconButton>

            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={closeMenu}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{ paper: { className: 'share-menu' } }}
            >
                {canNativeShare() && (
                    <MenuItem onClick={handleNativeShare} className="share-menu-item">
                        <ShareRoundedIcon fontSize="small" /> Share…
                    </MenuItem>
                )}
                <MenuItem onClick={handleCopy} className="share-menu-item">
                    <ContentCopyRoundedIcon fontSize="small" /> Copy link
                </MenuItem>
                <MenuItem onClick={handleEmail} className="share-menu-item">
                    <EmailRoundedIcon fontSize="small" /> Email
                </MenuItem>
            </Menu>

            <EmailShareModal
                open={emailOpen}
                onClose={() => setEmailOpen(false)}
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
