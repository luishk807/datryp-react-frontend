import classnames from "classnames";
import { useTranslation } from "react-i18next";
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
    const { t } = useTranslation();
    const shownFreeDays = freeDays.slice(0, FREE_DAYS_SHOWN);
    const moreFreeDays = freeDays.length - shownFreeDays.length;

    // The source labels are produced deterministically in utils/tripReadiness
    // (one of two strings per check key, gated by `ok`). Re-map them here to
    // the i18n catalog so the chrome label localizes; unknown keys fall back
    // to the raw label rather than rendering an empty string.
    const labelFor = (c: ReadinessCheck): string => {
        const key = `tripDetail.readiness.${c.key}.${c.ok ? "ok" : "no"}`;
        const translated = t(key);
        return translated === key ? c.label : translated;
    };

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
                    <span className="readiness-item-label">{labelFor(c)}</span>
                </li>
            ))}
            {shownFreeDays.map((d) => (
                <li key={`free-${d}`} className="readiness-item is-warn">
                    <WarningAmberRoundedIcon className="readiness-item-icon" />
                    <span className="readiness-item-label">
                        {t("tripDetail.readiness.freeDay", { day: d })}
                    </span>
                </li>
            ))}
            {moreFreeDays > 0 && (
                <li className="readiness-item is-warn">
                    <WarningAmberRoundedIcon className="readiness-item-icon" />
                    <span className="readiness-item-label">
                        {t("tripDetail.readiness.moreFreeDays", {
                            count: moreFreeDays,
                        })}
                    </span>
                </li>
            )}
        </ul>
    );
};

export default ReadinessChecklist;
