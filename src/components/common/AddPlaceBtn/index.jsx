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
import './index.css';

const AddPlaceBtn = ({
    onChange,
    type = 'add',
    data=null,
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
            if(data) {
                console.log("hey");
                setPlace({
                    place: data.place,
                    startTime: data.startTime || moment().format('HH:mm'),
                    endTime: data.endTime || moment().format('HH:mm'),
                    location: data.location,
                    cost: data.cost,
                    note: data.note,
                    status: data.status
                });
            } else {
                setPlace({
                    startTime: moment().format('HH:mm'),
                    endTime: moment().format('HH:mm'),
                    status: initilStatus
                });
            }
        }
        return () => unmounted = false;
    }, [data]);

    return (
        <Grid container className={classNames({
            'add-place-container-standard': buttonType === 'standard',
            'add-place-container-simple': buttonType === 'text'
        })}>
            <Grid item>
                <ModalButton 
                    ref={modelRef}
                    title={isAdd ? 'Add Place' : 'Edit ' + data.place}
                    buttonProps={{
                        title: isAdd ? 'Add Place' : 'Edit',
                        Icon: buttonType==='standard' ? AddCircleIcon : null,
                        type: buttonType
                    }}>
                    <Grid container>
                        <Grid item lg={12} xs={12} className="py-5">
                            <InputField defaultValue={place?.place} label="Name of Place" name="place" onChange={(e) => handleOnChange('place', e.target.value)}/>
                        </Grid>
                        <Grid item lg={12} xs={12} className="py-5">
                            <InputField defaultValue={place?.location} name="location" onChange={(e) => handleOnChange('location', e.target.value)}/>
                        </Grid>
                        <Grid item lg={12} xs={12} className="py-5">
                            <InputField defaultValue={place?.cost} name="cost" onChange={(e) => handleOnChange('cost', e.target.value)}/>
                        </Grid>
                        <Grid item lg={6} xs={12} className="py-5">
                            <InputField defaultValue={place?.startTime} name="startTime" type="time" label="Start Time" onChange={(e) => handleOnChange('startTime', e.target.value)}/>
                        </Grid>
                        <Grid item lg={6} xs={12} className="py-5 lg:pl-2">
                            <InputField defaultValue={place?.endTime} name="endTime" type="time" label="End Time" onChange={(e) => handleOnChange('endTime', e.target.value)}/>
                        </Grid>
                        <Grid item lg={12} xs={12} className="py-5">
                            <InputField defaultValue={place?.note} name="note" onChange={(e) => handleOnChange('note', e.target.value)}/>
                        </Grid>
                        <Grid item lg={12} xs={12} className="py-5">
                            <InputField defaultValue={place?.file} type="file" label="image" name="image" onChange={(e) => handleOnChange('image', e.target.value)}/>
                        </Grid>
                        <Grid item lg={12} xs={12} className="py-5">
                            <DropdownCustom 
                                defaultValue={initilStatus}
                                label="Status" 
                                options={placeStatus} 
                                onChange={(e) => handleOnChange('status', e)}
                            />
                        </Grid>
                        <Grid item lg={12}>
                            <ButtonCustom 
                                onClick={handleSubmit} 
                                label={isAdd ? 'Add Place' : 'Save Place'} 
                                type="standard"
                                capitalizeType="uppercase"
                            />
                        </Grid>
                    </Grid>
                </ModalButton>
            </Grid>
        </Grid>
    );
};

AddPlaceBtn.propTypes = {
    data: PropTypes.object,
    onChange: PropTypes.func,
    type: PropTypes.oneOf(['add', 'edit']),
    buttonType: PropTypes.oneOf(['text', 'standard'])
};

export default AddPlaceBtn;