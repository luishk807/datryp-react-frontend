import { useNavigate } from "react-router-dom";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import ButtonCustom from "components/common/FormFields/ButtonCustom";
import { deriveAtlasRecord } from "utils/tripStats";
import { BUTTON_VARIANT } from "constants";
import type { TripState } from "types";
import "./index.scss";

export interface TripAtlasConfirmationProps {
    data: TripState;
}

const seg = (n: number, singular: string, plural: string): string | null =>
    n > 0 ? `${n} ${n === 1 ? singular : plural}` : null;

/** Shown on a Completed trip: surfaces the visited-place cascade that ran on
 *  completion — "Added to your Travel Atlas" + what got recorded + a jump to
 *  the Atlas. Self-hides when the trip recorded nothing (only free-text /
 *  transport entries), since no Atlas write happened to celebrate. */
const TripAtlasConfirmation = ({ data }: TripAtlasConfirmationProps) => {
    const navigate = useNavigate();
    const { countries, cities, places } = deriveAtlasRecord(data);

    if (places === 0 && countries === 0) return null;

    const stats = [
        seg(countries, "country", "countries"),
        seg(cities, "city", "cities"),
        seg(places, "place", "places"),
    ].filter((s): s is string => Boolean(s));

    return (
        <div className="trip-atlas-confirmation">
            <div className="trip-atlas-confirmation-head">
                <PublicRoundedIcon className="trip-atlas-confirmation-icon" />
                <div className="trip-atlas-confirmation-copy">
                    <span className="trip-atlas-confirmation-title">
                        Added to your Travel Atlas
                    </span>
                    <span className="trip-atlas-confirmation-sub">
                        You can now leave reviews and revisit your travel
                        history anytime.
                    </span>
                </div>
            </div>
            {stats.length > 0 && (
                <p className="trip-atlas-confirmation-stats">
                    {stats.join(" • ")} recorded
                </p>
            )}
            <ButtonCustom
                type={BUTTON_VARIANT.STANDARD}
                capitalizeType="none"
                label="View Atlas"
                onClick={() => navigate("/my-map")}
                className="trip-atlas-confirmation-cta"
            />
        </div>
    );
};

export default TripAtlasConfirmation;
