/**
 * Step 1 — Name. Optional in the backend (signup accepts no name), so we
 * allow blank + Continue. Personal-feeling first question that warms the
 * user up to the flow. Google sign-in is offered right here too so users
 * who want the fast path don't have to type anything — clicking the
 * Google button skips Steps 1-4 entirely and lands them in onboarding.
 */
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
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') onContinue();
    };

    return (
        <>
            <h1 className="signup-step-title">What should we call you?</h1>
            <p className="signup-step-subtitle">
                Just a first name is fine — we'll use it to personalize the app.
            </p>
            <input
                className="signup-step-input"
                type="text"
                autoFocus
                placeholder="e.g. Alex"
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
                    label="Continue"
                    onClick={onContinue}
                />
            </div>
            <div className="signup-divider">
                <span>or</span>
            </div>
            <div className="signup-google-row">
                <GoogleSignInButton
                    text="signup_with"
                    width={400}
                    onCredential={onGoogleCredential}
                />
                {googlePending && (
                    <span className="signup-google-pending">
                        Signing you in…
                    </span>
                )}
            </div>
        </>
    );
};

export default StepName;
