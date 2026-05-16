import Skeleton from "components/common/Skeleton";
import "./index.scss";

export interface ParagraphSkeletonProps {
  /** Number of shimmer lines to render. Defaults to 2. The final line is
   *  rendered at 70% width so the block reads like a real paragraph
   *  trailing off mid-sentence. */
  lines?: number;
}

/**
 * Shimmer placeholder shaped like a multi-line paragraph. Stacks `lines`
 * thin `Skeleton` bars at 100% width, with the last one truncated to 70%
 * so it visually matches text that doesn't fill the final line. Use this
 * wherever a description, summary, or other free-form paragraph is still
 * loading.
 */
const ParagraphSkeleton = ({ lines = 2 }: ParagraphSkeletonProps) => (
  <div className="paragraph-skeleton">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        width={i === lines - 1 ? "70%" : "100%"}
        height={12}
        radius={4}
      />
    ))}
  </div>
);

export default ParagraphSkeleton;
