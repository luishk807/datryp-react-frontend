import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './index.scss';
import { Snackbar } from '@mui/material';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import classNames from 'classnames';
import {
    useSavedCities,
    useSaveCity,
    useUnsaveCity,
} from 'api/hooks/useSavedCities';
import { useUser } from 'context/UserContext';
import { TRIP_BASIC } from 'constants';

export interface BookmarkCityButtonProps {
    cityName: string;
    countryName: string;
    countryCode: string;
    imageUrl: string | null;
}

/** Match the backend's `slugify_city`: lowercased name (whitespace
 *  collapsed) + lowercased code joined by `--`. Same shape used by
 *  `VisitedCityButton`. */
const slugifyCity = (name: string, code: string): string => {
    const cityN = name.trim().toLowerCase().replace(/\s+/g, ' ');
    const codeN = code.trim().toLowerCase();
    return `${cityN}--${codeN}`;
};

const BookmarkCityButton = ({
    cityName,
    countryName,
    countryCode,
    imageUrl,
}: BookmarkCityButtonProps) => {
    const { t } = useTranslation();
    const { user } = useUser();
    const navigate = useNavigate();
    const { data } = useSavedCities();
    const saveCity = useSaveCity();
    const unsaveCity = useUnsaveCity();
    const [toast, setToast] = useState<string | null>(null);

    const slug = useMemo(
        () => slugifyCity(cityName, countryCode),
        [cityName, countryCode]
    );
    const saved = Boolean(data?.items.some((b) => b.citySlug === slug));
    const isPending = saveCity.isPending || unsaveCity.isPending;

    const handleClick = () => {
        if (!user) {
            navigate(TRIP_BASIC.SINGLE.route);
            return;
        }
        if (isPending) return;
        if (saved) {
            unsaveCity.mutate(slug, {
                onSuccess: () =>
                    setToast(
                        t('detail.common.bookmark.removedToast', {
                            name: cityName,
                        })
                    ),
                onError: (err) => setToast(err.message),
            });
        } else {
            saveCity.mutate(
                {
                    name: cityName,
                    country: countryName,
                    code: countryCode,
                    imageUrl,
                },
                {
                    onSuccess: () =>
                        setToast(
                            t('detail.common.bookmark.savedToast', {
                                name: cityName,
                            })
                        ),
                    onError: (err) => setToast(err.message),
                }
            );
        }
    };

    return (
        <>
            <button
                type="button"
                className={classNames('bookmark-city-pill', 'is-icon-only', {
                    'is-saved': saved,
                })}
                aria-label={
                    saved
                        ? t('detail.common.bookmark.removeAria', {
                              name: cityName,
                          })
                        : t('detail.common.bookmark.saveAria', {
                              name: cityName,
                          })
                }
                title={
                    saved
                        ? t('detail.common.bookmark.savedTitle', {
                              name: cityName,
                          })
                        : t('detail.common.bookmark.saveTitle', {
                              name: cityName,
                          })
                }
                aria-pressed={saved}
                disabled={isPending}
                onClick={handleClick}
            >
                {saved ? (
                    <FavoriteRoundedIcon className="bookmark-city-icon" />
                ) : (
                    <FavoriteBorderRoundedIcon className="bookmark-city-icon" />
                )}
            </button>

            <Snackbar
                open={Boolean(toast)}
                onClose={() => setToast(null)}
                autoHideDuration={2200}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                message={toast}
            />
        </>
    );
};

export default BookmarkCityButton;
