import CelebrationRoundedIcon from "@mui/icons-material/CelebrationRounded";
import MainSection from "components/PlaceDetail/MainSection";
import LocalFlavorBlock, {
  LocalFlavorSkeleton,
} from "components/PlaceDetail/LocalFlavorBlock";
import type { LocalFlavor } from "types";

export interface LocalFlavorSectionProps {
  /** The resolved local-flavor payload (fun meter, nightlife, liquor,
   *  souvenir, must-do list). Pass `undefined` while the query is still
   *  loading — a `LocalFlavorSkeleton` renders inside the section
   *  instead. */
  flavor: LocalFlavor | undefined;
  /** When true, the whole section renders nothing. Pass the source
   *  query's `isError` flag here instead of wrapping the call site in
   *  a `!isError && (...)` guard. */
  isError?: boolean;
}

/**
 * "Local flavor" section that sits in the main content column of the
 * place-detail page. Wraps `MainSection` with a celebration icon and
 * renders `LocalFlavorBlock` (or its skeleton) inside.
 */
const LocalFlavorSection = ({
  flavor,
  isError = false,
}: LocalFlavorSectionProps) => {
  if (isError) return null;
  return (
    <MainSection
      title="Local flavor"
      icon={<CelebrationRoundedIcon />}
      size="md"
    >
      {flavor ? <LocalFlavorBlock flavor={flavor} /> : <LocalFlavorSkeleton />}
    </MainSection>
  );
};

export default LocalFlavorSection;
