/**
 * Step 6 — Travel-style preferences. Three searchable multi-selects:
 *  - Interests (`/me/interests-catalog`)
 *  - Traveler styles (`/me/traveler-styles-catalog`)
 *  - Dream destinations (full country catalog)
 *
 * Persists all three on Continue via a single PATCH /me/preferences.
 * Each field is independently skippable — Continue submits whatever the
 * user has picked, and a separate "Skip for now" leaves everything as-is.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import SearchablePicker from 'components/common/FormFields/SearchablePicker';
import {
    useInterestsCatalog,
    useTravelerStylesCatalog,
    useUpdateMyPreferences,
} from 'api/hooks/useMyPreferences';
import { useCountries } from 'api/hooks/useCountries';
import './index.scss';

export interface StepInterestsProps {
    onContinue: () => void;
    onSkip: () => void;
}

const MAX_INTERESTS = 8;
const MAX_TRAVELER_STYLES = 4;
const MAX_DREAM_DESTINATIONS = 8;

const StepInterests = ({ onContinue, onSkip }: StepInterestsProps) => {
    const { t } = useTranslation();
    const { data: interestCatalog = [], isLoading: interestsLoading } =
        useInterestsCatalog();
    const { data: styleCatalog = [], isLoading: stylesLoading } =
        useTravelerStylesCatalog();
    const { data: countries = [], isLoading: countriesLoading } = useCountries(
        '',
        { limit: 300 }
    );
    const update = useUpdateMyPreferences();

    const [interests, setInterests] = useState<string[]>([]);
    const [styles, setStyles] = useState<string[]>([]);
    const [destinations, setDestinations] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const interestOptions = useMemo(
        () => interestCatalog.map((o) => ({ value: o.slug, label: o.label })),
        [interestCatalog]
    );
    const styleOptions = useMemo(
        () => styleCatalog.map((o) => ({ value: o.slug, label: o.label })),
        [styleCatalog]
    );
    const destinationOptions = useMemo(
        () => countries.map((c) => ({ value: c.code, label: c.name })),
        [countries]
    );

    const hasAnySelection =
        interests.length > 0 || styles.length > 0 || destinations.length > 0;

    const handleContinue = async () => {
        if (!hasAnySelection) {
            onSkip();
            return;
        }
        try {
            await update.mutateAsync({
                interests,
                travelerStyles: styles,
                dreamDestinations: destinations,
            });
            onContinue();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : t('auth.signup.interests.saveError')
            );
        }
    };

    return (
        <>
            <h1 className="signup-step-title">{t('auth.signup.interests.title')}</h1>
            <p className="signup-step-subtitle">
                {t('auth.signup.interests.subtitle')}
            </p>

            <div className="signup-prefs-stack">
                <SearchablePicker
                    label={t('auth.signup.interests.interestsLabel')}
                    options={interestOptions}
                    value={interests}
                    onChange={setInterests}
                    placeholder={
                        interestsLoading
                            ? t('auth.signup.interests.loadingInterests')
                            : t('auth.signup.interests.searchInterests')
                    }
                    disabled={interestsLoading}
                    maxSelected={MAX_INTERESTS}
                    helperText={t('auth.signup.interests.pickUpTo', {
                        max: MAX_INTERESTS,
                    })}
                />

                <SearchablePicker
                    label={t('auth.signup.interests.stylesLabel')}
                    options={styleOptions}
                    value={styles}
                    onChange={setStyles}
                    placeholder={
                        stylesLoading
                            ? t('auth.signup.interests.loadingStyles')
                            : t('auth.signup.interests.searchStyles')
                    }
                    disabled={stylesLoading}
                    maxSelected={MAX_TRAVELER_STYLES}
                    helperText={t('auth.signup.interests.pickUpTo', {
                        max: MAX_TRAVELER_STYLES,
                    })}
                />

                <SearchablePicker
                    label={t('auth.signup.interests.destinationsLabel')}
                    options={destinationOptions}
                    value={destinations}
                    onChange={setDestinations}
                    placeholder={
                        countriesLoading
                            ? t('auth.common.loadingCountries')
                            : t('auth.signup.interests.searchCountries')
                    }
                    disabled={countriesLoading}
                    maxSelected={MAX_DREAM_DESTINATIONS}
                    helperText={t('auth.signup.interests.pickUpToCountries', {
                        max: MAX_DREAM_DESTINATIONS,
                    })}
                />
            </div>

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

export default StepInterests;
