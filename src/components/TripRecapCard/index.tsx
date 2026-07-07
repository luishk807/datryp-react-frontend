import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import Stars from "components/common/Stars";
import StarInput from "components/common/FormFields/StarInput";
import ButtonCustom from "components/common/FormFields/ButtonCustom";
import AvatarStack from "components/common/AvatarStack";
import ModalButton, { type ModalButtonHandle } from "components/ModalButton";
import RecapForm from "components/TripRecapCard/RecapForm";
import { useUser } from "context/UserContext";
import { useTripRating } from "api/hooks/useTripRating";
import { useSaveTripRating } from "api/hooks/useSaveTripRating";
import { useTripCompanions } from "api/hooks/useTripCompanions";
import {
    BUTTON_VARIANT,
    EXPECTATION_EMOJI,
    TRIP_EXPECTATION,
} from "constants";
import type { TripRecapInput } from "api/tripRatingApi";
import "./index.scss";

export interface TripRecapCardProps {
    tripId: string;
    /** Whether the viewer is a trip member and may leave a recap. */
    canRate: boolean;
}

const TRIP_EXPECT_EMOJI: Record<string, string> = {
    [TRIP_EXPECTATION.BETTER]: EXPECTATION_EMOJI.positive,
    [TRIP_EXPECTATION.ABOUT]: EXPECTATION_EMOJI.neutral,
    [TRIP_EXPECTATION.WORSE]: EXPECTATION_EMOJI.negative,
};

/**
 * Whole-trip recap on a Completed trip — replaces the old inline "Your rating"
 * stars. A traveler who hasn't reviewed sees a "Want to leave a quick recap?"
 * prompt opening the recap modal (stars + expectations + surprised + advice);
 * once reviewed they see their own summary + an edit affordance. Below, the
 * group's ratings ("Reviews from your group") surface each traveler's own
 * verdict — everyone reviews, the recap is shared but personal.
 */
