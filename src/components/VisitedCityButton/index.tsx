import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './index.scss';
import { Snackbar } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import classNames from 'classnames';
import {
    useMarkVisitedCity,
    useUnmarkVisitedCity,
    useVisitedCities,
} from 'api/hooks/useVisitedCities';
import { useUser } from 'context/UserContext';

export interface VisitedCityButtonProps {
    cityName: string;
    countryName: string;
    countryCode: string;
}

/** Match the backend's slugify_city: lowercased name (whitespace collapsed)
 *  + lowercased code joined by `--`. Kept in sync manually since the slug
 *  is also the DELETE path param. */
const slugifyCity = (name: string, code: string): string => {
    const cityN = name.trim().toLowerCase().replace(/\s+/g, ' ');
    const codeN = code.trim().toLowerCase();
    return `${cityN}--${codeN}`;
};

const VisitedCityButton = ({
    cityName,
    countryName,
    countryCode,
}: VisitedCityButtonProps) => {
    const { t } = useTranslation();
    const { user } = useUser();
    const { data } = useVisitedCities();
    const markVisited = useMarkVisitedCity();
    const unmarkVisited = useUnmarkVisitedCity();
    const [toast, setToast] = useState<string | null>(null);

    const slug = useMemo(
        () => slugifyCity(cityName, countryCode),
        [cityName, countryCode]
    );
    const isVisited = Boolean(
        data?.items.some((v) => v.citySlug === slug)
    );
    const isPending = markVisited.isPending || unmarkVisited.isPending;

    if (!user) return null;

    const handleClick = () => {
        if (isPending) return;
        if (isVisited) {
            unmarkVisited.mutate(slug, {
                onSuccess: () =>
                    setToast(
                        t('detail.common.visited.removedToast', {
                            name: cityName,
                        })
                    ),
                onError: (err) => setToast(err.message),
            });
        } else {
            markVisited.mutate(
                { name: cityName, country: countryName, code: countryCode },
                {
                    onSuccess: () =>
                        setToast(
                            t('detail.common.visited.markedToast', {
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
                className={classNames('visited-city-pill', 'is-icon-only', {
                    'is-visited': isVisited,
                })}
                aria-label={
                    isVisited
                        ? t('detail.common.visited.unmark', { name: cityName })
                        : t('detail.common.visited.mark', { name: cityName })
                }
                title={
                    isVisited
                        ? t('detail.common.visited.beenTitle', {
                              name: cityName,
                          })
                        : t('detail.common.visited.mark', { name: cityName })
                }
                aria-pressed={isVisited}
                disabled={isPending}
                onClick={handleClick}
            >
                {isVisited ? (
                    <CheckCircleRoundedIcon className="visited-city-icon" />
                ) : (
                    <CheckCircleOutlineRoundedIcon className="visited-city-icon" />
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

export default VisitedCityButton;
