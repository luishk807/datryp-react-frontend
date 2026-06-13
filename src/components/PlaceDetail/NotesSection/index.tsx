import LightbulbRoundedIcon from "@mui/icons-material/LightbulbRounded";
import { useTranslation } from "react-i18next";
import MainSection from "components/PlaceDetail/MainSection";
import TipList from "components/PlaceDetail/TipList";
import TipListSkeleton from "components/PlaceDetail/TipListSkeleton";
import type { NamedTip } from "types";

export interface NotesSectionProps {
  /** The resolved list of "good to know" notes. Pass `undefined` while
   *  the query is still loading — a `TipListSkeleton` renders inside the
   *  section instead. */
  items: NamedTip[] | undefined;
  /** When true, the whole section renders nothing. Pass the source
   *  query's `isError` flag here instead of wrapping the call site in
   *  a `!isError && (...)` guard. */
  isError?: boolean;
}

/**
 * "Good to know" section that sits in the main content column of the
 * place-detail page. Wraps `MainSection` with a lightbulb icon and
 * renders the compact `TipList` (size `sm`) inside.
 */
const NotesSection = ({ items, isError = false }: NotesSectionProps) => {
  const { t } = useTranslation();
  if (isError) return null;
  return (
    <MainSection
      title={t('detail.common.goodToKnow')}
      icon={<LightbulbRoundedIcon />}
      size="sm"
    >
      {items ? (
        <TipList items={items} size="sm" />
      ) : (
        <TipListSkeleton size="sm" />
      )}
    </MainSection>
  );
};

export default NotesSection;
