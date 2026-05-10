import { useRef, useState } from 'react';
import './index.css';
import { Grid } from '@mui/material';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import ButtonCustom from '../FormFields/ButtonCustom';
import InputField from '../FormFields/InputField';

export interface SignUpForm {
    username?: string;
    password?: string;
    name?: string;
    email?: string;
    dob?: string;
    phone?: string;
}

export interface SignUpProps {
    onClick?: (form: SignUpForm) => void;
}

export const SignUp = ({ onClick }: SignUpProps) => {
    const modelRef = useRef<ModalButtonHandle>(null);
    const [form, setForm] = useState<SignUpForm>({});

    const label = 'Sign Up';

    const onChange = (field: keyof SignUpForm, e: { target: { value: string } }) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

    const handleSubmit = () => {
        onClick?.(form);
        modelRef.current?.closeModal();
    };

    return (
        <ModalButton
            ref={modelRef}
            title={label}
            buttonProps={{
                title: label,
                type: 'text-plain',
            }}
        >
            <Grid container id="signup">
                <Grid item lg={12} xs={12} md={12} className="form-input">
                    <InputField name="username" onChange={(e) => onChange('username', e)} />
                </Grid>
                <Grid item lg={12} xs={12} md={12} className="form-input">
                    <InputField name="password" onChange={(e) => onChange('password', e)} />
                </Grid>
                <Grid item lg={12} xs={12} md={12} className="form-input">
                    <InputField name="name" onChange={(e) => onChange('name', e)} />
                </Grid>
                <Grid item lg={12} xs={12} md={12} className="form-input">
                    <InputField name="email" type="email" onChange={(e) => onChange('email', e)} />
                </Grid>
                <Grid item lg={12} xs={12} md={12} className="form-input">
                    <InputField type="date" name="date of birth" onChange={(e) => onChange('dob', e)} />
                </Grid>
                <Grid item lg={12} xs={12} md={12} className="form-input">
                    <InputField name="phone" onChange={(e) => onChange('phone', e)} />
                </Grid>
                <Grid item lg={12} xs={12} md={12} className="form-input terms-condition">
                    By clicking Agree & Join, you agree to the DaTryp User Agreement, Privacy
                    Policy, and Cookie Policy.
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

export default SignUp;
