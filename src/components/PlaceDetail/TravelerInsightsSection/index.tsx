import { useTranslation } from "react-i18next";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import DetailSection from "components/PlaceDetail/DetailSection";
import { usePlaceReviewInsights } from "api/hooks/useReviews";
import { EXPECTATION_EMOJI, REVIEW_CHIP_EMOJI } from "constants";
import "./index.scss";

export interface TravelerInsightsSectionProps {
    /** Place slug shared with the review system (from `getPlaceKey`). */
    placeKey: string;
}

const pct = (count: number, total: number) =>
    total > 0 ? Math.round((count / total) * 100) : 0;

/**
 * "Verified traveler insights" — the community payoff of activity reviews.
 * Computed (no AI) from the place's non-private reviews: the share who said it
 * lived up to expectations, and the most-mentioned chips as percentages. Hides
 * itself entirely until at least one traveler has reviewed the place, so it
 * never shows an empty card.
 */
const TravelerInsightsSection = ({ placeKey }: TravelerInsightsSectionProps) => {
    const { t } = useTranslation();
    const { data } = usePlaceReviewInsights(placeKey);

    if (!data || data.total === 0) return null;

    const { expectations: exp, topTags } = data;
    const expectRows =
        exp.total > 0
            ? [
                  { key: "better", count: exp.better, emoji: EXPECTATION_EMOJI.positive, labelKey: "review.expect.better" },
                  { key: "asExpected", count: exp.asExpected, emoji: EXPECTATION_EMOJI.neutral, labelKey: "review.expect.asExpected" },
                  { key: "overhyped", count: exp.overhyped, emoji: EXPECTATION_EMOJI.negative, labelKey: "review.expect.overhyped" },
              ]
            : [];

    return (
        <DetailSection
            title={t("detail.insights.title")}
            icon={<VerifiedRoundedIcon />}
            className="traveler-insights"
        >
            <p className="ti-based-on">
                {t("detail.insights.basedOn", {
                    count: data.verifiedCount || data.total,
                })}
            </p>

            {exp.total > 0 && (
                <div className="ti-expect">
                    <p className="ti-expect-headline">
                        {t("detail.insights.livedUp", { pct: exp.livedUpPct })}
                    </p>
                    <ul className="ti-expect-rows">
                        {expectRows.map((r) => (
                            <li className="ti-expect-row" key={r.key}>
                                <span className="ti-expect-label">
                                    <span className="ti-expect-emoji">
                                        {r.emoji}
                                    </span>
                                    {t(r.labelKey)}
                                </span>
                                <span className="ti-expect-bar">
                                    <span
                                        className="ti-expect-fill"
                                        style={{
                                            width: `${pct(r.count, exp.total)}%`,
                                        }}
                                    />
                                </span>
                                <span className="ti-expect-pct">
                                    {pct(r.count, exp.total)}%
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {topTags.length > 0 && (
                <div className="ti-chips">
                    <span className="ti-chips-title">
                        {t("detail.insights.mostMentioned")}
                    </span>
                    <ul className="ti-chips-list">
                        {topTags.map((chip) => (
                            <li className="ti-chip" key={chip.slug}>
                                <span className="ti-chip-emoji">
                                    {REVIEW_CHIP_EMOJI[chip.slug] ?? "•"}
                                </span>
                                <span className="ti-chip-pct">{chip.pct}%</span>
                                <span className="ti-chip-label">
                                    {t(`review.chips.${chip.slug}`)}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </DetailSection>
    );
};

export default TravelerInsightsSection;
