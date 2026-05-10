import React, {
    forwardRef,
    useImperativeHandle,
    useState,
    type ComponentType,
    type CSSProperties,
    type ReactNode,
} from 'react';
import './index.css';
import { Modal } from '@mui/material';
import ButtonIcon from 'components/common/FormFields/ButtonIcon';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';

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
                    aria-describedby="modal-modal-description"
                >
                    <div className="modalCustom lg:w-6/12 w-full">
                        <div className="header">
                            <div className="button">
                                <div className="in">
                                    <ButtonCustom
                                        onClick={handleClose}
                                        label="&#10005;"
                                        type="text"
                                    />
                                </div>
                            </div>
                            <div className="title">{title}</div>
                        </div>

                        <div className="content">{children}</div>
                    </div>
                </Modal>
            </>
        );
    }
);

ModalButton.displayName = 'ModalButton';

export default ModalButton;
