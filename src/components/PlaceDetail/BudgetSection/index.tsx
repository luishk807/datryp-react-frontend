import SavingsRoundedIcon from "@mui/icons-material/SavingsRounded";
import CostBadge from "components/common/CostBadge";
import ParagraphSection from "components/PlaceDetail/ParagraphSection";

export interface BudgetSectionProps {
  /** Budget description paragraph. Pass `undefined` while the query is
   *  still loading — `ParagraphSection` shows its skeleton instead. */
  description: string | undefined;
  /** 1-5 cost tier displayed in the heading. `null` / `undefined` hides
   *  the badge (see `CostBadge`'s own silent-return). */
  costLevel: number | null | undefined;
  /** When true, the whole section renders nothing. Pass the source
   *  query's `isError` flag here instead of wrapping the call site in
   *  a `!isError && (...)` guard. */
  isError?: boolean;
}

/**
 * "Expenses & budget" section that sits in the main content column of
 * the place-detail page. Wraps `ParagraphSection` with a piggy-bank icon
 * and an inline `CostBadge` in the heading.
 */
const BudgetSection = ({
  description,
  costLevel,
  isError,
}: BudgetSectionProps) => (
  <ParagraphSection
    title={
      <>
        Expenses &amp; budget
        <CostBadge level={costLevel} />
      </>
    }
    icon={<SavingsRoundedIcon />}
    size="xs"
    description={description}
    skeletonLines={6}
    isError={isError}
  />
);

export default BudgetSection;
