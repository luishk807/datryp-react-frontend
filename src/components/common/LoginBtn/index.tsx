import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './index.scss';
import { Grid } from '@mui/material';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import ButtonCustom from '../FormFields/ButtonCustom';
import InputField from '../FormFields/InputField';
import GoogleSignInButton from 'components/GoogleSignInButton';
import { useGoogleSignin } from 'api/hooks/useAuth';
import { AUTH_LABEL } from 'constants';

type LoginView = 'choose' | 'email';

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
    /**
     * Called when the user picks "Don't have an account? Sign up" at the
     * bottom of the modal. Header wires this to navigate to `/signup`
     * (the full-page, step-by-step flow). Omit to hide the link.
     */
    onSwitchToSignup?: () => void;
}

export const LoginBtn = ({ onClick, onSwitchToSignup }: LoginBtnProps) => {
    const modelRef = useRef<ModalButtonHandle>(null);
    const navigate = useNavigate();
    const googleSignin = useGoogleSignin();
    const [view, setView] = useState<LoginView>('choose');
    const [form, setForm] = useState<LoginForm>({});
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const label = AUTH_LABEL.LOGIN;

    // Reset to the provider chooser whenever the modal closes (X, backdrop,
    // escape, or a successful login). Without this, re-opening the modal
    // would dump the user straight back into the email form they last saw.
    const handleModalClose = () => {
        setView('choose');
        setError(null);
        setForm({});
    };

    // Memoized so the Google button effect doesn't re-init the GIS client
    // on every render. Mirrors the pattern in AuthGate so backend errors
    // (e.g. the 409 "email already has a password account" linking
    // refusal) surface in the same error slot as the password form.
    const handleGoogleCredential = useCallback(
        (credential: string) => {
            setError(null);
            googleSignin.mutate(credential, {
                onSuccess: () => modelRef.current?.closeModal(),
                onError: (err) =>
                    setError(
                        err instanceof Error
                            ? err.message
                            : 'Google sign-in failed.'
                    ),
            });
        },
        [googleSignin]
    );

    const handleForgotPassword = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        modelRef.current?.closeModal();
        navigate('/forgot-password');
    };

    const handleSwitchToSignup = () => {
        // Close this modal *first* so MUI's backdrop and the signup
        // modal's backdrop don't fight for focus. The signup modal opens
        // on the next paint, after this one has finished its exit
        // transition.
        modelRef.current?.closeModal();
        onSwitchToSignup?.();
    };

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
            onClose={handleModalClose}
            buttonProps={{
                title: label,
                type: 'text-plain',
            }}
        >
            {view === 'choose' ? (
                <Grid container>
                    <Grid item lg={12} xs={12} md={12} className="form-input login-google">
                        <GoogleSignInButton
                            text="continue_with"
                            onCredential={handleGoogleCredential}
                        />
                    </Grid>
                    {error && (
                        <Grid item lg={12} xs={12} md={12} className="form-input form-error" role="alert">
                            {error}
                        </Grid>
                    )}
                    <Grid item lg={12} xs={12} md={12} className="form-input login-email-cta">
                        <ButtonCustom
                            type="line"
                            capitalizeType="none"
                            className="login-provider-btn"
                            onClick={() => {
                                setError(null);
                                setView('email');
                            }}
                        >
                            <MailOutlineRoundedIcon fontSize="small" />
                            <span>Continue with email</span>
                        </ButtonCustom>
                    </Grid>
                    {onSwitchToSignup && (
                        <Grid item lg={12} xs={12} md={12} className="form-input login-switch">
                            Don't have an account?{' '}
                            <ButtonCustom
                                type="text"
                                capitalizeType="none"
                                className="login-switch-link"
                                label="Sign up"
                                onClick={handleSwitchToSignup}
                            />
                        </Grid>
                    )}
                </Grid>
            ) : (
                <Grid container>
                    <Grid item lg={12} xs={12} md={12} className="form-input login-back">
                        <ButtonCustom
                            type="text"
                            capitalizeType="none"
                            className="login-back-btn"
                            onClick={() => {
                                setError(null);
                                setView('choose');
                            }}
                        >
                            <ArrowBackIcon fontSize="small" />
                            <span>Back</span>
                        </ButtonCustom>
                    </Grid>
                    <Grid item lg={12} xs={12} md={12} className="form-input">
                        <InputField name="username" onChange={(e) => onChange('username', e)} />
                    </Grid>
                    <Grid item lg={12} xs={12} md={12} className="form-input">
                        <InputField name="password" type="password" onChange={(e) => onChange('password', e)} />
                    </Grid>
                    <Grid item lg={12} xs={12} md={12} className="form-input">
                        <a href="/forgot-password" onClick={handleForgotPassword}>
                            Forgot password?
                        </a>
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
                    {onSwitchToSignup && (
                        <Grid item lg={12} xs={12} md={12} className="form-input login-switch">
                            Don't have an account?{' '}
                            <ButtonCustom
                                type="text"
                                capitalizeType="none"
                                className="login-switch-link"
                                label="Sign up"
                                onClick={handleSwitchToSignup}
                            />
                        </Grid>
                    )}
                </Grid>
            )}
        </ModalButton>
    );
};

export default LoginBtn;
