/**
 * Offline-download control for a trip's itinerary. Shows a "Download
 * offline" button when nothing is saved, a "Saved offline" status chip
 * once a snapshot exists, and a "Saving…" state mid-download. Driven by
 * useOfflineTrip in TripDetail. Only rendered for Confirmed trips (the
 * itinerary is locked then, so the snapshot never goes stale).
 *
 * Removal is a two-tap confirm on the chip itself (no separate trash
 * button): first tap arms a warning, second tap removes. Auto-disarms
 * after a few seconds so it can't get stuck in the warning state.
 */
import { useEffect, useState } from 'react';
import classNames from 'classnames';
import DownloadForOfflineOutlinedIcon from '@mui/icons-material/DownloadForOfflineOutlined';
import CloudDoneRoundedIcon from '@mui/icons-material/CloudDoneRounded';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ButtonIcon from 'components/common/FormFields/ButtonIcon';
import { BUTTON_VARIANT, OFFLINE_STATUS } from 'constants';
import type { OfflineStatus } from 'types';
import './index.scss';

export interface TripOfflineButtonProps {
    status: OfflineStatus;
    /** Epoch ms the snapshot was saved; null when not downloaded. */
    savedAt: number | null;
    /** Browser offline — disables the initial download (there's no live
     *  data to snapshot offline). */
    isOffline: boolean;
    onDownload: () => void;
    onRemove: () => void;
}

/** How long the "tap again to remove" warning stays armed before it
 *  auto-disarms back to the normal saved chip. */
const REMOVE_CONFIRM_TIMEOUT = 3500;

/** Short, human "saved 5m ago" / "saved on Jun 4" label. */
const formatSavedAt = (savedAt: number): string => {
    const diffMs = Date.now() - savedAt;
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    return new Date(savedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    });
};

const TripOfflineButton = ({
    status,
    savedAt,
    isOffline,
    onDownload,
    onRemove,
}: TripOfflineButtonProps) => {
    // Two-tap remove: first tap arms the warning, second tap removes.
    const [confirmingRemove, setConfirmingRemove] = useState(false);

    // Disarm the warning when it auto-times-out or when the status changes
    // (e.g. removed then re-downloaded) so the chip never reopens stuck in
    // the "tap again to remove" state.
    useEffect(() => {
        if (status !== OFFLINE_STATUS.SAVED) setConfirmingRemove(false);
    }, [status]);
    useEffect(() => {
        if (!confirmingRemove) return;
        const t = window.setTimeout(
            () => setConfirmingRemove(false),
            REMOVE_CONFIRM_TIMEOUT
        );
        return () => window.clearTimeout(t);
    }, [confirmingRemove]);

    if (status === OFFLINE_STATUS.SYNCING) {
        return (
            <span className="trip-offline-chip is-syncing" role="status">
                <SyncRoundedIcon
                    className="trip-offline-chip-icon trip-offline-spin"
                    fontSize="small"
                />
                <span className="trip-offline-chip-text">Saving offline…</span>
            </span>
        );
    }

    if (status === OFFLINE_STATUS.SAVED) {
        return (
            <button
                type="button"
                className={classNames('trip-offline-chip', 'is-saved', {
                    'is-confirming': confirmingRemove,
                })}
                title={
                    confirmingRemove
                        ? 'Tap again to remove the offline copy'
                        : 'Saved offline — tap to remove'
                }
                aria-label={
                    confirmingRemove
                        ? 'Tap again to remove the offline copy'
                        : 'Saved offline. Tap to remove the offline copy.'
                }
                onClick={() => {
                    if (confirmingRemove) onRemove();
                    else setConfirmingRemove(true);
                }}
            >
                {confirmingRemove ? (
                    <>
                        <DeleteOutlineRoundedIcon
                            className="trip-offline-chip-icon"
                            fontSize="small"
                        />
                        <span className="trip-offline-chip-text">
                            Tap again to remove
                        </span>
                    </>
                ) : (
                    <>
                        <CloudDoneRoundedIcon
                            className="trip-offline-chip-icon"
                            fontSize="small"
                        />
                        <span className="trip-offline-chip-text">
                            Saved offline
                            {savedAt != null && (
                                <span className="trip-offline-when">
                                    {formatSavedAt(savedAt)}
                                </span>
                            )}
                        </span>
                    </>
                )}
            </button>
        );
    }

    // NOT_DOWNLOADED / ERROR — offer the download.
    return (
        <span className="trip-offline-download-wrap">
            <ButtonIcon
                type={BUTTON_VARIANT.TEXT}
                Icon={DownloadForOfflineOutlinedIcon}
                iconPosition="start"
                iconProps={{ fontSize: 'small' }}
                title="Download offline"
                ariaLabel="Download itinerary for offline use"
                className="trip-offline-download"
                onClick={onDownload}
                disabled={isOffline}
            />
            {status === OFFLINE_STATUS.ERROR && (
                <span className="trip-offline-error" role="alert">
                    Couldn&rsquo;t save — try again
                </span>
            )}
        </span>
    );
};

export default TripOfflineButton;
