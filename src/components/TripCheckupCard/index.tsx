import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, CircularProgress } from "@mui/material";
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
    verdictLabel,
    data,
    isOpen,
    onToggle,
}: {
    label: string;
    verdictLabel: string;
    data: TripCheckupDimension;
    isOpen: boolean;
    onToggle: () => void;
}) => {
    const tone = dimensionTone(data.verdict);
    return (
        <div
            className={classnames(
                "trip-checkup-dim",
                `trip-checkup-tone-${tone}`,
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
                        {verdictLabel}
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
    const { t } = useTranslation();
    // Backend returns one of a fixed set of verdict strings ("Strong" /
    // "On track" / "Needs work" / "Weak"). Map those known chrome values to
    // the i18n catalog; anything unexpected falls back to the raw verdict.
    const verdictLabel = (verdict: string): string => {
        const map: Record<string, string> = {
            Strong: "tripDetail.review.verdict.strong",
            "On track": "tripDetail.review.verdict.onTrack",
            "Needs work": "tripDetail.review.verdict.needsWork",
            Weak: "tripDetail.review.verdict.weak",
        };
        const key = map[verdict];
        if (!key) return verdict;
        const translated = t(key);
        return translated === key ? verdict : translated;
    };
    const enabled = isPro && isPlanning;
    const query = useTripCheckup({ tripId, enabled });
    // Collapsed by default on page load — the review is a glanceable
    // summary the user opens on demand, not something to greet them with
    // expanded every time the trip page loads.
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [openDim, setOpenDim] = useState<"budget" | "time" | "activities" | null>(
        null,
    );

    if (!enabled) return null;

    const handleRefresh = () => {
        capture("trip_checkup_refreshed", { trip_id: tripId });
        void query.refetch();
    };

    const handleToggleCollapse = () => {
        capture("trip_checkup_collapse_toggled", {
            trip_id: tripId,
            collapsed: !isCollapsed,
        });
        setIsCollapsed((prev) => !prev);
    };

    const toggleDim = (key: "budget" | "time" | "activities") => {
        setOpenDim((prev) => (prev === key ? null : key));
    };

    const renderError = () => {
        const err = query.error;
        let message = t("tripDetail.review.error.generic");
        if (err instanceof TripCheckupBackendError) {
            if (err.kind === "trip_checkup_not_planning") {
                message = t("tripDetail.review.error.notPlanning");
            } else if (err.kind === "trip_checkup_quota") {
                message = t("tripDetail.review.error.quota");
            } else if (err.status === 402) {
                message = t("tripDetail.review.error.pro");
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
                        label={t("tripDetail.review.retry")}
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
                isCollapsed && "is-collapsed",
            )}
            aria-label={t("tripDetail.review.ariaCard")}
        >
            <button
                type="button"
                className="trip-checkup-collapse"
                onClick={handleToggleCollapse}
                aria-expanded={!isCollapsed}
                aria-label={
                    isCollapsed
                        ? t("tripDetail.review.expand")
                        : t("tripDetail.review.collapse")
                }
                title={
                    isCollapsed
                        ? t("tripDetail.review.expandTitle")
                        : t("tripDetail.review.collapseTitle")
                }
            >
                <ExpandMoreRoundedIcon fontSize="small" />
            </button>

            <header className="trip-checkup-head">
                <span className="trip-checkup-head-icon">
                    <HealthAndSafetyRoundedIcon />
                </span>
                <div className="trip-checkup-head-text">
                    <h3 className="trip-checkup-title">
                        {t("tripDetail.review.title")}
                    </h3>
                    {!isCollapsed && query.isLoading && (
                        <span className="trip-checkup-sub">
                            <CircularProgress size={12} />{" "}
                            {t("tripDetail.review.analyzing")}
                        </span>
                    )}
                    {!query.isLoading && data && (
                        <span className="trip-checkup-sub">
                            <strong>{verdictLabel(data.verdict)}</strong>
                            {!isCollapsed && (
                                <>
                                    {' · '}
                                    {data.summary}
                                </>
                            )}
                        </span>
                    )}
                    {!isCollapsed && !query.isLoading && !data && query.isError && (
                        <span className="trip-checkup-sub">
                            {t("tripDetail.review.scoreFailed")}
                        </span>
                    )}
                </div>
                {!isCollapsed && data && (
                    <button
                        type="button"
                        className="trip-checkup-refresh"
                        onClick={handleRefresh}
                        disabled={query.isFetching}
                        aria-label={t("tripDetail.review.recheckAria")}
                        title={t("tripDetail.review.recheck")}
                    >
                        <RefreshRoundedIcon
                            fontSize="small"
                            className={query.isFetching ? "is-spinning" : ""}
                        />
                    </button>
                )}
            </header>

            {!isCollapsed && query.isError && !data && renderError()}

            {(query.isLoading || data) && (
                <div className="trip-checkup-meter-wrap">
                    <div
                        className={classnames("trip-checkup-meter", {
                            "is-loading": !data,
                        })}
                    >
                        <div className="trip-checkup-meter-grad" />
                        {!data && (
                            <span
                                className="trip-checkup-meter-shimmer"
                                aria-hidden="true"
                            />
                        )}
                        {markerLeft !== null && (
                            <div
                                className="trip-checkup-meter-marker"
                                style={{ left: `${markerLeft}%` }}
                                aria-label={t("tripDetail.review.scoreAria", {
                                    score,
                                })}
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

            {!isCollapsed &&
                data?.quota &&
                data.quota.remaining >= 0 &&
                data.quota.remaining <= 10 && (
                    <p className="trip-checkup-quota">
                        {data.quota.remaining === 0
                            ? t("tripDetail.review.quotaLast")
                            : t("tripDetail.review.quotaLeft", {
                                  count: data.quota.remaining,
                                  cap: data.quota.cap,
                              })}
                    </p>
                )}

            {!isCollapsed && data && (
                <>
                    <div className="trip-checkup-dims">
                        <DimensionChip
                            label={t("tripDetail.review.category.budget")}
                            verdictLabel={verdictLabel(
                                data.budgetAssessment.verdict,
                            )}
                            data={data.budgetAssessment}
                            isOpen={openDim === "budget"}
                            onToggle={() => toggleDim("budget")}
                        />
                        <DimensionChip
                            label={t("tripDetail.review.category.time")}
                            verdictLabel={verdictLabel(
                                data.timeAssessment.verdict,
                            )}
                            data={data.timeAssessment}
                            isOpen={openDim === "time"}
                            onToggle={() => toggleDim("time")}
                        />
                        <DimensionChip
                            label={t("tripDetail.review.category.activities")}
                            verdictLabel={verdictLabel(
                                data.activityAssessment.verdict,
                            )}
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
                                        {t("tripDetail.review.whatsWorking")}
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
                                        {t("tripDetail.review.whatToAddress")}
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
