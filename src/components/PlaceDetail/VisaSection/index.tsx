import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import ParagraphSkeleton from "components/common/ParagraphSkeleton";
import DetailSection from "components/PlaceDetail/DetailSection";
import VisaWidget from "components/PlaceDetail/VisaWidget";
import type { VisaInfo } from "types";

export interface VisaSectionProps {
  /** Resolved visa info from the enriched query. Pass `undefined` while
   *  the query is still loading — a 3-line `ParagraphSkeleton` renders
   *  inside the section instead. */
  visa: VisaInfo | undefined;
  /** When true, the whole section renders nothing. Pass the source
   *  query's `isError` flag here instead of wrapping the call site in
   *  a `!isError && (...)` guard. */
  isError?: boolean;
}

/**
 * "Visa" sidebar section. Wraps `DetailSection` with a badge icon and
 * renders `VisaWidget` (or its loading skeleton) inside.
 */
const VisaSection = ({ visa, isError = false }: VisaSectionProps) => {
  if (isError) return null;
  return (
    <DetailSection title="Visa" icon={<BadgeRoundedIcon />}>
      {visa ? <VisaWidget visa={visa} /> : <ParagraphSkeleton lines={3} />}
    </DetailSection>
  );
};

export default VisaSection;
