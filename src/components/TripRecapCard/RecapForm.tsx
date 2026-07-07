import { useState } from "react";
import { useTranslation } from "react-i18next";
import classNames from "classnames";
import StarInput from "components/common/FormFields/StarInput";
import ButtonCustom from "components/common/FormFields/ButtonCustom";
import ErrorAlert from "components/common/ErrorAlert";
import {
    BUTTON_VARIANT,
    EXPECTATION_EMOJI,
    TRIP_EXPECTATION,
} from "constants";
import type { TripRecapInput } from "api/tripRatingApi";

export interface RecapFormProps {
    initialRating: number;
    initialExpectations: string | null;
    initialSurprised: string;
    initialAdvice: string;
    saving: boolean;
    error?: string | null;
    onSave: (recap: TripRecapInput) => void;
    onCancel: () => void;
}

const EXPECTATIONS: { value: string; emoji: string; labelKey: string }[] = [
    { value: TRIP_EXPECTATION.BETTER, emoji: EXPECTATION_EMOJI.positive, labelKey: "tripDetail.recap.expect.better" },
    { value: TRIP_EXPECTATION.ABOUT, emoji: EXPECTATION_EMOJI.neutral, labelKey: "tripDetail.recap.expect.about" },
    { value: TRIP_EXPECTATION.WORSE, emoji: EXPECTATION_EMOJI.negative, labelKey: "tripDetail.recap.expect.worse" },
];

const TEXT_MAX = 2000;

/**
 * The "Review trip" modal body — a whole-trip recap (transport, itinerary,
 * pacing, country, overall), NOT individual places. Only the star rating is
 * required; the expectations pick + the two prompts are optional.
 */
const RecapForm = ({
    initialRating,
    initialExpectations,
    initialSurprised,
    initialAdvice,
    saving,
    error,
    onSave,
    onCancel,
}: RecapFormProps) => {
    const { t } = useTranslation();
    const [rating, setRating] = useState(initialRating);
    const [expectations, setExpectations] = useState<string | null>(
        initialExpectations
    );
    const [surprised, setSurprised] = useState(initialSurprised);
    const [advice, setAdvice] = useState(initialAdvice);
    const [localError, setLocalError] = useState<string | null>(null);

    const submit = () => {
        if (rating < 1) {
            setLocalError(t("tripDetail.recap.needStars"));
            return;
        }
        setLocalError(null);
        onSave({
            rating,
            expectations,
            surprised: surprised.trim() || null,
            advice: advice.trim() || null,
        });
    };

    return (
        <div className="trip-recap-form">
            <label className="trip-recap-field">
                <span className="trip-recap-field-label">
                    {t("tripDetail.recap.starsLabel")}
                </span>
                <StarInput value={rating} onChange={setRating} size="lg" />
            </label>

            <div className="trip-recap-field">
                <span className="trip-recap-field-label">
                    {t("tripDetail.recap.expectLabel")}
                </span>
                <div className="trip-recap-expect">
                    {EXPECTATIONS.map((e) => (
                        <button
                            key={e.value}
                            type="button"
                            className={classNames("trip-recap-expect-btn", {
                                active: expectations === e.value,
                            })}
                            onClick={() =>
                                setExpectations(
                                    expectations === e.value ? null : e.value
                                )
                            }
                        >
                            <span className="trip-recap-expect-emoji">
                                {e.emoji}
                            </span>
                            {t(e.labelKey)}
                        </button>
                    ))}
                </div>
            </div>

            <label className="trip-recap-field">
                <span className="trip-recap-field-label">
                    {t("tripDetail.recap.surprisedLabel")}
                </span>
                <textarea
                    className="trip-recap-textarea"
                    value={surprised}
                    maxLength={TEXT_MAX}
                    rows={2}
                    placeholder={t("tripDetail.recap.surprisedPlaceholder")}
                    onChange={(e) => setSurprised(e.target.value)}
                />
            </label>

            <label className="trip-recap-field">
                <span className="trip-recap-field-label">
                    {t("tripDetail.recap.adviceLabel")}
                </span>
                <textarea
                    className="trip-recap-textarea"
                    value={advice}
                    maxLength={TEXT_MAX}
                    rows={2}
                    placeholder={t("tripDetail.recap.advicePlaceholder")}
                    onChange={(e) => setAdvice(e.target.value)}
                />
            </label>

            {(localError || error) && (
                <ErrorAlert className="trip-recap-error">
                    {localError || error}
                </ErrorAlert>
            )}

            <div className="trip-recap-actions">
                <ButtonCustom
                    type={BUTTON_VARIANT.LINE}
                    label={t("common.cancel")}
                    onClick={onCancel}
                    disabled={saving}
                />
                <ButtonCustom
                    type={BUTTON_VARIANT.STANDARD}
                    label={
                        saving
                            ? t("common.saving")
                            : t("tripDetail.recap.save")
                    }
                    onClick={submit}
                    disabled={saving}
                />
            </div>
        </div>
    );
};

export default RecapForm;