const TripRecapCard = ({ tripId, canRate }: TripRecapCardProps) => {
    const { t } = useTranslation();
    const { user } = useUser();
    const { data } = useTripRating(tripId);
    const { data: companionsData } = useTripCompanions(tripId);
    const save = useSaveTripRating();
    const modalRef = useRef<ModalButtonHandle>(null);
    const [dismissed, setDismissed] = useState(false);

    const myRating = data?.myRating ?? 0;
    const average = data?.average ?? null;
    const count = data?.count ?? 0;
    const hasReviewed = myRating > 0;
    const companions = companionsData ?? [];

    const openModal = () => modalRef.current?.openModel();

    const handleSave = (recap: TripRecapInput) => {
        save.mutate(
            { tripId, recap },
            { onSuccess: () => modalRef.current?.closeModal() }
        );
    };

    // "Reviews from your group" — you (once you've rated) + every companion,
    // so a trip's different travellers each show their own verdict.
    const groupRows = [
        ...(hasReviewed && user
            ? [
                  {
                      id: user.id,
                      name: t("tripDetail.recap.you"),
                      imageUrl: user.profileImageUrl,
                      rating: myRating,
                      favorite: null as string | null,
                  },
              ]
            : []),
        ...companions.map((c) => ({
            id: c.userId,
            name: c.name || t("tripDetail.companions.traveler"),
            imageUrl: c.profileImageUrl,
            rating: c.rating,
            favorite: c.favoritePlace,
        })),
    ];

    return (
        <section
            className="trip-recap-card"
            aria-label={t("tripDetail.rating.ariaLabel")}
        >
            <div className="trip-recap-head">
                <h3 className="trip-recap-title">
                    {t("tripDetail.rating.title")}
                </h3>
                <span className="trip-recap-avg">
                    {count > 0 ? (
                        <>
                            <Stars rating={average ?? 0} />
                            <span className="trip-recap-count">
                                {t("tripDetail.rating.count", { count })}
                            </span>
                        </>
                    ) : (
                        <span className="trip-recap-count">
                            {t("tripDetail.rating.noneYet")}
                        </span>
                    )}
                    {/* Edit action sits beside the score it affects, not
                        floating on the far side of the card. */}
                    {canRate && hasReviewed && (
                        <ButtonCustom
                            type={BUTTON_VARIANT.TEXT}
                            onClick={openModal}
                            className="trip-recap-edit"
                            ariaLabel={t("tripDetail.recap.editReview")}
                        >
                            <EditOutlinedIcon className="trip-recap-edit-icon" />
                            {t("tripDetail.recap.editReview")}
                        </ButtonCustom>
                    )}
                </span>
            </div>

            {canRate && !hasReviewed && !dismissed && (
                <div className="trip-recap-prompt">
                    <p className="trip-recap-prompt-text">
                        {t("tripDetail.recap.promptTitle")}
                    </p>
                    <div className="trip-recap-prompt-actions">
                        <ButtonCustom
                            type={BUTTON_VARIANT.TEXT}
                            label={t("tripDetail.recap.notNow")}
                            onClick={() => setDismissed(true)}
                            className="trip-recap-not-now"
                        />
                        <ButtonCustom
                            type={BUTTON_VARIANT.TEXT}
                            onClick={openModal}
                            className="trip-recap-review-link"
                            ariaLabel={t("tripDetail.recap.reviewTrip")}
                        >
                            {t("tripDetail.recap.reviewTrip")}
                            <span
                                className="trip-recap-review-arrow"
                                aria-hidden="true"
                            >
                                {" "}
                                →
                            </span>
                        </ButtonCustom>
                    </div>
                </div>
            )}

            {canRate && !hasReviewed && dismissed && (
                <ButtonCustom
                    type={BUTTON_VARIANT.TEXT}
                    label={t("tripDetail.recap.reviewTrip")}
                    onClick={openModal}
                    className="trip-recap-reopen"
                />
            )}

            {canRate && hasReviewed && (
                <div className="trip-recap-mine">
                    <span className="trip-recap-mine-label">
                        {t("tripDetail.rating.yourRating")}
                    </span>
                    <StarInput value={myRating} readonly size="md" />
                    {data?.myExpectations && (
                        <span className="trip-recap-mine-emoji">
                            {TRIP_EXPECT_EMOJI[data.myExpectations]}
                        </span>
                    )}
                </div>
            )}

            {companions.length > 0 && groupRows.length > 0 && (
                <div className="trip-recap-group">
                    <span className="trip-recap-group-title">
                        {t("tripDetail.recap.groupTitle")}
                    </span>
                    <ul className="trip-recap-group-list">
                        {groupRows.map((r) => (
                            <li className="trip-recap-group-row" key={r.id}>
                                <AvatarStack
                                    people={[
                                        {
                                            id: r.id,
                                            name: r.name,
                                            imageUrl: r.imageUrl,
                                        },
                                    ]}
                                    max={1}
                                    size="sm"
                                    showOverflow={false}
                                />
                                <span className="trip-recap-group-name">
                                    {r.name}
                                </span>
                                <span className="trip-recap-group-rating">
                                    {r.rating != null ? (
                                        <StarInput
                                            value={r.rating}
                                            readonly
                                            size="sm"
                                        />
                                    ) : (
                                        <span className="trip-recap-group-muted">
                                            {t("tripDetail.companions.notRatedYet")}
                                        </span>
                                    )}
                                    {r.favorite && (
                                        <span className="trip-recap-group-fav">
                                            <FavoriteRoundedIcon className="trip-recap-group-fav-icon" />
                                            {r.favorite}
                                        </span>
                                    )}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <ModalButton
                ref={modalRef}
                title={t("tripDetail.recap.modalTitle")}
                buttonProps={null}
            >
                <RecapForm
                    initialRating={myRating}
                    initialExpectations={data?.myExpectations ?? null}
                    initialSurprised={data?.mySurprised ?? ""}
                    initialAdvice={data?.myAdvice ?? ""}
                    saving={save.isPending}
                    error={save.isError ? t("tripDetail.rating.saveError") : null}
                    onSave={handleSave}
                    onCancel={() => modalRef.current?.closeModal()}
                />
            </ModalButton>
        </section>
    );
};

export default TripRecapCard;
