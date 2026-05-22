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
                    : 'Could not save your preferences.'
            );
        }
    };

    return (
        <>
            <h1 className="signup-step-title">Tell us about your travel style</h1>
            <p className="signup-step-subtitle">
                Pick what feels right — we'll use these to surface trips and
                places you might love. You can change any of this later in your
                account.
            </p>

            <div className="signup-prefs-stack">
                <SearchablePicker
                    label="Interests"
                    options={interestOptions}
                    value={interests}
                    onChange={setInterests}
                    placeholder={
                        interestsLoading
                            ? 'Loading interests…'
                            : 'Search interests…'
                    }
                    disabled={interestsLoading}
                    maxSelected={MAX_INTERESTS}
                    helperText={`Pick up to ${MAX_INTERESTS}.`}
                />

                <SearchablePicker
                    label="What kind of traveler are you?"
                    options={styleOptions}
                    value={styles}
                    onChange={setStyles}
                    placeholder={
                        stylesLoading
                            ? 'Loading styles…'
                            : 'Search traveler styles…'
                    }
                    disabled={stylesLoading}
                    maxSelected={MAX_TRAVELER_STYLES}
                    helperText={`Pick up to ${MAX_TRAVELER_STYLES}.`}
                />

                <SearchablePicker
                    label="Places you'd like to visit"
                    options={destinationOptions}
                    value={destinations}
                    onChange={setDestinations}
                    placeholder={
                        countriesLoading
                            ? 'Loading countries…'
                            : 'Search countries…'
                    }
                    disabled={countriesLoading}
                    maxSelected={MAX_DREAM_DESTINATIONS}
                    helperText={`Pick up to ${MAX_DREAM_DESTINATIONS} countries.`}
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

export default StepInterests;
