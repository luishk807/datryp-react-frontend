import ParagraphSkeleton from "components/common/ParagraphSkeleton";
import DetailSection from "components/PlaceDetail/DetailSection";
import "./index.scss";

export interface AsyncDetailSectionProps<T> {
  title: string;
  icon: React.ReactNode;
  /** The query payload. `undefined` (still loading) shows a paragraph
   *  skeleton; `null` is also treated as "not loaded yet" for consumers
   *  that nullify their successful payload. */
  data: T | null | undefined;
  /** When true, replaces the skeleton with an inline `role="alert"` error
   *  paragraph. */
  isError?: boolean;
  /** Sentence shown inside the section when `isError` is true.
   *  Example: "Could not load weather." */
  errorMessage: string;
  /** Skeleton paragraph line count while loading. Defaults to 3. */
  skeletonLines?: number;
  /** Short status hint shown above the skeleton while loading —
   *  tells the user WHAT is being fetched so a wall of shimmer
   *  doesn't read as "the page is broken". Per-section copy
   *  (e.g., "Fetching weather…", "Looking up currency…") set by
   *  the consumer. Hidden once `data` resolves. */
  loadingHint?: string;
  /** Render prop called with the resolved data. Kept as a render prop
   *  (rather than `ReactNode` children) so consumers don't need their
   *  own `data && ...` guard. */
  children: (data: T) => React.ReactNode;
  /** Optional extra class forwarded to the underlying `DetailSection`
   *  wrapper — lets a consumer drop the card chrome (e.g. Getting there
   *  rendering inline in the main content column). */
  className?: string;
}

/**
 * A `DetailSection` whose body switches between three states: a paragraph
 * skeleton while data is loading, an inline error paragraph when the query
 * fails, and the consumer's rendered content once data resolves. Used by
 * the side-aside widgets on the place-detail page (Weather, Currency,
 * Safety, Getting there) which all share the same shape.
 */
const AsyncDetailSection = <T,>({
  title,
  icon,
  data,
  isError = false,
  errorMessage,
  skeletonLines = 3,
  loadingHint,
  children,
  className,
}: AsyncDetailSectionProps<T>) => (
  <DetailSection title={title} icon={icon} className={className}>
    {data != null ? (
      children(data)
    ) : isError ? (
      <p className="async-detail-section-error" role="alert">
        {errorMessage}
      </p>
    ) : (
      <>
        {loadingHint && (
          <p
            className="async-detail-section-loading-hint"
            aria-live="polite"
          >
            {loadingHint}
          </p>
        )}
        <ParagraphSkeleton lines={skeletonLines} />
      </>
    )}
  </DetailSection>
);

export default AsyncDetailSection;
