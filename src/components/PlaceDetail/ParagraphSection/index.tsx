import ParagraphSkeleton from "components/common/ParagraphSkeleton";
import MainSection, {
  type MainSectionSize,
} from "components/PlaceDetail/MainSection";
import "./index.scss";

export interface ParagraphSectionProps {
  /** Heading content. See `MainSection.title` — `ReactNode` so callers
   *  can embed extras like an inline `CostBadge`. */
  title: React.ReactNode;
  /** Optional MUI icon rendered in front of the title. */
  icon?: React.ReactNode;
  /** Forwarded to `MainSection.size`. Defaults to `xs` since the
   *  paragraph-body sections in the place-detail page (Country, Budget)
   *  both use the tightest gap. */
  size?: MainSectionSize;
  /** The resolved paragraph text. Pass `undefined` while the query is
   *  still loading — a `ParagraphSkeleton` renders inside the section. */
  description: string | undefined;
  /** Number of skeleton lines while loading. Defaults to 6 to match the
   *  current Country / Budget descriptions. */
  skeletonLines?: number;
  /** When true, the whole section renders nothing — lets the consumer
   *  drop the section in unconditionally and pass the source query's
   *  `isError` flag without wrapping the JSX in a guard. */
  isError?: boolean;
}

/**
 * `MainSection` whose body is a single description paragraph (or a
 * `ParagraphSkeleton` while loading). Captures the "Country" and "Budget"
 * shape: `MainSection` shell + one styled `<p>`. The paragraph styling
 * (0.95rem, muted color, 1.55 line-height) lives in this component, not
 * the consumer.
 */
const ParagraphSection = ({
  title,
  icon,
  size = "xs",
  description,
  skeletonLines = 6,
  isError = false,
}: ParagraphSectionProps) => {
  if (isError) return null;
  return (
    <MainSection title={title} icon={icon} size={size}>
      {description ? (
        <p className="paragraph-section-description">{description}</p>
      ) : (
        <ParagraphSkeleton lines={skeletonLines} />
      )}
    </MainSection>
  );
};

export default ParagraphSection;
