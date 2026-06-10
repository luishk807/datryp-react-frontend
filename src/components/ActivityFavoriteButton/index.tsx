import classnames from "classnames";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import {
    useSavedPlaces,
    useSavePlace,
    useUnsavePlace,
} from "api/hooks/useSavedPlaces";
import { getPlaceKey } from "utils/placeKey";
import "./index.scss";

export interface ActivityFavoriteButtonProps {
    placeName: string;
    placeCity: string;
    placeCountry: string;
    /** Backend-stored slug when present — preferred so the key matches the
     *  place detail page (and the saved/bookmarks system) exactly. */
    placeKey?: string | null;
    countryCode?: string | null;
    imageUrl?: string | null;
}

/** Heart toggle for a place activity — the same place-keyed "saved" bookmark
 *  surfaced across the app. Sits in the activity title row; the label hides
 *  on mobile so it reads as an icon-only control. */
const ActivityFavoriteButton = ({
    placeName,
    placeCity,
    placeCountry,
    placeKey,
    countryCode,
    imageUrl,
}: ActivityFavoriteButtonProps) => {
    const key = placeKey || getPlaceKey(placeName, placeCity, placeCountry);
    const { data: savedData } = useSavedPlaces();
    const savePlace = useSavePlace();
    const unsavePlace = useUnsavePlace();
    const isSaved = Boolean(savedData?.items.some((b) => b.placeKey === key));
    const pending = savePlace.isPending || unsavePlace.isPending;

    const toggle = () => {
        if (pending) return;
        if (isSaved) {
            unsavePlace.mutate(key);
        } else {
            savePlace.mutate({
                placeName,
                placeCity,
                placeCountry,
                countryCode: countryCode ?? null,
                imageUrl: imageUrl ?? null,
            });
        }
    };

    return (
        <button
            type="button"
            className={classnames("activity-fav-btn", { "is-saved": isSaved })}
            onClick={toggle}
            disabled={pending}
            aria-pressed={isSaved}
            aria-label={
                isSaved
                    ? `Remove ${placeName} from favorites`
                    : `Save ${placeName} to favorites`
            }
            title={isSaved ? "Saved — tap to remove" : "Mark favorite"}
        >
            {isSaved ? (
                <FavoriteRoundedIcon className="activity-fav-btn-icon" />
            ) : (
                <FavoriteBorderRoundedIcon className="activity-fav-btn-icon" />
            )}
            <span className="activity-fav-btn-label">
                {isSaved ? "Saved" : "Favorite"}
            </span>
        </button>
    );
};

export default ActivityFavoriteButton;
