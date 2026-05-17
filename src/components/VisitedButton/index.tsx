import { useMemo, useState } from 'react';
import './index.scss';
import { Snackbar } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import classNames from 'classnames';
import {
    useMarkVisited,
    useUnmarkVisited,
    useVisitedPlaces,
} from 'api/hooks/useVisitedPlaces';
import { getPlaceKey } from 'utils/placeKey';
import { useUser } from 'context/UserContext';
import type { Coordinates, PlaceRecommendation, VisaInfo } from 'types';

export interface VisitedButtonProps {
    place: PlaceRecommendation;
    /** Detail-page enrichments — `coordinates.lat/lng` and
     *  `visa.destinationCountryCode` get stored on the visited row when
     *  available. Optional so the button still works before details land. */
    coordinates?: Coordinates;
    visa?: VisaInfo;
}

const VisitedButton = ({ place, coordinates, visa }: VisitedButtonProps) => {
    const { user } = useUser();
    const { data } = useVisitedPlaces();
    const markVisited = useMarkVisited();
    const unmarkVisited = useUnmarkVisited();
    const [toast, setToast] = useState<string | null>(null);

    const placeKey = useMemo(
        () => getPlaceKey(place.name, place.city, place.country),
        [place.name, place.city, place.country]
    );
    const isVisited = Boolean(
        data?.items.some((p) => p.placeKey === placeKey)
    );
    const isPending = markVisited.isPending || unmarkVisited.isPending;

    // Hide entirely for anonymous viewers — the place page is auth-gated but
    // guard anyway so the button never renders without a token to send.
    if (!user) return null;

    const handleClick = () => {
        if (isPending) return;
        if (isVisited) {
            unmarkVisited.mutate(placeKey, {
                onSuccess: () => setToast(`Removed ${place.name} from visited`),
                onError: (err) => setToast(err.message),
            });
        } else {
            markVisited.mutate(
                {
                    placeName: place.name,
                    placeCity: place.city,
                    placeCountry: place.country,
                    countryCode: visa?.destinationCountryCode ?? null,
                    latitude: coordinates?.lat ?? null,
                    longitude: coordinates?.lng ?? null,
                },
                {
                    onSuccess: () => setToast(`Marked ${place.name} as visited`),
                    onError: (err) => setToast(err.message),
                }
            );
        }
    };

    return (
        <>
            <button
                type="button"
                className={classNames('visited-button-pill', {
                    'is-visited': isVisited,
                })}
                aria-label={
                    isVisited
                        ? `Unmark ${place.name} as visited`
                        : `Mark ${place.name} as visited`
                }
                aria-pressed={isVisited}
                disabled={isPending}
                onClick={handleClick}
            >
                {isVisited ? (
                    <CheckCircleRoundedIcon className="visited-button-icon" />
                ) : (
                    <CheckCircleOutlineRoundedIcon className="visited-button-icon" />
                )}
                <span>{isVisited ? 'Visited' : "I've been here"}</span>
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

export default VisitedButton;
