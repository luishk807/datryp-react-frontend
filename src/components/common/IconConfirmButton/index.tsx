import { useId, useState, type ReactNode } from 'react';
import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    Tooltip,
} from '@mui/material';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import { BUTTON_VARIANT } from 'constants';
import './index.scss';

export interface IconConfirmButtonProps {
    /** Icon node rendered inside the IconButton. */
    icon: ReactNode;
    /** Tooltip + accessible label for the trigger. */
    ariaLabel: string;
    /** Dialog title (e.g. "Delete this activity"). */
    title?: string;
    /** Dialog body — explains the action's consequences. */
    children?: ReactNode;
    /** Fired after the user confirms. */
    onConfirm?: () => void;
    /** Extra class for the IconButton — used for absolute-positioning when
     *  the consumer wants the trigger pinned to a card corner. */
    className?: string;
    /** When true, the trigger is hidden entirely (view-only screens). */
    isViewMode?: boolean;
}

/** IconButton trigger + MUI Dialog confirm. Drop-in replacement for the
 *  text-based DialogBox when the consumer wants a compact icon (e.g. an X
 *  in a card's top-right corner). */
const IconConfirmButton = ({
    icon,
    ariaLabel,
    title,
    children,
    onConfirm,
    className,
    isViewMode = false,
}: IconConfirmButtonProps) => {
    const [open, setOpen] = useState(false);
    // Unique per instance — several IconConfirmButtons (e.g. one per card)
    // are commonly mounted at once; a shared id breaks aria-labelledby.
    const titleId = useId();
    const descId = useId();

    if (isViewMode) return null;

    const handleConfirm = () => {
        setOpen(false);
        onConfirm?.();
    };

    return (
        <>
            <Tooltip title={ariaLabel}>
                <IconButton
                    size="small"
                    aria-label={ariaLabel}
                    onClick={() => setOpen(true)}
                    className={className}
                >
                    {icon}
                </IconButton>
            </Tooltip>
            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                aria-labelledby={titleId}
                aria-describedby={descId}
                className="datryp-dialog"
            >
                <DialogTitle className="datryp-title" id={titleId}>
                    {title}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText
                        className="datryp-dialog-content"
                        id={descId}
                    >
                        {children}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <ButtonCustom
                        type={BUTTON_VARIANT.STANDARD_SMALL}
                        onClick={() => setOpen(false)}
                        label="Cancel"
                    />
                    <ButtonCustom
                        style={{ marginLeft: '35px' }}
                        type={BUTTON_VARIANT.STANDARD_SMALL}
                        onClick={handleConfirm}
                        label="Agree"
                    />
                </DialogActions>
            </Dialog>
        </>
    );
};

export default IconConfirmButton;
