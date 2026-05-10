import React, { useState, useMemo, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@mui/material';
import moment from 'moment';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ModalButton from 'components/ModalButton';
import InputField from 'components/common/FormFields/InputField';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import DropdownCustom from 'components/common/FormFields/DropDown';
import { placeStatus } from 'sample';
import classNames from 'classnames';
import { TRIP_BASIC } from 'constants';
import './index.css';
import DialogBox from 'components/common/FormFields/DialogBox';
const AddPlaceBtn = ({
    onChange,
    type = 'add',
    data=null,
    tripTypeId,
    buttonType = 'standard'
}) => {
    const modelRef = useRef();
    const initilStatus = useMemo(() => {
        const selected = data ? data.status?.id : 3;
        return placeStatus.filter(item => item.id === selected)[0];
    }, [data]);

    const isAdd = useMemo(() => {
        return type === 'add';
    }, [type]);

    const [place, setPlace] = useState({});

    const friends = [];
    const handleOnChange = (name, value) => {
        if (name === "friends") {
            friends.push(value);
        }
        setPlace({
            ...place,
            [name]: name === 'friends' ? friends : value,

        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("sending", place);
        modelRef.current.closeModal();
        onChange && onChange(place);
    };

    useEffect(() => {
        let unmounted = true;
        if(unmounted) {
            if(data && type === 'edit') {
                setPlace({
                    id: data.id,
                    place: data.place,
                    startTime: data.startTime || moment().format('HH:mm'),
                    endTime: data.endTime || moment().format('HH:mm'),
                    location: data.location,
                    cost: data.cost,
                    note: data.note,
                    status: data.status,
                });
            } else {
                setPlace({
                    startTime: moment().format('HH:mm'),
                    endTime: moment().format('HH:mm'),
                    status: initilStatus,
                });
            }
        }
        return () => unmounted = false;
    }, [data]);

    return (
        <DialogBox 
            title="Delete this place" 
            buttonLabel="Delete"
            buttonType="text" 
            onConfirm={(e) => onChangePlace(REDUX_TYPE.DELETE, activity.id)}
        >
        You are about to delete {activity.place}.  Are you sure you want to delete this item
        </DialogBox>
    );
};

AddPlaceBtn.propTypes = {
    data: PropTypes.object,
    onChange: PropTypes.func,
    tripTypeId: PropTypes.number,
    type: PropTypes.oneOf(['add', 'edit']),
    buttonType: PropTypes.oneOf(['text', 'standard'])
};

export default AddPlaceBtn;