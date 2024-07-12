import React, {useState} from 'react';
import PropTypes from 'prop-types';
import './index.css';
import { 
    DialogContentText,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import ButtonCustom from '../ButtonCustom';

const DialogBox = ({
    buttonLabel = '',
    title,
    onConfirm,
    buttonType='standard',
    children
}) => {
    const [open, setOpen] = useState(false);

    return (
        <>
            <ButtonCustom style={{ 'font-size': '1.1em'}} type={buttonType} onClick={() => setOpen(true)} label={buttonLabel} />
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
                    <DialogContentText className="datryp-dialog-content" id="alert-dialog-description">
                        { children}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <ButtonCustom type="standard-small" onClick={() => setOpen(false)} label="Cancel" />
                    <ButtonCustom style={{ 'margin-left': '35px'}} type="standard-small" onClick={onConfirm} label="Agree" />
                </DialogActions>
            </Dialog>
        </>
    );
};

DialogBox.propTypes = {
    buttonLabel: PropTypes.string,
    title: PropTypes.string,
    onConfirm: PropTypes.func,
    children: PropTypes.node,
    buttonType: PropTypes.oneOf(['text', 'standard'])
};

export default DialogBox;