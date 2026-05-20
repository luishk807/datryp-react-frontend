/**
 * Step 4 — Birth year + 13+ attestation. The legal gate. On Continue
 * the shell calls /auth/signup with everything collected so far; if it
 * fails, the error renders on this step (where the most likely culprits
 * — duplicate email, weak password — should still surface useful copy).
 */
import { useMemo } from 'react';
import DropDown from 'components/common/FormFields/DropDown';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import { MAX_BIRTH_YEAR, MIN_BIRTH_YEAR, MIN_SIGNUP_AGE } from 'utils/age';
import './index.scss';

export interface StepAgeProps {
    birthYear: number | '';
    confirmAge: boolean;
    onBirthYearChange: (next: number | '') => void;
    onConfirmChange: (next: boolean) => void;
    onSubmit: () => void;
    submitting: boolean;
}

const StepAge = ({
    birthYear,
    confirmAge,
    onBirthYearChange,
    onConfirmChange,
    onSubmit,
    submitting,
}: StepAgeProps) => {
    const yearOptions = useMemo(() => {
        const out: { id: number; name: string }[] = [];
        for (let y = MAX_BIRTH_YEAR; y >= MIN_BIRTH_YEAR; y--) {
            out.push({ id: y, name: String(y) });
        }
        return out;
    }, []);

    const canSubmit =
        typeof birthYear === 'number' && confirmAge && !submitting;

    return (
        <>
            <h1 className="signup-step-title">When were you born?</h1>
            <p className="signup-step-subtitle">
                You must be at least {MIN_SIGNUP_AGE} years old to use daTryp.
                Year only — we don't ask for your full birthday.
            </p>
            <div className="signup-age-field">
                <DropDown
                    label="Year of birth"
                    options={yearOptions}
                    valueKey="id"
                    value={birthYear === '' ? null : birthYear}
                    placeholder="Select a year"
                    onChange={(opt) =>
                        onBirthYearChange(
                            opt && typeof opt.id === 'number' ? opt.id : ''
                        )
                    }
                />
            </div>
            <label className="signup-age-confirm">
                <input
                    type="checkbox"
                    checked={confirmAge}
                    onChange={(e) => onConfirmChange(e.target.checked)}
                />
                <span>
                    I confirm I am at least {MIN_SIGNUP_AGE} years old.
                </span>
            </label>
            <div className="signup-step-actions">
                <ButtonCustom
                    type="none"
                    capitalizeType="none"
                    className="signup-primary-btn"
                    label={submitting ? 'Creating account…' : 'Create account'}
                    onClick={onSubmit}
                    disabled={!canSubmit}
                />
            </div>
        </>
    );
};

export default StepAge;
