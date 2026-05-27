import { useState, type ReactNode } from 'react';
import './index.scss';
import {
    DialogContentText,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import classNames from 'classnames';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import { BUTTON_VARIANT } from 'constants';
import type { ButtonVariant } from 'types';

export interface DialogBoxProps {
    buttonLabel?: string;
    title?: string;
    onConfirm?: () => void;
    /** Any `ButtonCustom` variant — the trigger renders as a ButtonCustom of
     *  this type. Defaults to `STANDARD`. */
    buttonType?: ButtonVariant;
    children?: ReactNode;
    isViewMode?: boolean;
    /** Label on the confirm button. Defaults to "Confirm" — callers
     *  doing a delete pass "Delete", a save pass "Save", etc. */
    confirmLabel?: string;
    /** Label on the cancel button. Defaults to "Cancel". */
    cancelLabel?: string;
    /** When true, the confirm button renders in a destructive red style
     *  to signal an irreversible action (delete, remove, cancel trip).
     *  Cancel becomes the visually safe default. */
    destructive?: boolean;
}

const DialogBox = ({
    buttonLabel = '',
    title,
    onConfirm,
    buttonType = BUTTON_VARIANT.STANDARD,
    children,
    isViewMode = false,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    destructive = false,
}: DialogBoxProps) => {
    const [open, setOpen] = useState(false);

    const handleConfirm = () => {
        setOpen(false);
        onConfirm?.();
    };

    if (isViewMode) return null;

    return (
        <>
            <ButtonCustom
                type={buttonType}
                onClick={() => setOpen(true)}
                label={buttonLabel}
            />
            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
                className={classNames('datryp-dialog', {
                    'is-destructive': destructive,
                })}
            >
                <DialogTitle className="datryp-title" id="alert-dialog-title">
                    {title}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText
                        className="datryp-dialog-content"
                        id="alert-dialog-description"
                    >
                        {children}
                    </DialogContentText>
                </DialogContent>
                <DialogActions className="datryp-dialog-actions">
                    {/* Cancel = soft / outlined secondary so the
                        primary action carries the visual weight.
                        Destructive flag tints that primary red. */}
                    <ButtonCustom
                        type={BUTTON_VARIANT.LINE}
                        onClick={() => setOpen(false)}
                        label={cancelLabel}
                    />
                    <ButtonCustom
                        type={BUTTON_VARIANT.STANDARD_SMALL}
                        onClick={handleConfirm}
                        label={confirmLabel}
                        className={
                            destructive ? 'datryp-dialog-destructive' : undefined
                        }
                    />
                </DialogActions>
            </Dialog>
        </>
    );
};

export default DialogBox;
