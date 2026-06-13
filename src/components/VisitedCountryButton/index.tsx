import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './index.scss';
import { Snackbar } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import classNames from 'classnames';
import {
    useMarkVisitedCountry,
    useUnmarkVisitedCountry,
    useVisitedCountries,
} from 'api/hooks/useVisitedCountries';
import { useUser } from 'context/UserContext';

export interface VisitedCountryButtonProps {
    countryCode: string;
    countryName: string;
}

const VisitedCountryButton = ({
    countryCode,
    countryName,
}: VisitedCountryButtonProps) => {
    const { t } = useTranslation();
    const { user } = useUser();
    const { data } = useVisitedCountries();
    const markVisited = useMarkVisitedCountry();
    const unmarkVisited = useUnmarkVisitedCountry();
    const [toast, setToast] = useState<string | null>(null);

    const normalizedCode = countryCode.toUpperCase();
    const isVisited = Boolean(
        data?.items.some((v) => v.countryCode.toUpperCase() === normalizedCode)
    );
    const isPending = markVisited.isPending || unmarkVisited.isPending;

    // Hide for anonymous viewers — the toggle hits a /me/... endpoint that
    // would 401 anyway. The country page itself is public.
    if (!user) return null;

    const handleClick = () => {
        if (isPending) return;
        if (isVisited) {
            unmarkVisited.mutate(normalizedCode, {
                onSuccess: () =>
                    setToast(
                        t('detail.common.visited.removedToast', {
                            name: countryName,
                        })
                    ),
                onError: (err) => setToast(err.message),
            });
        } else {
            markVisited.mutate(normalizedCode, {
                onSuccess: () =>
                    setToast(
                        t('detail.common.visited.markedToast', {
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
                className={classNames('visited-country-pill', 'is-icon-only', {
                    'is-visited': isVisited,
                })}
                aria-label={
                    isVisited
                        ? t('detail.common.visited.unmark', {
                              name: countryName,
                          })
                        : t('detail.common.visited.mark', {
                              name: countryName,
                          })
                }
                title={
                    isVisited
                        ? t('detail.common.visited.beenTitle', {
                              name: countryName,
                          })
                        : t('detail.common.visited.mark', {
                              name: countryName,
                          })
                }
                aria-pressed={isVisited}
                disabled={isPending}
                onClick={handleClick}
            >
                {isVisited ? (
                    <CheckCircleRoundedIcon className="visited-country-icon" />
                ) : (
                    <CheckCircleOutlineRoundedIcon className="visited-country-icon" />
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

export default VisitedCountryButton;
