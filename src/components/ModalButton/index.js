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
    title = ''
}) => {
    const [open, setOpen] = useState(false);
    const handleOpen = () => {
        console.log("ddd");
        setOpen(true);
    };
    const handleClose = () => setOpen(false);

    return (
        <>
            <ButtonIcon onClick={handleOpen} title={title} Icon={AddCircleIcon} />
            
            <Modal 
                open={open}
                onClose={handleClose}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
            >
                <div className={`modalCustom`} >
                    <div className="header">
                        <div className="button">
                            <div className="in">
                                <ButtonCustom onClick={handleClose} label='&#10005;' type="text" />
                            </div>
                        </div>
                        <div className="title">
                            Title
                        </div>
                    </div>

                    <div className="content">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed consectetur tristique erat. Duis vel blandit magna, sit amet ultricies tortor. Donec id odio arcu. Nulla tincidunt lectus eget libero iaculis, a ultricies lorem euismod. Nam luctus, ligula at blandit condimentum, ante est gravida lorem, at vehicula tellus metus vel ipsum. Suspendisse ultricies suscipit mauris, vel varius elit placerat sed. Sed no
                    </div>
                </div>
            </Modal>
        </>

    );
};

ModalButton.propTypes = {
    title: PropTypes.string
};
export default ModalButton;