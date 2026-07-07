import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
 * Whole-trip recap on a Completed trip. The stars themselves are the action:
 * an un-reviewed traveler taps the empty stars ("Click to rate") to open the
 * recap modal (pre-filled with that rating; then expectations + surprised +
 * advice); once reviewed they see their own rating + a quiet "Edit recap"
 * link. Below, the group's ratings ("Reviews from your group") surface each
 * traveler's own verdict — everyone reviews, the recap is shared but personal.
 */
const TripRecapCard = ({ tripId, canRate }: TripRecapCardProps) => {
    const { t } = useTranslation();
    const { user } = useUser();
    const { data } = useTripRating(tripId);
    const { data: companionsData } = useTripCompanions(tripId);
    const save = useSaveTripRating();
    const modalRef = useRef<ModalButtonHandle>(null);
    // The recap modal opens pre-filled with `draftRating`; `modalNonce`
    // remounts RecapForm on each open so that pre-fill actually takes (its
    // internal state only seeds on mount).
    const [draftRating, setDraftRating] = useState(0);
    const [modalNonce, setModalNonce] = useState(0);

    const myRating = data?.myRating ?? 0;
    const average = data?.average ?? null;
    const count = data?.count ?? 0;
    const hasReviewed = myRating > 0;
    const companions = companionsData ?? [];

    const openRecap = (initialRating: number) => {
        setDraftRating(initialRating);
        setModalNonce((n) => n + 1);
        modalRef.current?.openModel();
    };

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
                {count > 0 && (
                    <span className="trip-recap-avg">
                        <Stars rating={average ?? 0} />
                        <span className="trip-recap-count">
                            {t("tripDetail.rating.count", { count })}
                        </span>
                    </span>
                )}
            </div>

            {/* The stars ARE the action: unreviewed → empty stars + "Click to
                rate" open the recap modal (pre-filled with the star tapped);
                reviewed → your rating + a quiet "Edit recap" link. No separate
                CTA button competing with the itinerary. */}
            {canRate &&
                (hasReviewed ? (
                    <div className="trip-recap-mine">
                        <StarInput value={myRating} readonly size="md" />
                        <span className="trip-recap-mine-label">
                            {t("tripDetail.rating.yourRating")}
                        </span>
                        {data?.myExpectations && (
                            <span className="trip-recap-mine-emoji">
                                {TRIP_EXPECT_EMOJI[data.myExpectations]}
                            </span>
                        )}
                        <ButtonCustom
                            type={BUTTON_VARIANT.TEXT}
                            onClick={() => openRecap(myRating)}
                            className="trip-recap-edit"
                            ariaLabel={t("tripDetail.recap.edit")}
                        >
                            {t("tripDetail.recap.edit")}
                            <span
                                className="trip-recap-edit-arrow"
                                aria-hidden="true"
                            >
                                {" "}
                                →
                            </span>
                        </ButtonCustom>
                    </div>
                ) : (
                    <div className="trip-recap-rate">
                        <StarInput
                            value={0}
                            onChange={(n) => openRecap(n)}
                            size="lg"
                        />
                        <span className="trip-recap-rate-hint">
                            {t("tripDetail.recap.clickToRate")}
                        </span>
                    </div>
                ))}

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
                    key={modalNonce}
                    initialRating={draftRating}
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
