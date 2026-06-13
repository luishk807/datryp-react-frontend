import { useTranslation } from "react-i18next";
import SentimentVerySatisfiedRoundedIcon from "@mui/icons-material/SentimentVerySatisfiedRounded";
import NightlifeRoundedIcon from "@mui/icons-material/NightlifeRounded";
import LocalBarRoundedIcon from "@mui/icons-material/LocalBarRounded";
import RedeemRoundedIcon from "@mui/icons-material/RedeemRounded";
import StarsRoundedIcon from "@mui/icons-material/StarsRounded";
import Skeleton from "components/common/Skeleton";
import MustDoList, {
  MustDoListSkeleton,
} from "components/PlaceDetail/MustDoList";
import type { LocalFlavor } from "types";
import "./index.scss";

const FUN_LEVEL_LABEL_KEY: Record<number, string> = {
  1: "detail.common.localFlavor.fun1",
  2: "detail.common.localFlavor.fun2",
  3: "detail.common.localFlavor.fun3",
  4: "detail.common.localFlavor.fun4",
  5: "detail.common.localFlavor.fun5",
};

export interface LocalFlavorBlockProps {
  flavor: LocalFlavor;
}

const LocalFlavorBlock = ({ flavor }: LocalFlavorBlockProps) => {
  const { t } = useTranslation();
  const level = Math.max(1, Math.min(5, Math.round(flavor.funLevel)));
  return (
    <div className="local-flavor">
      {/* Fun meter — same visual pattern as the safety meter. */}
      <div className="local-flavor-fun">
        <div className="local-flavor-fun-top">
          <span className="local-flavor-fun-icon" aria-hidden="true">
            <SentimentVerySatisfiedRoundedIcon />
          </span>
          <span className="local-flavor-fun-label">
            {t('detail.common.localFlavor.funLevel')}
          </span>
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
          aria-label={t('detail.common.localFlavor.funLevelAria', {
            n: level,
          })}
        >
          <div
            className="local-flavor-meter-fill"
            style={{ width: `${(level / 5) * 100}%` }}
          />
        </div>
        <span className="local-flavor-fun-tag">
          {t(FUN_LEVEL_LABEL_KEY[level])}
        </span>
      </div>

      {/* Three short labeled paragraphs. */}
      <div className="local-flavor-rows">
        <div className="local-flavor-row">
          <span className="local-flavor-row-label">
            <NightlifeRoundedIcon className="local-flavor-row-icon" />
            {t('detail.common.localFlavor.nightlife')}
          </span>
          <p className="local-flavor-row-text">{flavor.nightlife}</p>
        </div>
        <div className="local-flavor-row">
          <span className="local-flavor-row-label">
            <LocalBarRoundedIcon className="local-flavor-row-icon" />
            {t('detail.common.localFlavor.famousLiquor')}
          </span>
          <p className="local-flavor-row-text">{flavor.famousLiquor}</p>
        </div>
        <div className="local-flavor-row">
          <span className="local-flavor-row-label">
            <RedeemRoundedIcon className="local-flavor-row-icon" />
            {t('detail.common.localFlavor.souvenir')}
          </span>
          <p className="local-flavor-row-text">{flavor.uniqueSouvenir}</p>
        </div>
      </div>

      {/* Don't-leave-without list. */}
      <div className="local-flavor-mustdo">
        <span className="local-flavor-mustdo-label">
          <StarsRoundedIcon className="local-flavor-row-icon" />
          {t('detail.common.localFlavor.dontLeaveWithout')}
        </span>
        <MustDoList items={flavor.mustDoBeforeLeaving} />
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
    <MustDoListSkeleton />
  </div>
);

export default LocalFlavorBlock;
