import { useTranslation } from "react-i18next";
import StarInput from "components/common/FormFields/StarInput";
import Stars from "components/common/Stars";
import { useTripRating } from "api/hooks/useTripRating";
import { useSaveTripRating } from "api/hooks/useSaveTripRating";
import "./index.scss";

export interface TripRatingCardProps {
    tripId: string;
    /** Whether the viewer is a trip member (owner / organizer / participant)
     *  and may therefore leave a rating. Non-members see the average only. */
    canRate: boolean;
}

const TripRatingCard = ({ tripId, canRate }: TripRatingCardProps) => {
    const { t } = useTranslation();
    const { data } = useTripRating(tripId);
    const save = useSaveTripRating();

    const myRating = data?.myRating ?? 0;
    const average = data?.average ?? null;
    const count = data?.count ?? 0;

    const pick = (value: number) => {
        if (!canRate || save.isPending) return;
        // Click the star you're already on to clear it back to "no rating".
        save.mutate({ tripId, rating: value === myRating ? null : value });
    };

    return (
        <section
            className="trip-rating-card"
            aria-label={t("tripDetail.rating.ariaLabel")}
        >
            <div className="trip-rating-card-head">
                <h3 className="trip-rating-card-title">
                    {t("tripDetail.rating.title")}
                </h3>
                {count > 0 ? (
                    <span className="trip-rating-card-avg">
                        <Stars rating={average ?? 0} />
                        <span className="trip-rating-card-count">
                            {t("tripDetail.rating.count", { count })}
                        </span>
                    </span>
                ) : (
                    <span className="trip-rating-card-count">
                        {t("tripDetail.rating.noneYet")}
                    </span>
                )}
            </div>

            {canRate && (
                <div className="trip-rating-card-mine">
                    <span className="trip-rating-card-mine-label">
                        {myRating > 0
                            ? t("tripDetail.rating.yourRating")
                            : t("tripDetail.rating.tapToRate")}
                    </span>
                    <StarInput value={myRating} onChange={pick} size="lg" />
                    {save.isError && (
                        <span className="trip-rating-card-error">
                            {t("tripDetail.rating.saveError")}
                        </span>
                    )}
                </div>
            )}
        </section>
    );
};

export default TripRatingCard;
