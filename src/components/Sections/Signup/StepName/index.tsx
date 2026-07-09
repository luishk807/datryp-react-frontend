/**
 * Step 1 — Name. Optional in the backend (signup accepts no name), so we
 * allow blank + Continue. Personal-feeling first question that warms the
 * user up to the flow. Google sign-in is offered right here too so users
 * who want the fast path don't have to type anything — clicking the
 * Google button skips Steps 1-4 entirely and lands them in onboarding.
 */
import { useTranslation } from 'react-i18next';
import GoogleSignInButton from 'components/GoogleSignInButton';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';

export interface StepNameProps {
    value: string;
    onChange: (next: string) => void;
    onContinue: () => void;
    onGoogleCredential: (credential: string) => void;
    googlePending: boolean;
}

const StepName = ({
    value,
    onChange,
    onContinue,
    onGoogleCredential,
    googlePending,
}: StepNameProps) => {
    const { t } = useTranslation();
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') onContinue();
    };

    return (
        <>
            <h1 className="signup-step-title" id="signup-name-q">
                {t('auth.signup.name.title')}
            </h1>
            <p className="signup-step-subtitle">
                {t('auth.signup.name.subtitle')}
            </p>
            <input
                className="signup-step-input"
                type="text"
                autoFocus
                aria-labelledby="signup-name-q"
                placeholder={t('auth.signup.name.placeholder')}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={80}
            />
            <div className="signup-step-actions">
                <ButtonCustom
                    type="none"
                    capitalizeType="none"
                    className="signup-primary-btn"
                    label={t('auth.common.continue')}
                    onClick={onContinue}
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

export default StepName;
