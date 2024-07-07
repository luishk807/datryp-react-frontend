import React, { forwardRef, useState, useEffect} from 'react';
import { Grid } from '@mui/material';
import PropTypes from 'prop-types';
import ModalButton from '../../ModalButton';
import InputField from '../../common/FormFields/InputField';
import ButtonCustom from '../../common/ButtonCustom';

const AddFriendBtn = forwardRef(({
    onChange
}, ref) => {
    const title = "Add Friend";
    const [friend, setFriend] = useState(null);
    const handleOnChange = (name, value) => {
        setFriend({
            ...friend,
            [name]: value,
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("sending", friend);
        onChange && onChange(friend);
    };


    return (
        <Grid container>
            <Grid item>
                <ModalButton 
                    ref={ref}
                    title={title}>
                    <Grid container>
                        <Grid item lg={12} xs={12} className="py-5">
                            <InputField label="Full Name" name="fullName" onChange={(e) => handleOnChange('name', e.target.value)}/>
                        </Grid>

                        <Grid item lg={12} xs={12} className="py-5">
                            <InputField type="date" label="Date of birth" name="dob" onChange={(e) => handleOnChange('dob', e.target.value)}/>
                        </Grid>
                        <Grid item lg={12} xs={12} className="py-5">
                            <InputField label="Email" name="email" onChange={(e) => handleOnChange('email', e.target.value)}/>
                        </Grid>
                        <Grid item lg={12} xs={12} className="py-5">
                            <InputField label="Phone" name="phone" onChange={(e) => handleOnChange('phone', e.target.value)}/>
                        </Grid>
                        <Grid item lg={12}>
                            <ButtonCustom 
                                onClick={handleSubmit} 
                                label={title} 
                                type="standard" 
                                capitalizeType="uppercase"
                            />
                        </Grid>
                    </Grid>
                </ModalButton>
            </Grid>
        </Grid>
    );
});

AddFriendBtn.propTypes = {
    onChange: PropTypes.func
};

AddFriendBtn.displayName = "AddFriendBtn";

export default AddFriendBtn;