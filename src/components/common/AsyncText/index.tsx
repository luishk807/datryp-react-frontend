import Skeleton from "components/common/Skeleton";

export interface AsyncTextProps {
  /** The resolved value to render. Pass `undefined` (or `null`) while the
   *  underlying query is still loading — a thin `Skeleton` bar renders
   *  in its place. */
  value: React.ReactNode | null | undefined;
  /** When true (and `value` is still unresolved), the `errorFallback` is
   *  shown instead of the skeleton. Useful for surfaces where the
   *  surrounding section stays visible on error. */
  isError?: boolean;
  /** What to render in the error state. Defaults to `null` (renders
   *  nothing), which is the right call when the surrounding section is
   *  itself hidden on error. */
  errorFallback?: React.ReactNode;
  /** Skeleton bar width while loading. Defaults to `"95%"`. */
  skeletonWidth?: string | number;
  /** Skeleton bar height while loading. Defaults to `14` (px). */
  skeletonHeight?: string | number;
}

/**
 * Inline "value or thin shimmer bar" placeholder. Replaces the recurring
 * `data ? value : <Skeleton width="…" height={14} />` ternary in views
 * that resolve a single short string from an async query (a name, a
 * highlight, a date label). For multi-line paragraphs use
 * `ParagraphSkeleton`; for a whole DetailSection use `AsyncDetailSection`.
 */
const AsyncText = ({
  value,
  isError = false,
  errorFallback = null,
  skeletonWidth = "95%",
  skeletonHeight = 14,
}: AsyncTextProps) => {
  if (value != null) return <>{value}</>;
  if (isError) return <>{errorFallback}</>;
  return (
    <Skeleton width={skeletonWidth} height={skeletonHeight} radius={4} />
  );
};

export default AsyncText;
