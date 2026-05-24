import WhatshotRoundedIcon from "@mui/icons-material/WhatshotRounded";
import PopularityWidget from "components/PopularityWidget";
import AsyncDetailSection from "components/PlaceDetail/AsyncDetailSection";
import { useUser } from "context/UserContext";
import type { PopularityInfo } from "types";

export interface PopularitySectionProps {
  /** Resolved popularity payload from the enriched query. `undefined`
   *  while loading — `AsyncDetailSection` shows a 3-line paragraph
   *  skeleton in its place. `null` is treated identically (e.g. cached
   *  detail rows from before this field shipped) so the section keeps
   *  the skeleton off-screen rather than rendering an empty card. */
  popularity: PopularityInfo | null | undefined;
  /** Whether the enriched query errored. When true the section shows
   *  an inline "Could not load popularity." paragraph. */
  isError: boolean;
}

/**
 * "Popularity this year" sidebar section. Wraps `AsyncDetailSection`
 * with a flame icon and renders `PopularityWidget` (animated meter +
 * trend chip + summary) once the popularity payload resolves.
 *
 * Pro-only: hidden entirely for signed-out and free-tier users. Gated
 * inside the section so each consumer (place/country/city pages) gets
 * the gate for free without having to thread `isPro` through.
 */
const PopularitySection = ({ popularity, isError }: PopularitySectionProps) => {
  const { user, isAdmin } = useUser();
  const isPro = Boolean(user && (user.isPaidMember || isAdmin));
  if (!isPro) return null;
  // Hide the section entirely when the parent's query has resolved but
  // popularity is null/undefined — old cached country/city/place rows
  // from before this field shipped don't carry the payload, and
  // `AsyncDetailSection` would otherwise leave a 3-line skeleton
  // spinning forever (the "hanging widget" bug). Parents only mount
  // this section after their own data load completes, so a null
  // payload at this point means "not in the response", not "still
  // loading". Errors still surface via `isError` below.
  if (!isError && popularity == null) return null;
  return (
    <AsyncDetailSection
      title="Popularity this year"
      icon={<WhatshotRoundedIcon />}
      data={popularity}
      isError={isError}
      errorMessage="Could not load popularity."
      skeletonLines={3}
    >
      {(info) => <PopularityWidget info={info} />}
    </AsyncDetailSection>
  );
};

export default PopularitySection;
