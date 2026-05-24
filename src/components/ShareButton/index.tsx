import { useRef, useState } from 'react';
import './index.scss';
import { IconButton, Snackbar } from '@mui/material';
import IosShareIcon from '@mui/icons-material/IosShare';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import FacebookIcon from '@mui/icons-material/Facebook';
import XIcon from '@mui/icons-material/X';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import classNames from 'classnames';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import EmailShareModal, {
    type EmailShareModalHandle,
} from 'components/EmailShareModal';
import { buildSharePreviewUrl } from 'utils/sharePreviewUrl';
import type { SharePlacePayload } from 'types';

export interface ShareButtonProps {
    /** What the user is sharing (city name, place name, country name, …). */
    title: string;
    /** Optional secondary line (e.g. "Vancouver · Canada"). Surfaces in
     *  the share-preview card AND in the native share sheet's `text`
     *  slot. */
    subtitle?: string;
    /** Canonical URL the recipient should land on. */
    url: string;
    /** Hero image of the thing being shared — drives the preview card
     *  in the modal so the user can SEE what they're about to share. */
    imageUrl?: string | null;
    /** 1–2 sentence pitch for what's at the URL. Used in the modal
     *  preview body and prepended to WhatsApp/email/native share text
     *  so the recipient knows why they got the link. */
    description?: string;
    /** `icon` (default): small circular icon button — used on result cards.
     *  `pill`: prominent icon+text pill — used as a primary action on the
     *  detail page. */
    variant?: 'icon' | 'pill';
    /** Payload for the SendGrid email template. When provided, the modal
     *  shows the "Email" channel; omit on surfaces where email sharing
     *  doesn't apply. */
    emailPayload?: SharePlacePayload;
}

const canNativeShare = (): boolean =>
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

/** Body text used by social/email intent URLs. Includes the title +
 *  subtitle and (optionally) the description so the recipient gets a
 *  proper pitch — not just a bare URL. Same string we hand to the
 *  native share sheet for consistency across channels. */
const buildShareText = (
    title: string,
    subtitle?: string,
    description?: string
): string => {
    const head = subtitle ? `${title} — ${subtitle}` : title;
    const body = description?.trim();
    return body ? `${head}: ${body}` : `Check out ${head} on DaTryp.com`;
};

const openIntent = (intentUrl: string) => {
    // `noopener,noreferrer` keeps the share target from grabbing our
    // window.opener handle.
    window.open(intentUrl, '_blank', 'noopener,noreferrer');
};

