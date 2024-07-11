import React, { useState, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@mui/material';
import moment from 'moment';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ModalButton from '../../ModalButton';
import InputField from '../../common/FormFields/InputField';
import ButtonCustom from '../../common/ButtonCustom';
const AddPlaceBtn = ({
    onChange
}) => {
    const [place, setPlace] = useState({
        startTime: moment().format('HH:mm'),
        endTime: moment().format('HH:mm')
    });
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
    const modelRef = useRef();
    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("sending", place);
        modelRef.current.closeModal();
        onChange && onChange(place);
    };
    return (
        <Grid container>
            <Grid item>
                {/* <ButtonIcon title="Add Places" Icon={AddCircleIcon} /> */}
                <ModalButton 
                    ref={modelRef}
                    title="Add Place"
                    buttonProps={{
                        title:"Add Places",
                        Icon: AddCircleIcon
                    }}>
                    <Grid container>
                        <Grid item lg={12} xs={12} className="py-5">
                            <InputField label="Name of Place" name="place" onChange={(e) => handleOnChange('place', e.target.value)}/>
                        </Grid>
                        <Grid item lg={12} xs={12} className="py-5">
                            <InputField name="location" onChange={(e) => handleOnChange('location', e.target.value)}/>
                        </Grid>
                        <Grid item lg={12} xs={12} className="py-5">
                            <InputField name="cost" onChange={(e) => handleOnChange('cost', e.target.value)}/>
                        </Grid>
                        <Grid item lg={6} xs={12} className="py-5">
                            <InputField name="startTime" type="time" label="Start Time" onChange={(e) => handleOnChange('startTime', e.target.value)}/>
                        </Grid>
                        <Grid item lg={6} xs={12} className="py-5 lg:pl-2">
                            <InputField name="endTime" type="time" label="End Time" onChange={(e) => handleOnChange('endTime', e.target.value)}/>
                        </Grid>
                        <Grid item lg={12} xs={12} className="py-5">
                            <InputField name="note" onChange={(e) => handleOnChange('note', e.target.value)}/>
                        </Grid>
                        <Grid item lg={12} xs={12} className="py-5">
                            <InputField type="file" label="image" name="image" onChange={(e) => handleOnChange('image', e.target.value)}/>
                        </Grid>
                        <Grid item lg={12}>
                            <ButtonCustom 
                                onClick={handleSubmit} 
                                label='Add Place' 
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
    onChange: PropTypes.func
};

export default AddPlaceBtn;