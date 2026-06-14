import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import ButtonCustom from "components/common/FormFields/ButtonCustom";
import { deriveAtlasRecord } from "utils/tripStats";
import { BUTTON_VARIANT } from "constants";
import type { TripState } from "types";
import "./index.scss";

export interface TripAtlasConfirmationProps {
    data: TripState;
}

/** Shown on a Completed trip: surfaces the visited-place cascade that ran on
 *  completion — "Added to your Travel Atlas" + what got recorded + a jump to
 *  the Atlas. Self-hides when the trip recorded nothing (only free-text /
 *  transport entries), since no Atlas write happened to celebrate. */
const TripAtlasConfirmation = ({ data }: TripAtlasConfirmationProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { countries, cities, places } = deriveAtlasRecord(data);

    if (places === 0 && countries === 0) return null;

    const stats = [
        countries > 0
            ? t("tripDetail.atlas.statCountries", { count: countries })
            : null,
        cities > 0 ? t("tripDetail.atlas.statCities", { count: cities }) : null,
        places > 0 ? t("tripDetail.atlas.statPlaces", { count: places }) : null,
    ].filter((s): s is string => Boolean(s));

    return (
        <div className="trip-atlas-confirmation">
            <div className="trip-atlas-confirmation-head">
                <PublicRoundedIcon className="trip-atlas-confirmation-icon" />
                <div className="trip-atlas-confirmation-copy">
                    <span className="trip-atlas-confirmation-title">
                        {t("tripDetail.atlas.title")}
                    </span>
                    <span className="trip-atlas-confirmation-sub">
                        {t("tripDetail.atlas.subtitle")}
                    </span>
                </div>
            </div>
            {stats.length > 0 && (
                <p className="trip-atlas-confirmation-stats">
                    {t("tripDetail.atlas.recorded", {
                        stats: stats.join(" • "),
                    })}
                </p>
            )}
            <ButtonCustom
                type={BUTTON_VARIANT.STANDARD_SMALL}
                capitalizeType="none"
                label={t("tripDetail.atlas.viewAtlas")}
                onClick={() => navigate("/my-map")}
                className="trip-atlas-confirmation-cta"
            />
        </div>
    );
};

export default TripAtlasConfirmation;
