import { useState } from "react";
import { useTranslation } from "react-i18next";
import classNames from "classnames";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import StarInput from "components/common/FormFields/StarInput";
import ButtonCustom from "components/common/FormFields/ButtonCustom";
import ErrorAlert from "components/common/ErrorAlert";
import { useUser } from "context/UserContext";
import { useMyPlaceReview, useUpsertReview } from "api/hooks/useReviews";
import { getPlaceKey } from "utils/placeKey";
import { placeCategoryFor } from "utils/placeCategory";
import {
    ACTIVITY_EXPECTATION,
    BUTTON_VARIANT,
    EXPECTATION_EMOJI,
    REVIEW_CHIP_EMOJI,
    REVIEW_CHIPS,
    REVIEW_MAX_TAGS,
    REVIEW_VISIBILITY,
} from "constants";
import "./index.scss";

export interface ActivityInlineReviewProps {
    placeName: string;
    placeCity: string;
    placeCountry: string;
    /** Backend slug when present — keeps the key identical to the place page. */
    placeKey?: string | null;
    /** Source trip; passing it marks the review a verified visit. */
    itineraryId?: string | null;
    /** Source activity on the trip. */
    activityId?: string | null;
}

const EXPECTATIONS: { value: string; emoji: string; labelKey: string }[] = [
    { value: ACTIVITY_EXPECTATION.BETTER, emoji: EXPECTATION_EMOJI.positive, labelKey: "review.expect.better" },
    { value: ACTIVITY_EXPECTATION.AS_EXPECTED, emoji: EXPECTATION_EMOJI.neutral, labelKey: "review.expect.asExpected" },
    { value: ACTIVITY_EXPECTATION.OVERHYPED, emoji: EXPECTATION_EMOJI.negative, labelKey: "review.expect.overhyped" },
];

const VISIBILITIES: { value: string; labelKey: string }[] = [
    { value: REVIEW_VISIBILITY.ANONYMOUS, labelKey: "review.inline.visAnon" },
    { value: REVIEW_VISIBILITY.PUBLIC, labelKey: "review.inline.visPublic" },
    { value: REVIEW_VISIBILITY.PRIVATE, labelKey: "review.inline.visPrivate" },
];

const TIP_MAX = 280;

/**
 * The traveler's own review of one activity — progressive so a long itinerary
 * stays scannable. Collapsed, it's a single row: the saved stars + a
 * "Reviewed ✓ / Not reviewed yet" status + a Review/Edit button. Clicking it
 * expands an inline panel (stars → expectations → up-to-3 chips → tip →
 * visibility → Save); saving collapses it again. Stored as the one
 * public/anonymous/private review the traveler has for this place, so it also
 * feeds the place's "Verified traveler insights".
 */
