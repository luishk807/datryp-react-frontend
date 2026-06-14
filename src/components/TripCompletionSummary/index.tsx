import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import LocalActivityRoundedIcon from "@mui/icons-material/LocalActivityRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import type { SvgIconComponent } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { convertMoney, deriveTripStats } from "utils";
import type { TripState } from "types";
import "./index.scss";

export interface TripCompletionSummaryProps {
    data: TripState;
    /** Deduped traveler count (friends + organizer). Passed in so the dedup
     *  stays owned by the parent's single `participants` list rather than
     *  re-derived here with a second, drift-prone copy. */
    travelers: number;
}

const TripCompletionSummary = ({
    data,
    travelers,
}: TripCompletionSummaryProps) => {
    const { t } = useTranslation();
    const { days, activities, spent, countries } = deriveTripStats(data);

    const stats: {
        key: string;
        Icon: SvgIconComponent;
        value: string | number;
        label: string;
    }[] = [
        {
            key: "days",
            Icon: CalendarMonthRoundedIcon,
            value: days,
            label: t("tripDetail.completion.days", { count: days }),
        },
        {
            key: "activities",
            Icon: LocalActivityRoundedIcon,
            value: activities,
            label: t("tripDetail.completion.activities", { count: activities }),
        },
        {
            key: "countries",
            Icon: PublicRoundedIcon,
            value: countries,
            label: t("tripDetail.completion.countries", { count: countries }),
        },
        {
            key: "travelers",
            Icon: GroupRoundedIcon,
            value: travelers,
            label: t("tripDetail.completion.travelers", { count: travelers }),
        },
        {
            key: "spent",
            Icon: PaymentsRoundedIcon,
            value: convertMoney(spent),
            label: t("tripDetail.completion.spent"),
        },
    ];

    return (
        <section
            className="trip-completion-summary"
            aria-label={t("tripDetail.completion.aria")}
        >
            <header className="trip-completion-summary-head">
                <h3 className="trip-completion-summary-title">
                    {t("tripDetail.completion.title")}
                </h3>
                <span className="trip-completion-summary-sub">
                    {t("tripDetail.completion.sub")}
                </span>
            </header>
            <div className="trip-completion-summary-grid">
                {stats.map(({ key, Icon, value, label }) => (
                    <div className="trip-completion-stat" key={key}>
                        <Icon
                            className="trip-completion-stat-icon"
                            fontSize="small"
                        />
                        <span className="trip-completion-stat-value">
                            {value}
                        </span>
                        <span className="trip-completion-stat-label">
                            {label}
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default TripCompletionSummary;
