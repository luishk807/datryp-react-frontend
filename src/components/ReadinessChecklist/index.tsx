import classnames from "classnames";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import type { ReadinessCheck } from "utils";
import "./index.scss";

// Cap the per-day "free time" rows so a sparse 14-day trip doesn't turn the
// checklist into a wall of warnings — the rest collapse into a "+N more".
const FREE_DAYS_SHOWN = 3;

export interface ReadinessChecklistProps {
    checks: ReadinessCheck[];
    /** 1-based global day numbers with no real activity. */
    freeDays: number[];
    className?: string;
}

/** Presentational pass/fail checklist — the four headline checks plus one
 *  row per empty day. Shared by the planning box body and the
 *  "some activities aren't confirmed" confirm modal. */
const ReadinessChecklist = ({
    checks,
    freeDays,
    className,
}: ReadinessChecklistProps) => {
    const shownFreeDays = freeDays.slice(0, FREE_DAYS_SHOWN);
    const moreFreeDays = freeDays.length - shownFreeDays.length;

    return (
        <ul className={classnames("readiness-checklist", className)}>
            {checks.map((c) => (
                <li
                    key={c.key}
                    className={classnames(
                        "readiness-item",
                        c.ok ? "is-ok" : "is-warn",
                    )}
                >
                    {c.ok ? (
                        <CheckCircleRoundedIcon className="readiness-item-icon" />
                    ) : (
                        <WarningAmberRoundedIcon className="readiness-item-icon" />
                    )}
                    <span className="readiness-item-label">{c.label}</span>
                </li>
            ))}
            {shownFreeDays.map((d) => (
                <li key={`free-${d}`} className="readiness-item is-warn">
                    <WarningAmberRoundedIcon className="readiness-item-icon" />
                    <span className="readiness-item-label">
                        Day {d} has free time
                    </span>
                </li>
            ))}
            {moreFreeDays > 0 && (
                <li className="readiness-item is-warn">
                    <WarningAmberRoundedIcon className="readiness-item-icon" />
                    <span className="readiness-item-label">
                        +{moreFreeDays} more day
                        {moreFreeDays === 1 ? "" : "s"} with free time
                    </span>
                </li>
            )}
        </ul>
    );
};

export default ReadinessChecklist;
