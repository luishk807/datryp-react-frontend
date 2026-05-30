import { useState } from "react";
import { Alert, CircularProgress } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import HealthAndSafetyOutlinedIcon from "@mui/icons-material/HealthAndSafetyOutlined";
import HealthAndSafetyRoundedIcon from "@mui/icons-material/HealthAndSafetyRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import classnames from "classnames";
import ButtonCustom from "components/common/FormFields/ButtonCustom";
import { useTripCheckup } from "api/hooks/useTripCheckup";
import { TripCheckupBackendError } from "api/tripCheckupApi";
import type { TripCheckupDimension } from "api/tripCheckupApi";
import { capture } from "lib/posthog";
import "./index.scss";

interface TripCheckupCardProps {
    tripId: string;
    /** Hide the entire card when the viewer isn't on a Pro tier. Server
     *  still gates with 402; client-side hide avoids a button users
     *  can't actually use. */
    isPro: boolean;
    /** Trip Checkup is Planning-only; server enforces with 409 but the
     *  card hides client-side too. */
    isPlanning: boolean;
}

const tone = (score: number): "great" | "good" | "warn" | "bad" => {
    if (score >= 85) return "great";
    if (score >= 70) return "good";
    if (score >= 50) return "warn";
    return "bad";
};

const dimensionTone = (
    verdict: string,
): "great" | "good" | "warn" | "bad" => {
    switch (verdict) {
        case "Strong":
            return "great";
        case "On track":
            return "good";
        case "Needs work":
            return "warn";
        case "Weak":
            return "bad";
        default:
            return "good";
    }
};

const DimensionMeter = ({
    label,
    data,
}: {
    label: string;
    data: TripCheckupDimension;
}) => {
    const t = dimensionTone(data.verdict);
    return (
        <div className={classnames("trip-checkup-dim", `trip-checkup-tone-${t}`)}>
            <div className="trip-checkup-dim-head">
                <span className="trip-checkup-dim-label">{label}</span>
                <span className="trip-checkup-dim-verdict">{data.verdict}</span>
            </div>
            <div className="trip-checkup-dim-bar">
                <span
                    className="trip-checkup-dim-bar-fill"
                    style={{ width: `${Math.max(2, Math.min(100, data.score))}%` }}
                />
            </div>
            <p className="trip-checkup-dim-why">{data.why}</p>
        </div>
    );
};

const TripCheckupCard = ({
    tripId,
    isPro,
    isPlanning,
}: TripCheckupCardProps) => {
    const mutation = useTripCheckup();
    const [isHidden, setIsHidden] = useState(false);

    if (!isPro || !isPlanning) return null;

    const hasResults = !!mutation.data && !mutation.isPending;
    const hasPanelContent =
        mutation.isPending || mutation.isError || hasResults;
    const showPanel = hasPanelContent && !isHidden;

    const handleGenerate = () => {
        capture("trip_checkup_clicked", { trip_id: tripId });
        setIsHidden(false);
        mutation.mutate({ tripId });
    };

    const handleClose = () => {
        capture("trip_checkup_dismissed", { trip_id: tripId });
        setIsHidden(true);
    };

    const renderError = () => {
        const err = mutation.error;
        let message = "Couldn't run the checkup. Try again in a moment.";
        if (err instanceof TripCheckupBackendError) {
            if (err.kind === "trip_checkup_not_planning") {
                message =
                    "Trip checkup is only available while the trip is in Planning.";
            } else if (err.status === 402) {
                message =
                    "Trip Checkup is a Pro feature. Upgrade to score your trip.";
            } else if (err.message) {
                message = err.message;
            }
        } else if (err?.message) {
            message = err.message;
        }
        return (
            <Alert
                severity="error"
                variant="outlined"
                className="trip-checkup-error"
                action={
                    <ButtonCustom
                        type="text"
                        label="Retry"
                        onClick={handleGenerate}
                    />
                }
            >
                {message}
            </Alert>
        );
    };

    const triggerLabel = mutation.isPending
        ? "Scoring trip…"
        : hasResults
          ? "Re-check"
          : "Check my trip";

    const overallTone = hasResults ? tone(mutation.data!.score) : null;

    return (
        <>
            <div className="trip-checkup-trigger-row">
                <button
                    type="button"
                    className="trip-checkup-trigger"
                    onClick={handleGenerate}
                    disabled={mutation.isPending}
                    aria-label={triggerLabel}
                >
                    <HealthAndSafetyRoundedIcon
                        className="trip-checkup-trigger-icon"
                        fontSize="small"
                    />
                    <span>{triggerLabel}</span>
                </button>
            </div>

            {showPanel && (
                <section
                    className={classnames(
                        "trip-checkup-card",
                        overallTone && `trip-checkup-tone-${overallTone}`,
                    )}
                    aria-label="Trip readiness checkup"
                >
                    <button
                        type="button"
                        className="trip-checkup-close"
                        onClick={handleClose}
                        aria-label="Hide trip checkup"
                    >
                        <CloseRoundedIcon fontSize="small" />
                    </button>

                    {mutation.isPending && (
                        <div className="trip-checkup-loading">
                            <CircularProgress size={20} />
                            <span>
                                Reviewing your plan — budget, time,
                                activities…
                            </span>
                        </div>
                    )}

                    {mutation.isError && renderError()}

                    {hasResults && (
                        <>
                            <header className="trip-checkup-head">
                                <div
                                    className="trip-checkup-score"
                                    aria-label={`Trip readiness ${mutation.data!.score} out of 100`}
                                >
                                    <span className="trip-checkup-score-num">
                                        {mutation.data!.score}
                                    </span>
                                    <span className="trip-checkup-score-out">
                                        / 100
                                    </span>
                                </div>
                                <div className="trip-checkup-headline">
                                    <span className="trip-checkup-verdict">
                                        <HealthAndSafetyOutlinedIcon
                                            className="trip-checkup-verdict-icon"
                                            fontSize="small"
                                        />
                                        {mutation.data!.verdict}
                                    </span>
                                    <p className="trip-checkup-summary">
                                        {mutation.data!.summary}
                                    </p>
                                </div>
                            </header>

                            <div className="trip-checkup-dims">
                                <DimensionMeter
                                    label="Budget"
                                    data={mutation.data!.budgetAssessment}
                                />
                                <DimensionMeter
                                    label="Time"
                                    data={mutation.data!.timeAssessment}
                                />
                                <DimensionMeter
                                    label="Activities"
                                    data={mutation.data!.activityAssessment}
                                />
                            </div>

                            {(mutation.data!.strengths.length > 0 ||
                                mutation.data!.gaps.length > 0) && (
                                <div className="trip-checkup-lists">
                                    {mutation.data!.strengths.length > 0 && (
                                        <div className="trip-checkup-list trip-checkup-list-strengths">
                                            <h4>
                                                <CheckCircleRoundedIcon fontSize="small" />
                                                What&rsquo;s working
                                            </h4>
                                            <ul>
                                                {mutation.data!.strengths.map(
                                                    (s, i) => (
                                                        <li key={i}>{s}</li>
                                                    ),
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                    {mutation.data!.gaps.length > 0 && (
                                        <div className="trip-checkup-list trip-checkup-list-gaps">
                                            <h4>
                                                <ErrorOutlineRoundedIcon fontSize="small" />
                                                What to address
                                            </h4>
                                            <ul>
                                                {mutation.data!.gaps.map(
                                                    (g, i) => (
                                                        <li key={i}>{g}</li>
                                                    ),
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </section>
            )}
        </>
    );
};

export default TripCheckupCard;
