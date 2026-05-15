import { useRef, useState } from 'react';
import './index.scss';
import { Grid } from '@mui/material';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import ButtonCustom from '../FormFields/ButtonCustom';
import InputField from '../FormFields/InputField';
import { MIN_SIGNUP_AGE } from 'utils/age';
import { AUTH_LABEL } from 'constants';

export interface SignUpForm {
    username?: string;
    password?: string;
    name?: string;
    email?: string;
    dob?: string;
    phone?: string;
}

export interface SignUpProps {
    /**
     * Called when the user submits. Return a Promise to surface errors
     * inside the modal: rejection renders the error and keeps the modal
     * open; resolve closes it.
     */
    onClick?: (form: SignUpForm) => void | Promise<void>;
}

export const SignUp = ({ onClick }: SignUpProps) => {
    const modelRef = useRef<ModalButtonHandle>(null);
    const [form, setForm] = useState<SignUpForm>({});
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const label = AUTH_LABEL.SIGNUP;

    const onChange = (field: keyof SignUpForm, e: { target: { value: string } }) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
        if (error) setError(null);
    };

    const handleSubmit = async () => {
        if (submitting) return;
        setError(null);
        setSubmitting(true);
        try {
            await onClick?.(form);
            modelRef.current?.closeModal();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Signup failed');
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
            <Grid container id="signup">
                <Grid item lg={12} xs={12} md={12} className="form-input">
                    <InputField name="username" onChange={(e) => onChange('username', e)} />
                </Grid>
                <Grid item lg={12} xs={12} md={12} className="form-input">
                    <InputField name="password" type="password" onChange={(e) => onChange('password', e)} />
                </Grid>
                <Grid item lg={12} xs={12} md={12} className="form-input">
                    <InputField name="name" onChange={(e) => onChange('name', e)} />
                </Grid>
                <Grid item lg={12} xs={12} md={12} className="form-input">
                    <InputField name="email" type="email" onChange={(e) => onChange('email', e)} />
                </Grid>
                <Grid item lg={12} xs={12} md={12} className="form-input">
                    <InputField type="date" name="date of birth" onChange={(e) => onChange('dob', e)} />
                    <p className="age-notice">
                        You must be at least {MIN_SIGNUP_AGE} years old to use daTryp.
                    </p>
                </Grid>
                <Grid item lg={12} xs={12} md={12} className="form-input">
                    <InputField name="phone" onChange={(e) => onChange('phone', e)} />
                </Grid>
                <Grid item lg={12} xs={12} md={12} className="form-input terms-condition">
                    By clicking Agree & Join, you agree to the DaTryp User Agreement, Privacy
                    Policy, and Cookie Policy.
                </Grid>
                {error && (
                    <Grid item lg={12} xs={12} md={12} className="form-input form-error" role="alert">
                        {error}
                    </Grid>
                )}
                <Grid item lg={12} xs={12} md={12} className="form-input">
                    <ButtonCustom
                        label={submitting ? 'Creating account…' : 'Agree & Join'}
                        onClick={handleSubmit}
                        capitalizeType="uppercase"
                    />
                </Grid>
            </Grid>
        </ModalButton>
    );
};

export default SignUp;
