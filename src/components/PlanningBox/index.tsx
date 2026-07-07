import { useState } from "react";
import { useTranslation } from "react-i18next";
import classnames from "classnames";
import EditCalendarRoundedIcon from "@mui/icons-material/EditCalendarRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import TripStatusBadge from "components/TripStatusBadge";
import ReadinessChecklist from "components/ReadinessChecklist";
import ButtonIcon from "components/common/FormFields/ButtonIcon";
import ButtonCustom from "components/common/FormFields/ButtonCustom";
import { BUTTON_VARIANT } from "constants";
import { deriveTripReadiness, isTripPastDue, tripEndedDaysAgo } from "utils";
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
    /** Opens the focused Shift-dates modal. Preferred over `onEditTripDates`
     *  for the past-due "Shift dates" action; falls back to the stepper
     *  handoff when not supplied. */
    onShiftDates?: () => void;
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
    onShiftDates,
}: PlanningBoxProps) => {
    const { t } = useTranslation();
    // Expanded by default — the readiness checklist is the point. Collapsing
    // leaves just the header + Confirm button (which still shows "N% ready").
    const [collapsed, setCollapsed] = useState(false);

    // Past Due — a still-Planning trip whose end date has passed. Derived at
    // read time (never persisted): the header flips to a warning-toned "Trip
    // ended" so the box reads as needs-attention instead of "still planning".
    const pastDue = isTripPastDue(data);
    const endedDaysAgo = tripEndedDaysAgo(data);
    const HeadIcon = pastDue ? WarningAmberRoundedIcon : EditCalendarRoundedIcon;
    const boxTitle = pastDue
        ? t('tripDetail.pastDue.boxTitle')
        : t('tripDetail.planning.title');
    const boxSub = pastDue
        ? t('tripDetail.pastDue.boxSub', { count: endedDaysAgo })
        : t('tripDetail.planning.sub');

    // Non-organizers can't confirm or act on the checklist, so they get a
    // plain informational banner — no readiness, no collapse, no button.
    if (!isOrganizer) {
        return (
            <div
                className={classnames('planning-box is-readonly', {
                    'is-pastdue': pastDue,
                })}
            >
                <HeadIcon className="planning-box-icon" fontSize="medium" />
                <div className="planning-box-text">
                    <span className="planning-box-title">{boxTitle}</span>
                    <span className="planning-box-sub">
                        {pastDue
                            ? t('tripDetail.pastDue.readonlySub')
                            : t('tripDetail.planning.readonlySub')}
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
                pastDue && "is-pastdue",
            )}
        >
            <div className="planning-box-head">
                <HeadIcon className="planning-box-icon" fontSize="medium" />
                <div className="planning-box-text">
                    <span className="planning-box-title">{boxTitle}</span>
                    <span className="planning-box-sub">{boxSub}</span>
                </div>
                {/* In Past-Due the forward action isn't "Confirm" — it's the
                    Complete / Shift / Continue set below in the body. Keep the
                    header button only for a normal (future) Planning trip. */}
                {canPromoteStatus && !pastDue && (
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
                            ? t('tripDetail.planning.showChecklist')
                            : t('tripDetail.planning.hideChecklist')
                    }
                >
                    <ExpandMoreRoundedIcon />
                </button>
            </div>

            {!collapsed && (
                <div className="planning-box-body">
                    {/* Past-due action set — "What would you like to do?"
                        Complete (promotes to Confirmed → backend completes the
                        elapsed trip), Shift dates (hand off to the date editor),
                        or Continue planning (collapse the prompt, keep editing;
                        nothing is mutated). */}
                    {pastDue && (
                        <div className="planning-box-pastdue-actions">
                            {canPromoteStatus && (
                                <TripStatusBadge
                                    data={data}
                                    onStatusChange={onStatusChange}
                                    isSaving={isSaving}
                                    onEditTripDates={onEditTripDates}
                                    pastDue
                                    className="planning-box-confirm"
                                />
                            )}
                            {(onShiftDates || onEditTripDates) && (
                                <ButtonIcon
                                    type={BUTTON_VARIANT.TEXT}
                                    Icon={EditCalendarRoundedIcon}
                                    iconPosition="start"
                                    title={t('tripDetail.pastDue.shiftDates')}
                                    onClick={onShiftDates ?? onEditTripDates}
                                    className="planning-box-pastdue-shift"
                                />
                            )}
                            <ButtonCustom
                                type={BUTTON_VARIANT.TEXT}
                                capitalizeType="none"
                                label={t('tripDetail.pastDue.continuePlanning')}
                                onClick={() => setCollapsed(true)}
                                className="planning-box-pastdue-continue"
                            />
                        </div>
                    )}
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
