/**
 * Step 2 — Email + Google shortcut. Google fast-tracks the user past
 * steps 3 and 4 (the shell jumps directly to Step 5 on a successful
 * Google credential).
 *
 * The form's email field is a plain `<input type="email">` so the
 * browser handles validation/autofill; the parent shell does the
 * "must look like an email" check on Continue.
 */
import { useTranslation } from 'react-i18next';
import GoogleSignInButton from 'components/GoogleSignInButton';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import './index.scss';

export interface StepEmailProps {
    value: string;
    onChange: (next: string) => void;
    onContinue: () => void;
    onGoogleCredential: (credential: string) => void;
    googlePending: boolean;
}

const StepEmail = ({
    value,
    onChange,
    onContinue,
    onGoogleCredential,
    googlePending,
}: StepEmailProps) => {
    const { t } = useTranslation();
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') onContinue();
    };

    return (
        <>
            <h1 className="signup-step-title" id="signup-email-q">
                {t('auth.signup.email.title')}
            </h1>
            <p className="signup-step-subtitle">
                {t('auth.signup.email.subtitle')}
            </p>
            <input
                className="signup-step-input"
                type="email"
                autoFocus
                aria-labelledby="signup-email-q"
                inputMode="email"
                autoComplete="email"
                placeholder={t('auth.common.emailPlaceholder')}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={255}
            />
            <div className="signup-step-actions">
                <ButtonCustom
                    type="none"
                    capitalizeType="none"
                    className="signup-primary-btn"
                    label={t('auth.common.continue')}
                    onClick={onContinue}
                    disabled={!value.trim()}
                />
            </div>
            <div className="signup-divider">
                <span>{t('auth.common.or')}</span>
            </div>
            <div className="signup-google-row">
                <GoogleSignInButton
                    text="signup_with"
                    width={400}
                    onCredential={onGoogleCredential}
                />
                {googlePending && (
                    <span className="signup-google-pending">
                        {t('auth.signup.googlePending')}
                    </span>
                )}
            </div>
        </>
    );
};

export default StepEmail;
