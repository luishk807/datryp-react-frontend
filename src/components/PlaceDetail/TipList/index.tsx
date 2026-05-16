import classNames from "classnames";
import type { NamedTip } from "types";
import "./index.scss";

export type TipListSize = "sm" | "md";

export interface TipListProps {
  items: NamedTip[];
  /** Visual density.
   *  - `md` (default) — used by the four "Top 5" sections; slightly larger
   *    text and a tighter `padding-bottom`-only item layout.
   *  - `sm` — used by the "Good to know" notes block; smaller text and
   *    symmetric vertical padding for a roomier feel. */
  size?: TipListSize;
}

/**
 * Stacked list of `{ name, why }` tips. Used by the four "Top 5" surfaces
 * on the place-detail page (things to do, foods, places to visit, photo
 * spots) and by the "Good to know" notes block (with `size="sm"`). Pair
 * with `TipListSkeleton` while the data is loading.
 */
const TipList = ({ items, size = "md" }: TipListProps) => (
  <ul className={classNames("tip-list", `size-${size}`)}>
    {items.map((t, i) => (
      <li key={`${t.name}-${i}`} className="tip-list-item">
        <span className="tip-list-name">{t.name}</span>
        <span className="tip-list-why">{t.why}</span>
      </li>
    ))}
  </ul>
);

export default TipList;
