import SentimentVerySatisfiedRoundedIcon from "@mui/icons-material/SentimentVerySatisfiedRounded";
import NightlifeRoundedIcon from "@mui/icons-material/NightlifeRounded";
import LocalBarRoundedIcon from "@mui/icons-material/LocalBarRounded";
import RedeemRoundedIcon from "@mui/icons-material/RedeemRounded";
import StarsRoundedIcon from "@mui/icons-material/StarsRounded";
import Skeleton from "components/common/Skeleton";
import TipList from "components/PlaceDetail/TipList";
import TipListSkeleton from "components/PlaceDetail/TipListSkeleton";
import type { LocalFlavor } from "types";
import "./index.scss";

const FUN_LEVEL_LABEL: Record<number, string> = {
  1: "Very quiet",
  2: "Relaxed",
  3: "Balanced",
  4: "Lively",
  5: "High-energy",
};

export interface LocalFlavorBlockProps {
  flavor: LocalFlavor;
}

const LocalFlavorBlock = ({ flavor }: LocalFlavorBlockProps) => {
  const level = Math.max(1, Math.min(5, Math.round(flavor.funLevel)));
  return (
    <div className="local-flavor">
      {/* Fun meter — same visual pattern as the safety meter. */}
      <div className="local-flavor-fun">
        <div className="local-flavor-fun-top">
          <span className="local-flavor-fun-icon" aria-hidden="true">
            <SentimentVerySatisfiedRoundedIcon />
          </span>
          <span className="local-flavor-fun-label">Fun level</span>
          <span className="local-flavor-fun-score">
            <strong>{level}</strong>
            <span className="local-flavor-fun-score-max">/5</span>
          </span>
        </div>
        <div
          className="local-flavor-meter"
          role="meter"
          aria-valuemin={1}
          aria-valuemax={5}
          aria-valuenow={level}
          aria-label={`Fun level ${level} out of 5`}
        >
          <div
            className="local-flavor-meter-fill"
            style={{ width: `${(level / 5) * 100}%` }}
          />
        </div>
        <span className="local-flavor-fun-tag">{FUN_LEVEL_LABEL[level]}</span>
      </div>

      {/* Three short labeled paragraphs. */}
      <div className="local-flavor-rows">
        <div className="local-flavor-row">
          <span className="local-flavor-row-label">
            <NightlifeRoundedIcon className="local-flavor-row-icon" />
            Nightlife
          </span>
          <p className="local-flavor-row-text">{flavor.nightlife}</p>
        </div>
        <div className="local-flavor-row">
          <span className="local-flavor-row-label">
            <LocalBarRoundedIcon className="local-flavor-row-icon" />
            Famous liquor
          </span>
          <p className="local-flavor-row-text">{flavor.famousLiquor}</p>
        </div>
        <div className="local-flavor-row">
          <span className="local-flavor-row-label">
            <RedeemRoundedIcon className="local-flavor-row-icon" />
            Souvenir
          </span>
          <p className="local-flavor-row-text">{flavor.uniqueSouvenir}</p>
        </div>
      </div>

      {/* Don't-leave-without list. */}
      <div className="local-flavor-mustdo">
        <span className="local-flavor-mustdo-label">
          <StarsRoundedIcon className="local-flavor-row-icon" />
          Don&rsquo;t leave without
        </span>
        <TipList items={flavor.mustDoBeforeLeaving} size="sm" />
      </div>
    </div>
  );
};

export const LocalFlavorSkeleton = () => (
  <div className="local-flavor">
    <Skeleton width="60%" height={14} radius={4} />
    <Skeleton width="100%" height={8} radius={999} />
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="local-flavor-row">
        <Skeleton width="35%" height={12} radius={4} />
        <Skeleton width="95%" height={14} radius={4} />
      </div>
    ))}
    <TipListSkeleton size="sm" />
  </div>
);

export default LocalFlavorBlock;
