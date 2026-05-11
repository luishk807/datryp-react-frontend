import { useState, type ReactNode } from 'react';
import './index.css';
import {
    DialogContentText,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';

type DialogButtonType = 'text' | 'standard';

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
    buttonType = 'standard',
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
                        type="standard-small"
                        onClick={() => setOpen(false)}
                        label="Cancel"
                    />
                    <ButtonCustom
                        style={{ marginLeft: '35px' }}
                        type="standard-small"
                        onClick={handleConfirmDelete}
                        label="Agree"
                    />
                </DialogActions>
            </Dialog>
        </>
    );
};

export default DialogBox;
