/**
 * Step 1 — Name. Optional in the backend (signup accepts no name), so we
 * allow blank + Continue. Personal-feeling first question that warms the
 * user up to the flow.
 */
import ButtonCustom from 'components/common/FormFields/ButtonCustom';

export interface StepNameProps {
    value: string;
    onChange: (next: string) => void;
    onContinue: () => void;
}

const StepName = ({ value, onChange, onContinue }: StepNameProps) => {
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
        </>
    );
};

export default StepName;
