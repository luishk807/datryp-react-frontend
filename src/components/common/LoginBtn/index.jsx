import React, { useRef, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './index.css';
import { Grid } from '@mui/material';
import ModalButton from 'components/ModalButton';
import ButtonCustom from '../FormFields/ButtonCustom';
import InputField from '../FormFields/InputField';

export const LoginBtn = ({
    onClick
}) => {
    const modelRef = useRef();
    const [form, setForm] = useState({});
    const label = "Login";
    const onChange = (type, e) => {
        setForm({
            ...form,
            [type]: e.target.value
        });
    };
    const handleLogin = (e) => {
        e.preventDefault();
        console.log("submit login", form);
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
            <Grid container>
                <Grid item lg={12} xs={12} md={12} className="form-input">
                    <InputField name="username" onChange={(e) => onChange('username', e)}/>
                </Grid>
                <Grid item lg={12} xs={12} md={12} className="form-input">
                    <InputField name="password" onChange={(e) => onChange('password', e)}/>
                </Grid>
                <Grid item lg={12} xs={12} md={12} className="form-input">
                    <a href="">Forgot password?</a>
                </Grid>
                <Grid item lg={12} xs={12} md={12} className="form-input">
                    <ButtonCustom 
                        label={label}
                        capitalizeType="uppercase"
                        onClick={handleLogin}
                    />
                </Grid>
            </Grid>
        </ModalButton>
    );
};

LoginBtn.propTypes = {
    onClick: PropTypes.func
};

export default LoginBtn;