import './index.scss';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import CloudOffRoundedIcon from '@mui/icons-material/CloudOffRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import PlaceCard from 'components/common/PlaceCard';
import PlaceCardSkeleton from 'components/common/PlaceCard/PlaceCardSkeleton';
import ButtonIcon from 'components/common/FormFields/ButtonIcon';
import { useMonthlyTopCities } from 'api/hooks/useMonthlyTopCities';
import { BUTTON_VARIANT, NO_IMAGE } from 'constants';
import type { TopPlace } from 'types';

export interface TopPlacesProps {
    /** Card click handler — receives the same `TopPlace` shape Home expects,
     *  built from the live monthly city. */
    onPlaceClick: (place: TopPlace) => void;
    title?: string;
    subtitle?: string;
    /** Optional icon rendered before the title (e.g. a section glyph on the
     *  mobile home dashboard). Omitted → title renders as before. */
    titleIcon?: ReactNode;
}

const formatMonth = (monthKey: string): string => {
    // monthKey is "YYYY-MM"; convert to "May 2026".
    const [year, monthStr] = monthKey.split('-');
    const month = Number(monthStr);
    if (!year || Number.isNaN(month) || month < 1 || month > 12) return '';
    const date = new Date(Number(year), month - 1, 1);
    return date.toLocaleString(undefined, {
        month: 'long',
        year: 'numeric',
    });
};

const TopPlaces = ({
    onPlaceClick,
    title,
    subtitle,
    titleIcon,
}: TopPlacesProps) => {
    const { t } = useTranslation();
    const { data, isLoading, isError, isFetching, refetch } =
        useMonthlyTopCities();

    const effectiveTitle = title ?? t('homeCards.topPlaces.title');

    // Subtitle defaults to the month label so the user understands the list
    // rotates monthly. Falls back to the caller's override if provided.
    const effectiveSubtitle =
        subtitle ??
        (data
            ? t('homeCards.topPlaces.curatedFor', {
                  month: formatMonth(data.month),
              })
            : t('homeCards.topPlaces.getInspired'));

    return (
        <section className="top-places">
            <div className="top-places-header">
                <h2
                    className={
                        titleIcon
                            ? 'top-places-title top-places-title--icon'
                            : 'top-places-title'
                    }
                >
                    {titleIcon}
                    {effectiveTitle}
                </h2>
                {effectiveSubtitle && (
                    <span className="top-places-subtitle">
                        {effectiveSubtitle}
                    </span>
                )}
            </div>

            {isLoading && (
                <div className="top-places-grid" aria-live="polite">
                    <PlaceCardSkeleton count={6} />
                </div>
            )}

            {isError && (
                <div className="top-places-error" role="alert">
                    <CloudOffRoundedIcon
                        className="top-places-error-icon"
                        aria-hidden="true"
                    />
                    <p className="top-places-error-text">
                        {t('homeCards.topPlaces.loadError')}
                    </p>
                    <ButtonIcon
                        title={
                            isFetching
                                ? t('homeCards.topPlaces.retrying')
                                : t('homeCards.topPlaces.tryAgain')
                        }
                        Icon={RefreshRoundedIcon}
                        iconPosition="start"
                        type={BUTTON_VARIANT.STANDARD}
                        onClick={() => refetch()}
                        disabled={isFetching}
                    />
                </div>
            )}

            {!isLoading && !isError && data && (
                <div className="top-places-grid">
                    {data.cities.map((city) => {
                        const place: TopPlace = {
                            // Slug stays stable across renders; safer than
                            // the array index when the list shuffles monthly.
                            id: `${city.name}--${city.countryCode}`,
                            name: city.name,
                            country: city.country,
                            countryCode: city.countryCode,
                            image: city.imageUrl ?? NO_IMAGE,
                            tagline: city.why,
                        };
                        return (
                            <PlaceCard
                                key={place.id}
                                place={{
                                    ...place,
                                    photographerName: city.photographerName,
                                    photographerUrl: city.photographerUrl,
                                }}
                                onClick={() => onPlaceClick(place)}
                            />
                        );
                    })}
                </div>
            )}
        </section>
    );
};

export default TopPlaces;
