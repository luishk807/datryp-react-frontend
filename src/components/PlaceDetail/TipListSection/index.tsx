import DetailSection from "components/PlaceDetail/DetailSection";
import TipList from "components/PlaceDetail/TipList";
import TipListSkeleton from "components/PlaceDetail/TipListSkeleton";
import type { NamedTip } from "types";

export interface TipListSectionProps {
  title: string;
  icon: React.ReactNode;
  /** The resolved list of tips. Pass `undefined` while the underlying
   *  query is still loading — a `TipListSkeleton` renders inside the
   *  section instead. */
  items: NamedTip[] | undefined;
}

/**
 * `DetailSection` whose body is a `TipList` once data resolves, or a
 * `TipListSkeleton` while still loading. Used by the four "Top 5"
 * surfaces on the place-detail page (things to do, foods, places to
 * visit, photo spots). The surrounding `place-detail-extras` block
 * handles the error state, so this component only switches between
 * loaded and loading.
 */
const TipListSection = ({ title, icon, items }: TipListSectionProps) => (
  <DetailSection title={title} icon={icon} badge={items?.length || undefined}>
    {items ? <TipList items={items} /> : <TipListSkeleton />}
  </DetailSection>
);

export default TipListSection;
