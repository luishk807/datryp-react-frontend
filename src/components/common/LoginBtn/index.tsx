import { useRef, useState } from 'react';
import './index.scss';
import { Grid } from '@mui/material';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import ButtonCustom from '../FormFields/ButtonCustom';
import InputField from '../FormFields/InputField';

export interface LoginForm {
    username?: string;
    password?: string;
}

export interface LoginBtnProps {
    /**
     * Called when the user submits the form. Return a Promise to surface
     * errors inside the modal: if it rejects, the error message is rendered
     * and the modal stays open. On resolve, the modal closes.
     */
    onClick?: (form: LoginForm) => void | Promise<void>;
}

export const LoginBtn = ({ onClick }: LoginBtnProps) => {
    const modelRef = useRef<ModalButtonHandle>(null);
    const [form, setForm] = useState<LoginForm>({});
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const label = 'Login';

    const onChange = (field: keyof LoginForm, e: { target: { value: string } }) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
        if (error) setError(null);
    };

    const handleLogin = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (submitting) return;
        setError(null);
        setSubmitting(true);
        try {
            await onClick?.(form);
            modelRef.current?.closeModal();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setSubmitting(false);
        }
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
                    <InputField name="password" type="password" onChange={(e) => onChange('password', e)} />
                </Grid>
                <Grid item lg={12} xs={12} md={12} className="form-input">
                    <a href="">Forgot password?</a>
                </Grid>
                {error && (
                    <Grid item lg={12} xs={12} md={12} className="form-input form-error" role="alert">
                        {error}
                    </Grid>
                )}
                <Grid item lg={12} xs={12} md={12} className="form-input">
                    <ButtonCustom
                        label={submitting ? 'Signing in…' : label}
                        capitalizeType="uppercase"
                        onClick={handleLogin}
                    />
                </Grid>
            </Grid>
        </ModalButton>
    );
};

export default LoginBtn;
