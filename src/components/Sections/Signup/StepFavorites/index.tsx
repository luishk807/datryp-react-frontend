/**
 * Step 7 — Favorites. Photo grid of the month's top cities (Unsplash via
 * `/top-cities-monthly`). Tapping a card saves the city to the user's
 * bookmarks via `/me/saved/cities`. Reuses the cities the shell already
 * fetched so this step doesn't double-fetch.
 *
 * Skippable. No-op continue if nothing was picked.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import classnames from 'classnames';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import { useSaveCity, useUnsaveCity } from 'api/hooks/useSavedCities';
import type { MonthlyTopCity, SavedCityCreatePayload } from 'types';
import { NO_IMAGE } from 'constants';
import './index.scss';

export interface StepFavoritesProps {
    cities: MonthlyTopCity[];
    onContinue: () => void;
    onSkip: () => void;
}

const slugify = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const StepFavorites = ({ cities, onContinue, onSkip }: StepFavoritesProps) => {
    const { t } = useTranslation();
    const save = useSaveCity();
    const unsave = useUnsaveCity();
    const [savedSlugs, setSavedSlugs] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);

    const toggle = async (city: MonthlyTopCity) => {
        const slug = `${slugify(city.name)}-${city.countryCode.toLowerCase()}`;
        const isSaved = savedSlugs.has(slug);
        setError(null);
        // Optimistic: flip the slug immediately so the UI reacts on tap.
        // Revert on error.
        setSavedSlugs((prev) => {
            const next = new Set(prev);
            if (isSaved) next.delete(slug);
            else next.add(slug);
            return next;
        });
        try {
            if (isSaved) {
                await unsave.mutateAsync(slug);
            } else {
                const payload: SavedCityCreatePayload = {
                    name: city.name,
                    country: city.country,
                    code: city.countryCode,
                    imageUrl: city.imageUrl ?? null,
                };
                await save.mutateAsync(payload);
            }
        } catch (err) {
            // Revert the optimistic toggle.
            setSavedSlugs((prev) => {
                const next = new Set(prev);
                if (isSaved) next.add(slug);
                else next.delete(slug);
                return next;
            });
            setError(
                err instanceof Error
                    ? err.message
                    : t(
                        isSaved
                            ? 'auth.signup.favorites.removeError'
                            : 'auth.signup.favorites.saveError',
                        { name: city.name }
                    )
            );
        }
    };

    return (
        <>
            <h1 className="signup-step-title">{t('auth.signup.favorites.title')}</h1>
            <p className="signup-step-subtitle">
                {t('auth.signup.favorites.subtitle')}
            </p>
            <div className="signup-fav-grid">
                {cities.length === 0 && (
                    <p className="signup-fav-empty">
                        {t('auth.signup.favorites.loading')}
                    </p>
                )}
                {cities.map((city) => {
                    const slug = `${slugify(city.name)}-${city.countryCode.toLowerCase()}`;
                    const active = savedSlugs.has(slug);
                    return (
                        <button
                            key={slug}
                            type="button"
                            className={classnames('signup-fav-card', {
                                'is-active': active,
                            })}
                            aria-pressed={active}
                            onClick={() => void toggle(city)}
                        >
                            <img
                                src={city.imageUrl ?? NO_IMAGE}
                                alt=""
                                loading="lazy"
                                className="signup-fav-img"
                            />
                            <div className="signup-fav-meta">
                                <span className="signup-fav-name">{city.name}</span>
                                <span className="signup-fav-country">
                                    {city.country}
                                </span>
                            </div>
                            {active && (
                                <CheckCircleRoundedIcon className="signup-fav-check" />
                            )}
                        </button>
                    );
                })}
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
                    label={t('auth.common.continue')}
                    onClick={onContinue}
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

export default StepFavorites;
