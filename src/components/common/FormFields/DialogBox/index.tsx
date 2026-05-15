import { useState, type ReactNode } from 'react';
import './index.scss';
import {
    DialogContentText,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import { BUTTON_VARIANT } from 'constants';

type DialogButtonType = typeof BUTTON_VARIANT.TEXT | typeof BUTTON_VARIANT.STANDARD;

export interface DialogBoxProps {
    buttonLabel?: string;
    title?: string;
    onConfirm?: () => void;
    buttonType?: DialogButtonType;
    children?: ReactNode;
    isViewMode?: boolean;
}

const DialogBox = ({
    buttonLabel = '',
    title,
    onConfirm,
    buttonType = BUTTON_VARIANT.STANDARD,
    children,
    isViewMode = false,
}: DialogBoxProps) => {
    const [open, setOpen] = useState(false);

    const handleConfirmDelete = () => {
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
                className="datryp-dialog"
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
                <DialogActions>
                    <ButtonCustom
                        type={BUTTON_VARIANT.STANDARD_SMALL}
                        onClick={() => setOpen(false)}
                        label="Cancel"
                    />
                    <ButtonCustom
                        style={{ marginLeft: '35px' }}
                        type={BUTTON_VARIANT.STANDARD_SMALL}
                        onClick={handleConfirmDelete}
                        label="Agree"
                    />
                </DialogActions>
            </Dialog>
        </>
    );
};

export default DialogBox;