const ActivityInlineReview = ({
    placeName,
    placeCity,
    placeCountry,
    placeKey,
    itineraryId,
    activityId,
}: ActivityInlineReviewProps) => {
    const { t } = useTranslation();
    const { user } = useUser();
    const key = placeKey || getPlaceKey(placeName, placeCity, placeCountry);
    const category = placeCategoryFor(placeName);
    const chipSlugs = REVIEW_CHIPS[category] ?? REVIEW_CHIPS.universal;

    const { data: myReview } = useMyPlaceReview(key, Boolean(user));
    const upsert = useUpsertReview();

    const [editing, setEditing] = useState(false);
    const [visOpen, setVisOpen] = useState(false);
    const [rating, setRating] = useState(0);
    const [expectation, setExpectation] = useState<string | null>(null);
    const [tags, setTags] = useState<string[]>([]);
    const [tip, setTip] = useState("");
    const [visibility, setVisibility] = useState<string>(
        REVIEW_VISIBILITY.ANONYMOUS
    );

    if (!user) return null;

    const savedRating = myReview?.rating ?? 0;
    const reviewed = savedRating > 0;

    const openEditor = () => {
        // Seed the draft from the saved review (or empty) each time we open.
        setRating(myReview?.rating ?? 0);
        setExpectation(myReview?.expectations ?? null);
        setTags(myReview?.tags ?? []);
        setTip(myReview?.text ?? "");
        setVisibility(myReview?.visibility || REVIEW_VISIBILITY.ANONYMOUS);
        setVisOpen(false);
        setEditing(true);
    };

    const toggleChip = (slug: string) => {
        if (tags.includes(slug)) {
            setTags(tags.filter((s) => s !== slug));
        } else if (tags.length < REVIEW_MAX_TAGS) {
            setTags([...tags, slug]);
        }
    };

    const save = () => {
        if (rating < 1) return;
        upsert.mutate(
            {
                placeKey: key,
                payload: {
                    placeName,
                    placeCity,
                    placeCountry,
                    rating,
                    text: tip.trim() || null,
                    tags,
                    expectations: expectation,
                    visibility,
                    itineraryId,
                    activityId,
                },
            },
            { onSuccess: () => setEditing(false) }
        );
    };

    // ── Collapsed: one compact row ────────────────────────────────────────
    if (!editing) {
        return (
            <div className="activity-inline-review air-collapsed">
                {reviewed ? (
                    <button
                        type="button"
                        className="air-affordance air-reviewed"
                        onClick={openEditor}
                        aria-label={t("review.inline.edit")}
                    >
                        <StarInput value={savedRating} readonly size="sm" />
                        <CheckRoundedIcon className="air-reviewed-check" />
                    </button>
                ) : (
                    <button
                        type="button"
                        className="air-affordance air-cta"
                        onClick={openEditor}
                    >
                        <StarRoundedIcon className="air-cta-star" />
                        {t("review.inline.review")}
                        <span className="air-cta-arrow" aria-hidden="true">
                            {" "}
                            →
                        </span>
                    </button>
                )}
            </div>
        );
    }

    // ── Expanded: the review panel ────────────────────────────────────────
    const visLabel =
        VISIBILITIES.find((v) => v.value === visibility)?.labelKey ??
        "review.inline.visAnon";

    return (
        <div className="activity-inline-review air-expanded">
            <StarInput value={rating} onChange={setRating} size="lg" />

            <div className="air-field">
                <span className="air-field-label">
                    {t("review.inline.expectLabel")}
                </span>
                <div className="air-pills">
                    {EXPECTATIONS.map((e) => (
                        <button
                            key={e.value}
                            type="button"
                            className={classNames("air-pill", {
                                active: expectation === e.value,
                            })}
                            onClick={() =>
                                setExpectation(
                                    expectation === e.value ? null : e.value
                                )
                            }
                        >
                            <span className="air-pill-emoji">{e.emoji}</span>
                            {t(e.labelKey)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="air-field">
                <span className="air-field-label">
                    {t("review.inline.tagsLabel")}
                    <span className="air-field-hint">
                        {t("review.inline.tagsHint", { max: REVIEW_MAX_TAGS })}
                    </span>
                </span>
                <div className="air-pills">
                    {chipSlugs.map((slug) => {
                        const on = tags.includes(slug);
                        const atMax = !on && tags.length >= REVIEW_MAX_TAGS;
                        return (
                            <button
                                key={slug}
                                type="button"
                                className={classNames("air-pill air-chip", {
                                    active: on,
                                    "at-max": atMax,
                                })}
                                aria-pressed={on}
                                disabled={atMax}
                                onClick={() => toggleChip(slug)}
                            >
                                <span className="air-pill-emoji">
                                    {REVIEW_CHIP_EMOJI[slug]}
                                </span>
                                {t(`review.chips.${slug}`)}
                            </button>
                        );
                    })}
                </div>
            </div>

            <textarea
                className="air-tip"
                aria-label={t("review.inline.tipPlaceholder")}
                value={tip}
                maxLength={TIP_MAX}
                placeholder={t("review.inline.tipPlaceholder")}
                onChange={(e) => setTip(e.target.value)}
            />

            <div className="air-visibility">
                <button
                    type="button"
                    className="air-visibility-toggle"
                    aria-expanded={visOpen}
                    onClick={() => setVisOpen((o) => !o)}
                >
                    {t("review.inline.visibilityShort")}: {t(visLabel)}
                    <span className="air-visibility-caret">{visOpen ? "▲" : "▼"}</span>
                </button>
                {visOpen && (
                    <div className="air-visibility-opts">
                        {VISIBILITIES.map((v) => (
                            <button
                                key={v.value}
                                type="button"
                                className={classNames("air-vis-opt", {
                                    active: visibility === v.value,
                                })}
                                onClick={() => setVisibility(v.value)}
                            >
                                {t(v.labelKey)}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {upsert.isError && (
                <ErrorAlert className="air-error">
                    {t("review.inline.saveError")}
                </ErrorAlert>
            )}

            <div className="air-actions">
                <ButtonCustom
                    type={BUTTON_VARIANT.LINE}
                    label={t("common.cancel")}
                    onClick={() => setEditing(false)}
                    disabled={upsert.isPending}
                />
                <ButtonCustom
                    type={BUTTON_VARIANT.STANDARD}
                    label={
                        upsert.isPending
                            ? t("review.inline.saving")
                            : t("review.inline.save")
                    }
                    onClick={save}
                    disabled={upsert.isPending || rating < 1}
                />
            </div>
        </div>
    );
};

export default ActivityInlineReview;
