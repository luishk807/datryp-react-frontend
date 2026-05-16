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
  /** Render prop called with the resolved data. Kept as a render prop
   *  (rather than `ReactNode` children) so consumers don't need their
   *  own `data && ...` guard. */
  children: (data: T) => React.ReactNode;
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
  children,
}: AsyncDetailSectionProps<T>) => (
  <DetailSection title={title} icon={icon}>
    {data != null ? (
      children(data)
    ) : isError ? (
      <p className="async-detail-section-error" role="alert">
        {errorMessage}
      </p>
    ) : (
      <ParagraphSkeleton lines={skeletonLines} />
    )}
  </DetailSection>
);

export default AsyncDetailSection;
