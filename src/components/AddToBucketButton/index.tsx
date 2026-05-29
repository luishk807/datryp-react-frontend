/**
 * One-tap "Add to bucket list" affordance, designed to drop into
 * every place / city / country surface (detail-page toolbars + Saved
 * page rows) for a consistent affordance + UX.
 *
 * Trigger: a small icon-button (variant='icon') for toolbars, or a
 * compact pill (variant='pill') for row-level placements. Both open
 * the same modal with a pre-filled text field — default is
 * "Visiting <name>" so the user can hit save without typing.
 *
 * On submit the modal calls `useAddBucketListItem` (already wired to
 * invalidate the bucket-list cache) and shows a quick "Added!"
 * confirmation before closing.
 */
import { useEffect, useRef, useState } from 'react';
import { TextField, CircularProgress } from '@mui/material';
import ChecklistRoundedIcon from '@mui/icons-material/ChecklistRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ModalButton, {
    type ModalButtonHandle,
} from 'components/ModalButton';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import { useAddBucketListItem, useBucketList } from 'api/hooks/useBucketList';
import './index.scss';

export type AddToBucketKind = 'place' | 'city' | 'country';
export type AddToBucketVariant = 'icon' | 'pill';

export interface AddToBucketButtonProps {
    kind: AddToBucketKind;
    /** Human-readable name of the place / city / country. Used to
     *  build the default bucket-list text. */
    name: string;
    /** Optional context (e.g. country name when kind='city'). Not
     *  used in the default text today but threaded through so
     *  future iterations can include it. */
    context?: string;
    /** Compact icon for toolbars, pill for list rows. */
    variant?: AddToBucketVariant;
    /** Extra class for the trigger so callers can match surrounding
     *  toolbar / row styling. */
    triggerClassName?: string;
}

/** Default bucket-list text — friendly, hits-save-without-typing
 *  copy. Kept simple on purpose; user can tweak in the modal
 *  before submitting if they want. */
const buildDefaultText = (name: string): string => {
    const clean = name.trim();
    if (!clean) return '';
    return `Visiting ${clean}`;
};

const AddToBucketButton = ({
    kind,
    name,
    variant = 'icon',
    triggerClassName,
}: AddToBucketButtonProps) => {
    const modalRef = useRef<ModalButtonHandle>(null);
    const [text, setText] = useState<string>(() => buildDefaultText(name));
    const [justAdded, setJustAdded] = useState(false);
    const addMutation = useAddBucketListItem();
    const { data: bucketList } = useBucketList();

    // Detect whether this exact entry is already in the bucket list
    // so the icon can flip state (filled when already saved). Match
    // case-insensitive trimmed text since the default builder is
    // deterministic — repeat clicks shouldn't double-add.
    const defaultText = buildDefaultText(name);
    const alreadyInList = Boolean(
        bucketList?.some(
            (item) =>
                (item.text ?? '').trim().toLowerCase() ===
                defaultText.trim().toLowerCase(),
        ),
    );

    // Re-sync the input when the consumer re-renders with a new
    // place/city/country name (same component instance, different
    // surface row). Skipped while the user is mid-edit (justAdded
    // flag) so an in-flight tweak doesn't get wiped.
    useEffect(() => {
        if (!justAdded) setText(buildDefaultText(name));
    }, [name, justAdded]);

    const handleOpen = () => {
        setText(buildDefaultText(name));
        setJustAdded(false);
        modalRef.current?.openModel();
    };

    const handleSubmit = async () => {
        const trimmed = text.trim();
        if (!trimmed) return;
        try {
            await addMutation.mutateAsync(trimmed);
            setJustAdded(true);
            // Auto-close after a short confirmation so the user sees
            // the "Added!" state but doesn't have to click again to
            // dismiss the modal.
            window.setTimeout(() => {
                modalRef.current?.closeModal();
            }, 850);
        } catch {
            /* error surfaces inline below; modal stays open */
        }
    };

    const kindLabel =
        kind === 'country' ? 'country' : kind === 'city' ? 'city' : 'place';

    return (
        <>
            {/* Trigger lives OUTSIDE the modal so the modal's
              * portal-rendered children carry only the form content.
              * `buttonProps={null}` on the ModalButton suppresses its
              * built-in trigger; we drive it imperatively via the
              * ref. */}
            {variant === 'icon' ? (
                <button
                    type="button"
                    className={`add-to-bucket-trigger is-icon ${
                        triggerClassName ?? ''
                    } ${alreadyInList ? 'is-already-added' : ''}`.trim()}
                    aria-label={
                        alreadyInList
                            ? `Already on your bucket list: ${name}`
                            : `Add ${name} to your bucket list`
                    }
                    title={
                        alreadyInList
                            ? 'Already in your bucket list'
                            : 'Add to bucket list'
                    }
                    onClick={handleOpen}
                >
                    <ChecklistRoundedIcon className="add-to-bucket-trigger-icon" />
                </button>
            ) : (
                <button
                    type="button"
                    className={`add-to-bucket-trigger is-pill ${
                        triggerClassName ?? ''
                    } ${alreadyInList ? 'is-already-added' : ''}`.trim()}
                    onClick={handleOpen}
                    aria-label={
                        alreadyInList
                            ? `Already on your bucket list: ${name}`
                            : `Add ${name} to your bucket list`
                    }
                >
                    <ChecklistRoundedIcon fontSize="small" />
                    <span>
                        {alreadyInList ? 'In bucket list' : 'Bucket list'}
                    </span>
                </button>
            )}
            <ModalButton
                ref={modalRef}
                title="Add to bucket list"
                buttonProps={null}
            >
                <div className="add-to-bucket-modal">
                    <p className="add-to-bucket-modal-sub">
                        Saved to your bucket list — edit the goal
                        text if you want before saving.
                    </p>
                    <TextField
                        fullWidth
                        autoFocus
                        variant="outlined"
                        label={`Goal for this ${kindLabel}`}
                        value={text}
                        onChange={(e) => {
                            setText(e.target.value);
                            setJustAdded(false);
                        }}
                        placeholder={defaultText}
                    />
                    {addMutation.isError && (
                        <p
                            className="add-to-bucket-modal-error"
                            role="alert"
                        >
                            {addMutation.error instanceof Error
                                ? addMutation.error.message
                                : "Couldn't add to bucket list. Try again."}
                        </p>
                    )}
                    <div className="add-to-bucket-modal-actions">
                        {justAdded ? (
                            <span className="add-to-bucket-modal-added">
                                <CheckCircleRoundedIcon fontSize="small" />
                                Added to your bucket list
                            </span>
                        ) : (
                            <ButtonCustom
                                type="standard"
                                capitalizeType="none"
                                label={
                                    addMutation.isPending
                                        ? 'Adding…'
                                        : 'Add to bucket list'
                                }
                                disabled={
                                    addMutation.isPending || !text.trim()
                                }
                                onClick={handleSubmit}
                            />
                        )}
                        {addMutation.isPending && (
                            <CircularProgress
                                size={16}
                                className="add-to-bucket-modal-spinner"
                            />
                        )}
                    </div>
                </div>
            </ModalButton>
        </>
    );
};

export default AddToBucketButton;
