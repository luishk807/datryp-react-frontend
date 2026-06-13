/**
 * Step 6 — Gender. Optional, skippable. Reads the catalog from
 * `/me/genders-catalog` (DB-backed `genders` table, seeded with Male /
 * Female / Non-binary / Prefer not to say). Persists via PATCH
 * /me/preferences when the user advances with a selection.
 *
 * Gender powers the personalized "Best place this month" Pro
 * recommender — combined with age (birth_year) + country + interests.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DropDown from 'components/common/FormFields/DropDown';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import {
    useGendersCatalog,
    useUpdateMyPreferences,
} from 'api/hooks/useMyPreferences';

export interface StepGenderProps {
    onContinue: () => void;
    onSkip: () => void;
}

const StepGender = ({ onContinue, onSkip }: StepGenderProps) => {
    const { t } = useTranslation();
    const { data: genders = [], isLoading } = useGendersCatalog();
    const update = useUpdateMyPreferences();
    const [genderId, setGenderId] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    const options = genders.map((g) => ({ id: g.id, name: g.name }));

    const handleContinue = async () => {
        if (!genderId) {
            onSkip();
            return;
        }
        setError(null);
        try {
            await update.mutateAsync({ genderId });
            onContinue();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : t('auth.common.couldNotSave')
            );
        }
    };

    return (
        <>
            <h1 className="signup-step-title">{t('auth.signup.gender.title')}</h1>
            <p className="signup-step-subtitle">
                {t('auth.signup.gender.subtitle')}
            </p>
            <DropDown
                label={t('auth.signup.gender.label')}
                options={options}
                valueKey="id"
                value={genderId || null}
                placeholder={
                    isLoading
                        ? t('auth.common.loading')
                        : t('auth.signup.gender.placeholder')
                }
                disabled={isLoading}
                onChange={(opt) => {
                    setGenderId(
                        typeof opt?.id === 'string' ? opt.id : ''
                    );
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

export default StepGender;
