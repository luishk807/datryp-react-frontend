import { useState } from "react";
import { Alert, CircularProgress } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import HealthAndSafetyRoundedIcon from "@mui/icons-material/HealthAndSafetyRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
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

type ToneKey = "great" | "good" | "warn" | "bad";

const scoreTone = (score: number): ToneKey => {
    if (score >= 85) return "great";
    if (score >= 70) return "good";
    if (score >= 50) return "warn";
    return "bad";
};

const dimensionTone = (verdict: string): ToneKey => {
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

const DimensionChip = ({
    label,
    data,
    isOpen,
    onToggle,
}: {
    label: string;
    data: TripCheckupDimension;
    isOpen: boolean;
    onToggle: () => void;
}) => {
    const t = dimensionTone(data.verdict);
    return (
        <div
            className={classnames(
                "trip-checkup-dim",
                `trip-checkup-tone-${t}`,
                isOpen && "is-open",
            )}
        >
            <button
                type="button"
                className="trip-checkup-dim-head"
                onClick={onToggle}
                aria-expanded={isOpen}
            >
                <div className="trip-checkup-dim-head-text">
                    <span className="trip-checkup-dim-label">{label}</span>
                    <span className="trip-checkup-dim-verdict">
                        {data.verdict}
                    </span>
                </div>
                <ExpandMoreRoundedIcon
                    className="trip-checkup-dim-chevron"
                    fontSize="small"
                />
            </button>
            <div className="trip-checkup-dim-bar">
                <span
                    className="trip-checkup-dim-bar-fill"
                    style={{
                        width: `${Math.max(2, Math.min(100, data.score))}%`,
                    }}
                />
            </div>
            {isOpen && <p className="trip-checkup-dim-why">{data.why}</p>}
        </div>
    );
};

const TripCheckupCard = ({
    tripId,
    isPro,
    isPlanning,
}: TripCheckupCardProps) => {
    const enabled = isPro && isPlanning;
    const query = useTripCheckup({ tripId, enabled });
    const [isHidden, setIsHidden] = useState(false);
    const [openDim, setOpenDim] = useState<"budget" | "time" | "activities" | null>(
        null,
    );

    if (!enabled || isHidden) return null;

    const handleRefresh = () => {
        capture("trip_checkup_refreshed", { trip_id: tripId });
        void query.refetch();
    };

    const handleClose = () => {
        capture("trip_checkup_dismissed", { trip_id: tripId });
        setIsHidden(true);
    };

    const toggleDim = (key: "budget" | "time" | "activities") => {
        setOpenDim((prev) => (prev === key ? null : key));
    };

    const renderError = () => {
        const err = query.error;
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
                        onClick={handleRefresh}
                    />
                }
            >
                {message}
            </Alert>
        );
    };

    const data = query.data ?? null;
    const overallTone: ToneKey | null = data ? scoreTone(data.score) : null;
    const score = data?.score ?? null;
    // Marker position along the 0-100 horizontal meter. Clamp inset so
    // the marker doesn't clip the rail's rounded end caps.
    const markerLeft =
        score == null ? null : Math.max(2, Math.min(98, score));

    return (
        <section
            className={classnames(
                "trip-checkup-box",
                overallTone && `trip-checkup-tone-${overallTone}`,
                !data && "is-pending",
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

            <header className="trip-checkup-head">
                <span className="trip-checkup-head-icon">
                    <HealthAndSafetyRoundedIcon />
                </span>
                <div className="trip-checkup-head-text">
                    <h3 className="trip-checkup-title">Trip review</h3>
                    {query.isLoading && (
                        <span className="trip-checkup-sub">
                            <CircularProgress size={12} /> Analyzing your
                            plan…
                        </span>
                    )}
                    {!query.isLoading && data && (
                        <span className="trip-checkup-sub">
                            <strong>{data.verdict}</strong>
                            {' · '}
                            {data.summary}
                        </span>
                    )}
                    {!query.isLoading && !data && query.isError && (
                        <span className="trip-checkup-sub">
                            Couldn&rsquo;t score the trip — try again.
                        </span>
                    )}
                </div>
                {data && (
                    <button
                        type="button"
                        className="trip-checkup-refresh"
                        onClick={handleRefresh}
                        disabled={query.isFetching}
                        aria-label="Re-check trip"
                        title="Re-check"
                    >
                        <RefreshRoundedIcon
                            fontSize="small"
                            className={query.isFetching ? "is-spinning" : ""}
                        />
                    </button>
                )}
            </header>

            {query.isError && !data && renderError()}

            {(query.isLoading || data) && (
                <div className="trip-checkup-meter-wrap">
                    <div className="trip-checkup-meter">
                        <div className="trip-checkup-meter-grad" />
                        {markerLeft !== null && (
                            <div
                                className="trip-checkup-meter-marker"
                                style={{ left: `${markerLeft}%` }}
                                aria-label={`Score ${score}`}
                            >
                                <span className="trip-checkup-meter-marker-pin" />
                                <span className="trip-checkup-meter-marker-num">
                                    {score}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="trip-checkup-meter-scale">
                        <span>0</span>
                        <span>50</span>
                        <span>100</span>
                    </div>
                </div>
            )}

            {data && (
                <>
                    <div className="trip-checkup-dims">
                        <DimensionChip
                            label="Budget"
                            data={data.budgetAssessment}
                            isOpen={openDim === "budget"}
                            onToggle={() => toggleDim("budget")}
                        />
                        <DimensionChip
                            label="Time"
                            data={data.timeAssessment}
                            isOpen={openDim === "time"}
                            onToggle={() => toggleDim("time")}
                        />
                        <DimensionChip
                            label="Activities"
                            data={data.activityAssessment}
                            isOpen={openDim === "activities"}
                            onToggle={() => toggleDim("activities")}
                        />
                    </div>

                    {(data.strengths.length > 0 || data.gaps.length > 0) && (
                        <div className="trip-checkup-lists">
                            {data.strengths.length > 0 && (
                                <div className="trip-checkup-list trip-checkup-list-strengths">
                                    <h4>
                                        <CheckCircleRoundedIcon fontSize="small" />
                                        What&rsquo;s working
                                    </h4>
                                    <ul>
                                        {data.strengths.map((s, i) => (
                                            <li key={i}>{s}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {data.gaps.length > 0 && (
                                <div className="trip-checkup-list trip-checkup-list-gaps">
                                    <h4>
                                        <ErrorOutlineRoundedIcon fontSize="small" />
                                        What to address
                                    </h4>
                                    <ul>
                                        {data.gaps.map((g, i) => (
                                            <li key={i}>{g}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </section>
    );
};

export default TripCheckupCard;
