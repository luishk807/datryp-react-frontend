import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './index.scss';
import { Snackbar } from '@mui/material';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import classNames from 'classnames';
import {
    useSavedPlaces,
    useSavePlace,
    useUnsavePlace,
} from 'api/hooks/useSavedPlaces';
import { useUser } from 'context/UserContext';
import { getPlaceKey } from 'utils/placeKey';
import { TRIP_BASIC } from 'constants';
import type { PlaceRecommendation } from 'types';

export interface BookmarkButtonProps {
    place: PlaceRecommendation;
    /** Search query used as part of the bookmark identity (so re-opening
     *  the place from the bookmarks list still hits the cached recommender). */
    query: string;
    index: number;
}

const BookmarkButton = ({ place, query, index }: BookmarkButtonProps) => {
    const { user } = useUser();
    const navigate = useNavigate();
    const { data } = useSavedPlaces();
    const savePlace = useSavePlace();
    const unsavePlace = useUnsavePlace();
    const [toast, setToast] = useState<string | null>(null);

    const placeKey = useMemo(
        () => getPlaceKey(place.name, place.city, place.country),
        [place.name, place.city, place.country]
    );
    const saved = Boolean(
        data?.items.some((b) => b.placeKey === placeKey)
    );
    const isPending = savePlace.isPending || unsavePlace.isPending;

    const handleClick = () => {
        if (!user) {
            // Anonymous → send to the gated route that renders AuthGate.
            navigate(TRIP_BASIC.SINGLE.route);
            return;
        }
        if (isPending) return;
        if (saved) {
            unsavePlace.mutate(placeKey, {
                onSuccess: () =>
                    setToast(`Removed ${place.name} from bookmarks`),
                onError: (err) => setToast(err.message),
            });
        } else {
            savePlace.mutate(
                {
                    placeName: place.name,
                    placeCity: place.city,
                    placeCountry: place.country,
                    imageUrl: place.imageUrl ?? null,
                    searchQuery: query,
                    searchIndex: index,
                },
                {
                    onSuccess: () =>
                        setToast(`Saved ${place.name} to your bookmarks`),
                    onError: (err) => setToast(err.message),
                }
            );
        }
    };

    return (
        <>
            <button
                type="button"
                className={classNames('bookmark-button-pill', 'is-icon-only', {
                    'is-saved': saved,
                })}
                aria-label={saved ? `Remove ${place.name} from bookmarks` : `Save ${place.name} to bookmarks`}
                title={
                    saved
                        ? `${place.name} is saved — tap to remove`
                        : `Save ${place.name}`
                }
                aria-pressed={saved}
                disabled={isPending}
                onClick={handleClick}
            >
                {saved ? (
                    <FavoriteRoundedIcon className="bookmark-button-icon" />
                ) : (
                    <FavoriteBorderRoundedIcon className="bookmark-button-icon" />
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

export default BookmarkButton;
