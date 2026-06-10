import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import LocalActivityRoundedIcon from "@mui/icons-material/LocalActivityRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import type { SvgIconComponent } from "@mui/icons-material";
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
            label: days === 1 ? "Day" : "Days",
        },
        {
            key: "activities",
            Icon: LocalActivityRoundedIcon,
            value: activities,
            label: activities === 1 ? "Activity" : "Activities",
        },
        {
            key: "countries",
            Icon: PublicRoundedIcon,
            value: countries,
            label: countries === 1 ? "Country" : "Countries",
        },
        {
            key: "travelers",
            Icon: GroupRoundedIcon,
            value: travelers,
            label: travelers === 1 ? "Traveler" : "Travelers",
        },
        {
            key: "spent",
            Icon: PaymentsRoundedIcon,
            value: convertMoney(spent),
            label: "Spent",
        },
    ];

    return (
        <section className="trip-completion-summary" aria-label="Trip recap">
            <header className="trip-completion-summary-head">
                <h3 className="trip-completion-summary-title">Trip recap</h3>
                <span className="trip-completion-summary-sub">
                    A snapshot of where you went and what you did.
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
