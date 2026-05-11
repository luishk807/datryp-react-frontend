import React, {
    forwardRef,
    useImperativeHandle,
    useState,
    type ComponentType,
    type CSSProperties,
    type ReactNode,
} from 'react';
import './index.css';
import { IconButton, Modal } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ButtonIcon from 'components/common/FormFields/ButtonIcon';

export interface ModalButtonHandle {
    openModel: () => void;
    closeModal: () => void;
}

export interface ModalButtonButtonProps {
    title?: string;
    Icon?: ComponentType<any> | null;
    style?: CSSProperties;
    type?: 'text' | 'standard' | 'text-plain';
    isViewMode?: boolean;
}

export interface ModalButtonProps {
    title?: string;
    children?: ReactNode;
    buttonProps?: ModalButtonButtonProps | null;
}

const ModalButton = forwardRef<ModalButtonHandle, ModalButtonProps>(
    ({ title = '', children = null, buttonProps = null }, ref) => {
        const [open, setOpen] = useState(false);
        const handleOpen = () => setOpen(true);
        const handleClose = () => setOpen(false);

        useImperativeHandle(ref, () => ({
            openModel: handleOpen,
            closeModal: handleClose,
        }));

        return (
            <>
                {buttonProps && <ButtonIcon onClick={handleOpen} {...buttonProps} />}

                <Modal
                    open={open}
                    onClose={handleClose}
                    aria-labelledby="modal-modal-title"
                >
                    <div className="modalCustom">
                        <span className="modalCustom-stripe" aria-hidden="true" />
                        <div className="modalCustom-header">
                            <h2
                                id="modal-modal-title"
                                className="modalCustom-title"
                            >
                                {title}
                            </h2>
                            <IconButton
                                className="modalCustom-close"
                                aria-label="Close"
                                onClick={handleClose}
                            >
                                <CloseRoundedIcon />
                            </IconButton>
                        </div>
                        <div className="modalCustom-content">{children}</div>
                    </div>
                </Modal>
            </>
        );
    }
);

ModalButton.displayName = 'ModalButton';

export default ModalButton;
