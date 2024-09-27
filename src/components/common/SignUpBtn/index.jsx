import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import './index.css';
import { Grid } from '@mui/material';
import ModalButton from 'components/ModalButton';
import ButtonCustom from '../FormFields/ButtonCustom';
import InputField from '../FormFields/InputField';

export const SignUp = ({
    onClick
}) => {
    const modelRef = useRef();

    const label = "Sign Up";

    const onChange = (type, e) => {
        console.log(type);
    };
    return(
        <ModalButton
            ref={modelRef}
            title={label}
            buttonProps={{
                title:  label,
                type: 'plain'
            }}
        >
            <Grid container>
                <Grid item lg={12} xs={12} md={12} className="form-input">
                    <InputField name="username" onChange={(e) => onChange('username', e)}/>
                </Grid>
                <Grid item lg={12} xs={12} md={12} className="form-input">
                    <InputField name="password" onChange={(e) => onChange('password', e)}/>
                </Grid>
                <Grid item lg={12} xs={12} md={12} className="form-input">
                    <InputField name="name" onChange={(e) => onChange('name', e)}/>
                </Grid>
                <Grid item lg={12} xs={12} md={12} className="form-input">
                    <InputField name="email" onChange={(e) => onChange('email', e)}/>
                </Grid>
                <Grid item lg={12} xs={12} md={12} className="form-input">
                    <InputField name="date of birth" onChange={(e) => onChange('dob', e)}/>
                </Grid>
                <Grid item lg={12} xs={12} md={12} className="form-input">
                    <InputField name="phone" onChange={(e) => onChange('phone', e)}/>
                </Grid>
                <Grid item lg={12} xs={12} md={12} className="form-input">
                    <ButtonCustom 
                        label={label}
                        capitalizeType="uppercase"
                    />
                </Grid>
            </Grid>
        </ModalButton>
    );
};

SignUp.propTypes = {
    onClick: PropTypes.func
};

export default SignUp;