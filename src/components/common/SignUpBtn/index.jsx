import React, { useRef, useState } from 'react';
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
    const [form, setForm] = useState({});

    const label = "Sign Up";
    
    const onChange = (type, e) => {
        console.log(type);
        setForm({
            ...form,
            [type]: e.target.value
        });
    };

    const handleSubmit = (e) => {
        console.log("submiting", form);
        onClick && onClick(form);
    };
    return(
        <ModalButton
            ref={modelRef}
            title={label}
            buttonProps={{
                title:  label,
                type: 'text-plain'
            }}
        >
            <Grid container id="signup">
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
                    <InputField name="email" type="email" onChange={(e) => onChange('email', e)}/>
                </Grid>
                <Grid item lg={12} xs={12} md={12} className="form-input">
                    <InputField type="date" name="date of birth" onChange={(e) => onChange('dob', e)}/>
                </Grid>
                <Grid item lg={12} xs={12} md={12} className="form-input">
                    <InputField name="phone" onChange={(e) => onChange('phone', e)}/>
                </Grid>
                <Grid item lg={12} xs={12} md={12} className="form-input terms-condition">
                        By clicking Agree & Join, 
                        you agree to the DaTryp User Agreement, Privacy Policy, and 
                        Cookie Policy.
                </Grid>
                <Grid item lg={12} xs={12} md={12} className="form-input">
                    <ButtonCustom 
                        label="Agree & Join"
                        onClick={handleSubmit}
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