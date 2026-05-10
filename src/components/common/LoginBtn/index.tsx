import { useRef, useState } from 'react';
import './index.css';
import { Grid } from '@mui/material';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import ButtonCustom from '../FormFields/ButtonCustom';
import InputField from '../FormFields/InputField';

export interface LoginForm {
    username?: string;
    password?: string;
}

export interface LoginBtnProps {
    onClick?: (form: LoginForm) => void;
}

export const LoginBtn = ({ onClick }: LoginBtnProps) => {
    const modelRef = useRef<ModalButtonHandle>(null);
    const [form, setForm] = useState<LoginForm>({});
    const label = 'Login';

    const onChange = (field: keyof LoginForm, e: { target: { value: string } }) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

    const handleLogin = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        onClick?.(form);
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
            <Grid container>
                <Grid item lg={12} xs={12} md={12} className="form-input">
                    <InputField name="username" onChange={(e) => onChange('username', e)} />
                </Grid>
                <Grid item lg={12} xs={12} md={12} className="form-input">
                    <InputField name="password" onChange={(e) => onChange('password', e)} />
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

export default LoginBtn;
