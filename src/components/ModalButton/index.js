import React, {useState} from 'react';
import PropTypes from 'prop-types';
import './index.css';
import { 
    Modal,
    Grid
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ButtonIcon from '../ButtonIcon';
import ButtonCustom from '../common/ButtonCustom';

const ModalButton = ({
    title = '',
    children = null,
    buttonProps
}) => {
    const [open, setOpen] = useState(false);
    const handleOpen = () => {
        console.log("ddd");
        setOpen(true);
    };
    const handleClose = () => setOpen(false);
    return (
        <>
            <ButtonIcon
                onClick={handleOpen}
                {...buttonProps} />
            
            <Modal 
                open={open}
                onClose={handleClose}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
            >
                <div className={`modalCustom lg:w-6/12 w-full`} >
                    <div className="header">
                        <div className="button">
                            <div className="in">
                                <ButtonCustom onClick={handleClose} label='&#10005;' type="text" />
                            </div>
                        </div>
                        <div className="title">
                            {title}
                        </div>
                    </div>

                    <div className="content">
                        {children}
                    </div>
                </div>
            </Modal>
        </>

    );
};

ModalButton.propTypes = {
    title: PropTypes.string,
    children: PropTypes.node,
    buttonProps: PropTypes.object,
};
export default ModalButton;