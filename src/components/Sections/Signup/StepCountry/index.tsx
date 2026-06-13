/**
 * Step 5 — Country of birth. Uses the existing `useCountries('')`
 * catalog so the dropdown stays cached and consistent with the Account
 * page. Skippable; advancing writes via PATCH /me/preferences only if
 * a country was picked.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DropDown from 'components/common/FormFields/DropDown';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import { useCountries } from 'api/hooks/useCountries';
import { useUpdateMyPreferences } from 'api/hooks/useMyPreferences';

export interface StepCountryProps {
    onContinue: () => void;
    onSkip: () => void;
}

const StepCountry = ({ onContinue, onSkip }: StepCountryProps) => {
    const { t } = useTranslation();
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
                err instanceof Error ? err.message : t('auth.common.couldNotSave')
            );
        }
    };

    return (
        <>
            <h1 className="signup-step-title">{t('auth.signup.country.title')}</h1>
            <p className="signup-step-subtitle">
                {t('auth.signup.country.subtitle')}
            </p>
            <DropDown
                label={t('auth.signup.country.label')}
                options={countries}
                valueKey="code"
                value={code || null}
                placeholder={
                    isLoading
                        ? t('auth.common.loadingCountries')
                        : t('auth.signup.country.placeholder')
                }
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
                    label={
                        update.isPending
                            ? t('common.saving')
                            : t('auth.common.continue')
                    }
                    onClick={handleContinue}
                    disabled={update.isPending}
                />
                <button
                    type="button"
                    className="signup-skip-link"
                    onClick={onSkip}
                >
                    {t('auth.common.skipForNow')}
                </button>
            </div>
        </>
    );
};

export default StepCountry;
