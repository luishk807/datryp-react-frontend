import React, { useState, useMemo } from 'react';
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
    const [place, setPlace] = useState(null);
    const handleOnChange = (name, value) => {
        setPlace({
            ...place,
            [name]: value,

        });
    };

    const endDate = useMemo(() => {
        const date = moment().format('YYYY-MM-DD');
        setPlace({
            ...place,
            'startDate': date
        });
        return date;
    }, []);

    const startDate = useMemo(() => {
        const date = moment().format('YYYY-MM-DD');
        setPlace({
            ...place,
            'startDate': date
        });
        return date;
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("sending", place);
        onChange && onChange(place);
    };
    return (
        <Grid container>
            <Grid item>
                {/* <ButtonIcon title="Add Places" Icon={AddCircleIcon} /> */}
                <ModalButton 
                    title="Add Place"
                    buttonProps={{
                        title:"Add Places",
                        Icon: AddCircleIcon
                    }}>
                    <Grid container>
                        <Grid item lg={12} xs={12} className="py-5">
                            <InputField label="Name of Place" name="place" onChange={(e) => handleOnChange('place', e.target.value)}/>
                        </Grid>
                        <Grid item lg={6} xs={12} className="py-5">
                            <InputField label="Who is going" name="friends" onChange={(e) => handleOnChange('friends', e.target.value)}/>
                        </Grid>
                        <Grid item lg={6} xs={12} className="py-5 lg:pl-2">
                            <InputField name="cost" onChange={(e) => handleOnChange('cost', e.target.value)}/>
                        </Grid>
                        <Grid item lg={6} xs={12} className="py-5">
                            <InputField type="date" label="Start Date" name="startDate" defaultValue={startDate} onChange={(e) => handleOnChange('startDate', e.target.value)}/>
                        </Grid>
                        <Grid item lg={6} xs={12} className="py-5 lg:pl-2">
                            <InputField type="date" defaultValue={endDate} label="End Date" name="endDate" onChange={(e) => handleOnChange('endDate', e.target.value)}/>
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