import { useState } from "react";
import classnames from "classnames";
import EditCalendarRoundedIcon from "@mui/icons-material/EditCalendarRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import TripStatusBadge from "components/TripStatusBadge";
import ReadinessChecklist from "components/ReadinessChecklist";
import { deriveTripReadiness } from "utils";
import type { TripState, TripStatus } from "types";
import "./index.scss";

export interface PlanningBoxProps {
    data: TripState;
    /** Organizers get the readiness checklist + confirm button; everyone
     *  else just sees the "still being planned" note. */
    isOrganizer: boolean;
    /** Whether the Confirm trip button should render (status lookup resolved
     *  + organizer). */
    canPromoteStatus: boolean;
    onStatusChange: (
        status: TripStatus,
        opts?: { confirmAllActivities?: boolean },
    ) => void | Promise<void>;
    isSaving?: boolean;
    onEditTripDates?: () => void;
}

const toneFor = (percent: number): "low" | "mid" | "high" => {
    if (percent >= 85) return "high";
    if (percent >= 50) return "mid";
    return "low";
};

const PlanningBox = ({
    data,
    isOrganizer,
    canPromoteStatus,
    onStatusChange,
    isSaving = false,
    onEditTripDates,
}: PlanningBoxProps) => {
    // Expanded by default — the readiness checklist is the point. Collapsing
    // leaves just the header + Confirm button (which still shows "N% ready").
    const [collapsed, setCollapsed] = useState(false);

    // Non-organizers can't confirm or act on the checklist, so they get a
    // plain informational banner — no readiness, no collapse, no button.
    if (!isOrganizer) {
        return (
            <div className="planning-box is-readonly">
                <EditCalendarRoundedIcon
                    className="planning-box-icon"
                    fontSize="medium"
                />
                <div className="planning-box-text">
                    <span className="planning-box-title">Trip in planning</span>
                    <span className="planning-box-sub">
                        The organizer is still arranging activities. Check back
                        soon.
                    </span>
                </div>
            </div>
        );
    }

    const readiness = deriveTripReadiness(data);
    const tone = toneFor(readiness.percent);

    return (
        <section
            className={classnames(
                "planning-box",
                `planning-box-tone-${tone}`,
                collapsed && "is-collapsed",
            )}
        >
            <div className="planning-box-head">
                <EditCalendarRoundedIcon
                    className="planning-box-icon"
                    fontSize="medium"
                />
                <div className="planning-box-text">
                    <span className="planning-box-title">Trip in planning</span>
                    <span className="planning-box-sub">
                        Your itinerary is fully editable — add, edit, or remove
                        activities and changes save as you go.
                    </span>
                </div>
                {canPromoteStatus && (
                    <TripStatusBadge
                        data={data}
                        onStatusChange={onStatusChange}
                        isSaving={isSaving}
                        onEditTripDates={onEditTripDates}
                        readiness={readiness}
                        className="planning-box-confirm"
                    />
                )}
                <button
                    type="button"
                    className="planning-box-toggle"
                    onClick={() => setCollapsed((prev) => !prev)}
                    aria-expanded={!collapsed}
                    aria-label={
                        collapsed
                            ? "Show readiness checklist"
                            : "Hide readiness checklist"
                    }
                >
                    <ExpandMoreRoundedIcon />
                </button>
            </div>

            {!collapsed && (
                <div className="planning-box-body">
                    <div className="planning-box-meter">
                        <span
                            className="planning-box-meter-fill"
                            style={{
                                width: `${Math.max(2, readiness.percent)}%`,
                            }}
                        />
                    </div>
                    <ReadinessChecklist
                        checks={readiness.checks}
                        freeDays={readiness.freeDays}
                    />
                </div>
            )}
        </section>
    );
};

export default PlanningBox;