const ShareButton = ({
    title,
    subtitle,
    url,
    imageUrl,
    description,
    variant = 'icon',
    emailPayload,
}: ShareButtonProps) => {
    const modalRef = useRef<ModalButtonHandle>(null);
    const emailModalRef = useRef<EmailShareModalHandle>(null);
    const [toast, setToast] = useState<string | null>(null);

    const openShare = () => modalRef.current?.openModel();
    const closeShare = () => modalRef.current?.closeModal();

    // Long form for WhatsApp / Email / native share — they support
    // multi-line bodies so we can include the description.
    const longShareText = buildShareText(title, subtitle, description);
    // Short headline for Twitter — strict char budget, skip the body.
    const shortShareText = subtitle
        ? `${title} — ${subtitle}`
        : `Check out ${title} on DaTryp.com`;
    // The URL that gets crawled by social platforms for the rich
    // unfurl preview. Routes through the backend's /share/preview
    // endpoint which serves OG-tagged HTML + meta-refreshes humans
    // to the canonical frontend URL. See buildPreviewUrl above.
    const previewUrl = buildSharePreviewUrl({
        title,
        subtitle,
        description,
        imageUrl,
        canonicalUrl: url,
    });

    const encodedPreviewUrl = encodeURIComponent(previewUrl);
    const encodedCanonicalUrl = encodeURIComponent(url);
    const encodedShortText = encodeURIComponent(shortShareText);
    const encodedLongTextWithCanonicalUrl = encodeURIComponent(
        `${longShareText} ${url}`
    );

    const handleFacebook = () => {
        closeShare();
        // Facebook's share dialog encapsulates the URL inside a card —
        // users never see the raw URL string. So we route through
        // /share/preview to get rich OG tags on the unfurl.
        openIntent(
            `https://www.facebook.com/sharer/sharer.php?u=${encodedPreviewUrl}`
        );
    };

    const handleTwitter = () => {
        closeShare();
        // X / Twitter writes the URL inline into the tweet compose box.
        // Sending the long /share/preview URL means the user stares at
        // a wall of `?title=...&description=...&image=...` text before
        // posting. Use the canonical URL instead — it's short and
        // recognizable. Trade-off: the card preview falls back to the
        // SPA's static homepage OG tags. Worth it for the cleaner
        // compose experience.
        openIntent(
            `https://twitter.com/intent/tweet?url=${encodedCanonicalUrl}&text=${encodedShortText}`
        );
    };

    const handleWhatsApp = () => {
        closeShare();
        // WhatsApp displays the URL as literal text in the message
        // bubble. The previous /share/preview routing produced an
        // unreadable wall of URL-encoded params on the long AWS ECS
        // hostname (see screenshot from user). Use the canonical
        // datryp.com URL instead so the message stays readable.
        // Unfurl falls back to the homepage OG tags (acceptable —
        // users already accept that for the search/results page).
        openIntent(
            `https://wa.me/?text=${encodedLongTextWithCanonicalUrl}`
        );
    };

    const handleEmail = () => {
        closeShare();
        emailModalRef.current?.open();
    };

    const handleCopy = async () => {
        closeShare();
        try {
            await navigator.clipboard.writeText(url);
            setToast('Link copied to clipboard');
        } catch {
            setToast('Could not copy link');
        }
    };

    const handleNativeShare = async () => {
        closeShare();
        try {
            await navigator.share({
                title,
                text: longShareText,
                url,
            });
        } catch {
            // User dismissed the share sheet — silent.
        }
    };

    return (
        <div className={classNames('share-button-wrap', `variant-${variant}`)}>
            {variant === 'pill' ? (
                <button
                    type="button"
                    className="share-button-pill"
                    aria-label={`Share ${title}`}
                    onClick={openShare}
                >
                    <IosShareIcon className="share-button-pill-icon" />
                    <span>Share</span>
                </button>
            ) : (
                <IconButton
                    className="share-button-trigger"
                    aria-label={`Share ${title}`}
                    onClick={openShare}
                    size="small"
                >
                    <IosShareIcon className="share-button-icon" />
                </IconButton>
            )}

            <ModalButton ref={modalRef} title="Share">
                <div className="share-modal">
                    {/* Localhost-testing hint — when running against a
                        local backend, social crawlers (Twitter/FB/WhatsApp)
                        can't reach the URL, so the rich unfurl preview
                        won't render. Production URLs unfurl correctly. */}
                    {/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(previewUrl) && (
                        <p className="share-modal-dev-note">
                            Heads-up: this is a localhost preview URL.
                            Facebook / X / WhatsApp can't reach it, so the
                            rich card won't unfurl while testing locally.
                            It works on production.
                        </p>
                    )}
                    {/* Preview card — mirrors the rough shape of what a
                        social-link unfurl will look like once the URL is
                        shared. Image + title + subtitle + description so
                        the sender sees exactly what they're about to send. */}
                    <div className="share-modal-preview">
                        {imageUrl ? (
                            <img
                                src={imageUrl}
                                alt=""
                                className="share-modal-preview-img"
                                loading="lazy"
                            />
                        ) : (
                            <div className="share-modal-preview-img is-placeholder" />
                        )}
                        <div className="share-modal-preview-body">
                            <span className="share-modal-preview-title">
                                {title}
                            </span>
                            {subtitle && (
                                <span className="share-modal-preview-subtitle">
                                    {subtitle}
                                </span>
                            )}
                            {description && (
                                <p className="share-modal-preview-description">
                                    {description}
                                </p>
                            )}
                            <span className="share-modal-preview-domain">
                                datryp.com
                            </span>
                        </div>
                    </div>

                    <div className="share-modal-channels">
                        <button
                            type="button"
                            className="share-channel is-facebook"
                            onClick={handleFacebook}
                            aria-label="Share on Facebook"
                        >
                            <span className="share-channel-icon">
                                <FacebookIcon />
                            </span>
                            <span>Facebook</span>
                        </button>
                        <button
                            type="button"
                            className="share-channel is-x"
                            onClick={handleTwitter}
                            aria-label="Share on X"
                        >
                            <span className="share-channel-icon">
                                <XIcon />
                            </span>
                            <span>X</span>
                        </button>
                        <button
                            type="button"
                            className="share-channel is-whatsapp"
                            onClick={handleWhatsApp}
                            aria-label="Share on WhatsApp"
                        >
                            <span className="share-channel-icon">
                                <WhatsAppIcon />
                            </span>
                            <span>WhatsApp</span>
                        </button>
                        {emailPayload && (
                            <button
                                type="button"
                                className="share-channel is-email"
                                onClick={handleEmail}
                                aria-label="Share via email"
                            >
                                <span className="share-channel-icon">
                                    <EmailRoundedIcon />
                                </span>
                                <span>Email</span>
                            </button>
                        )}
                        <button
                            type="button"
                            className="share-channel is-copy"
                            onClick={handleCopy}
                            aria-label="Copy link"
                        >
                            <span className="share-channel-icon">
                                <ContentCopyRoundedIcon />
                            </span>
                            <span>Copy link</span>
                        </button>
                        {canNativeShare() && (
                            <button
                                type="button"
                                className="share-channel is-more"
                                onClick={handleNativeShare}
                                aria-label="More sharing options"
                            >
                                <span className="share-channel-icon">
                                    <MoreHorizRoundedIcon />
                                </span>
                                <span>More</span>
                            </button>
                        )}
                    </div>
                </div>
            </ModalButton>

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
