import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './index.scss';
import { Snackbar } from '@mui/material';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import classNames from 'classnames';
import {
    useSavedCountries,
    useSaveCountry,
    useUnsaveCountry,
} from 'api/hooks/useSavedCountries';
import { useUser } from 'context/UserContext';
import { TRIP_BASIC } from 'constants';

export interface BookmarkCountryButtonProps {
    countryCode: string;
    countryName: string;
    /** Hero image for the country page — currently sourced from the
     *  countries catalog server-side, so this prop is no longer
     *  persisted. Kept for API compatibility with the previous
     *  localStorage-backed implementation. */
    imageUrl?: string | null;
}

const BookmarkCountryButton = ({
    countryCode,
    countryName,
}: BookmarkCountryButtonProps) => {
    const { t } = useTranslation();
    const { user } = useUser();
    const navigate = useNavigate();
    const { data } = useSavedCountries();
    const saveCountry = useSaveCountry();
    const unsaveCountry = useUnsaveCountry();
    const [toast, setToast] = useState<string | null>(null);

    const normalizedCode = countryCode.trim().toUpperCase();
    const saved = Boolean(
        data?.items.some((b) => b.countryCode === normalizedCode)
    );
    const isPending = saveCountry.isPending || unsaveCountry.isPending;

    const handleClick = () => {
        if (!user) {
            navigate(TRIP_BASIC.SINGLE.route);
            return;
        }
        if (isPending) return;
        if (saved) {
            unsaveCountry.mutate(normalizedCode, {
                onSuccess: () =>
                    setToast(
                        t('detail.common.bookmark.removedToast', {
                            name: countryName,
                        })
                    ),
                onError: (err) => setToast(err.message),
            });
        } else {
            saveCountry.mutate(normalizedCode, {
                onSuccess: () =>
                    setToast(
                        t('detail.common.bookmark.savedToast', {
                            name: countryName,
                        })
                    ),
                onError: (err) => setToast(err.message),
            });
        }
    };

    return (
        <>
            <button
                type="button"
                className={classNames('bookmark-country-pill', 'is-icon-only', {
                    'is-saved': saved,
                })}
                aria-label={
                    saved
                        ? t('detail.common.bookmark.removeAria', {
                              name: countryName,
                          })
                        : t('detail.common.bookmark.saveAria', {
                              name: countryName,
                          })
                }
                title={
                    saved
                        ? t('detail.common.bookmark.savedTitle', {
                              name: countryName,
                          })
                        : t('detail.common.bookmark.saveTitle', {
                              name: countryName,
                          })
                }
                aria-pressed={saved}
                disabled={isPending}
                onClick={handleClick}
            >
                {saved ? (
                    <FavoriteRoundedIcon className="bookmark-country-icon" />
                ) : (
                    <FavoriteBorderRoundedIcon className="bookmark-country-icon" />
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

export default BookmarkCountryButton;
