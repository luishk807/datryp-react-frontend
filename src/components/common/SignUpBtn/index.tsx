import { useMemo, useRef, useState } from 'react';
import './index.scss';
import { Grid } from '@mui/material';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import ButtonCustom from '../FormFields/ButtonCustom';
import InputField from '../FormFields/InputField';
import DropDown from '../FormFields/DropDown';
import { MAX_BIRTH_YEAR, MIN_BIRTH_YEAR, MIN_SIGNUP_AGE } from 'utils/age';
import { AUTH_LABEL } from 'constants';

export interface SignUpForm {
    username?: string;
    password?: string;
    name?: string;
    email?: string;
    /** Year of birth — collected from the dropdown. The Header maps this
     *  into `birth_year` on the API payload along with the checkbox below. */
    birthYear?: number;
    /** "I confirm I'm at least 13" attestation — backend rejects signup if
     *  this is false. */
    confirmAge13Plus?: boolean;
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

    // Year dropdown options — most-recent year first so users don't have to
    // scroll past 1900 to find their year. Range stays generous (everyone back
    // to 1900); the age check fires server-side regardless.
    const yearOptions = useMemo(() => {
        const out: { id: number; name: string }[] = [];
        for (let y = MAX_BIRTH_YEAR; y >= MIN_BIRTH_YEAR; y--) {
            out.push({ id: y, name: String(y) });
        }
        return out;
    }, []);

    const onChange = (field: keyof SignUpForm, e: { target: { value: string } }) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
        if (error) setError(null);
    };

    const toggleConfirmAge = () => {
        setForm((prev) => ({ ...prev, confirmAge13Plus: !prev.confirmAge13Plus }));
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
                    <DropDown
                        label="Year of birth"
                        options={yearOptions}
                        value={form.birthYear ?? null}
                        placeholder="Select a year"
                        onChange={(opt) => {
                            setForm((prev) => ({
                                ...prev,
                                birthYear:
                                    opt && typeof opt.id === 'number'
                                        ? opt.id
                                        : undefined,
                            }));
                            if (error) setError(null);
                        }}
                    />
                    <p className="age-notice">
                        You must be at least {MIN_SIGNUP_AGE} years old to use daTryp.
                    </p>
                </Grid>
                <Grid item lg={12} xs={12} md={12} className="form-input">
                    <label className="age-confirm-label">
                        <input
                            type="checkbox"
                            checked={!!form.confirmAge13Plus}
                            onChange={toggleConfirmAge}
                        />
                        <span>
                            I confirm I am at least {MIN_SIGNUP_AGE} years old.
                        </span>
                    </label>
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
