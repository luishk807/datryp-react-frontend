import { useTranslation } from "react-i18next";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import AvatarStack from "components/common/AvatarStack";
import StarInput from "components/common/FormFields/StarInput";
import { useTripCompanions } from "api/hooks/useTripCompanions";
import "./index.scss";

export interface TripCompanionsCardProps {
    tripId: string;
}

const TripCompanionsCard = ({ tripId }: TripCompanionsCardProps) => {
    const { t } = useTranslation();
    const { data } = useTripCompanions(tripId);
    const companions = data ?? [];

    // Nobody else on the trip → nothing to show. (Self is excluded server-side.)
    if (companions.length === 0) return null;

    return (
        <section
            className="trip-companions-card"
            aria-label={t("tripDetail.companions.title")}
        >
            <h3 className="trip-companions-title">
                {t("tripDetail.companions.title")}
            </h3>
            <ul className="trip-companions-list">
                {companions.map((c) => {
                    const name = c.name || t("tripDetail.companions.traveler");
                    return (
                        <li className="trip-companion" key={c.userId}>
                            <AvatarStack
                                people={[
                                    {
                                        id: c.userId,
                                        name,
                                        imageUrl: c.profileImageUrl,
                                    },
                                ]}
                                max={1}
                                size="md"
                                showOverflow={false}
                            />
                            <div className="trip-companion-body">
                                <span className="trip-companion-name">
                                    {name}
                                </span>
                                <div className="trip-companion-meta">
                                    {c.rating != null ? (
                                        <span className="trip-companion-rating">
                                            <StarInput
                                                value={c.rating}
                                                readonly
                                                size="sm"
                                            />
                                        </span>
                                    ) : (
                                        <span className="trip-companion-muted">
                                            {t("tripDetail.companions.notRatedYet")}
                                        </span>
                                    )}
                                    {c.favoritePlace && (
                                        <span className="trip-companion-fav">
                                            <FavoriteRoundedIcon className="trip-companion-fav-icon" />
                                            {c.favoritePlace}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
};

export default TripCompanionsCard;
