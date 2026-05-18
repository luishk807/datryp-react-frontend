import React, {
    forwardRef,
    useImperativeHandle,
    useState,
    type ComponentType,
    type CSSProperties,
    type ReactNode,
} from 'react';
import './index.scss';
import { IconButton, Modal } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ButtonIcon from 'components/common/FormFields/ButtonIcon';
import type { BUTTON_VARIANT } from 'constants';

export interface ModalButtonHandle {
    openModel: () => void;
    closeModal: () => void;
}

export interface ModalButtonButtonProps {
    title?: string;
    Icon?: ComponentType<any> | null;
    style?: CSSProperties;
    type?:
        | typeof BUTTON_VARIANT.TEXT
        | typeof BUTTON_VARIANT.STANDARD
        | typeof BUTTON_VARIANT.TEXT_PLAIN;
    isViewMode?: boolean;
    /** Optional extra class on the trigger — used by icon-only triggers
     *  that want compact, IconButton-style padding. */
    className?: string;
    /** Props forwarded to the icon component (e.g. `fontSize: 'small'`). */
    iconProps?: Record<string, unknown>;
    /** Accessible label for icon-only triggers where `title` is empty. */
    ariaLabel?: string;
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
