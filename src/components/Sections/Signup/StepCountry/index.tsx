/**
 * Step 5 — Country of birth. Uses the existing `useCountries('')`
 * catalog so the dropdown stays cached and consistent with the Account
 * page. Skippable; advancing writes via PATCH /me/preferences only if
 * a country was picked.
 */
import { useState } from 'react';
import DropDown from 'components/common/FormFields/DropDown';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import { useCountries } from 'api/hooks/useCountries';
import { useUpdateMyPreferences } from 'api/hooks/useMyPreferences';

export interface StepCountryProps {
    onContinue: () => void;
    onSkip: () => void;
}

const StepCountry = ({ onContinue, onSkip }: StepCountryProps) => {
    const { data: countries = [], isLoading } = useCountries('', { limit: 300 });
    const update = useUpdateMyPreferences();
    const [code, setCode] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    const handleContinue = async () => {
        if (!code) {
            onSkip();
            return;
        }
        setError(null);
        try {
            await update.mutateAsync({ countryOfBirthCode: code });
            onContinue();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Could not save that.'
            );
        }
    };

    return (
        <>
            <h1 className="signup-step-title">Where are you from?</h1>
            <p className="signup-step-subtitle">
                Helps us tune recommendations to where you're starting from.
            </p>
            <DropDown
                label="Country"
                options={countries}
                valueKey="code"
                value={code || null}
                placeholder={isLoading ? 'Loading countries…' : 'Select a country'}
                disabled={isLoading}
                onChange={(opt) => {
                    setCode(opt?.code ?? '');
                    if (error) setError(null);
                }}
            />
            {error && (
                <p className="signup-error" role="alert">
                    {error}
                </p>
            )}
            <div className="signup-step-actions">
                <ButtonCustom
                    type="none"
                    capitalizeType="none"
                    className="signup-primary-btn"
                    label={update.isPending ? 'Saving…' : 'Continue'}
                    onClick={handleContinue}
                    disabled={update.isPending}
                />
                <button
                    type="button"
                    className="signup-skip-link"
                    onClick={onSkip}
                >
                    Skip for now
                </button>
            </div>
        </>
    );
};

export default StepCountry;
