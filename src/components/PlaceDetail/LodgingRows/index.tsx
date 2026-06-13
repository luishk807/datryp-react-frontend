import { useTranslation } from "react-i18next";
import StarBorderRoundedIcon from "@mui/icons-material/StarBorderRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import AttachMoneyRoundedIcon from "@mui/icons-material/AttachMoneyRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import classNames from "classnames";
import InfoRowList, {
  InfoRowListSkeleton,
  type InfoRow,
} from "components/PlaceDetail/InfoRowList";
import type { LodgingInfo } from "types";
import "./index.scss";

const AVAILABILITY_LABEL_KEY: Record<LodgingInfo["airbnbAvailability"], string> = {
  common: "detail.common.lodging.availabilityCommon",
  limited: "detail.common.lodging.availabilityLimited",
  none: "detail.common.lodging.availabilityNone",
};

interface AvailabilityBadgeProps {
  availability: LodgingInfo["airbnbAvailability"];
}

const AvailabilityBadge = ({ availability }: AvailabilityBadgeProps) => {
  const { t } = useTranslation();
  return (
    <span
      className={classNames("lodging-rows-badge", `availability-${availability}`)}
    >
      {t(AVAILABILITY_LABEL_KEY[availability])}
    </span>
  );
};

export interface LodgingRowsProps {
  lodging: LodgingInfo;
}

const LodgingRows = ({ lodging }: LodgingRowsProps) => {
  const { t } = useTranslation();
  const rows: InfoRow[] = [
    {
      icon: <StarBorderRoundedIcon />,
      label: t('detail.common.lodging.recommended'),
      value: lodging.recommendedType,
    },
    {
      icon: <HomeRoundedIcon />,
      label: "Airbnb",
      value: (
        <>
          <AvailabilityBadge availability={lodging.airbnbAvailability} />
          <span className="info-rows-sub"> — {lodging.airbnbNote}</span>
        </>
      ),
    },
    {
      icon: <ApartmentRoundedIcon />,
      label: t('detail.common.lodging.hotels'),
      value: (
        <>
          <AvailabilityBadge availability={lodging.hotelAvailability} />
          <span className="info-rows-sub"> — {lodging.hotelNote}</span>
        </>
      ),
    },
    {
      icon: <AttachMoneyRoundedIcon />,
      label: t('detail.common.lodging.priceRange'),
      value: lodging.priceRange,
    },
    {
      icon: <EventAvailableRoundedIcon />,
      label: t('detail.common.lodging.bookingTip'),
      value: lodging.bookingTip,
    },
  ];

  return <InfoRowList rows={rows} />;
};

export const LodgingSkeleton = () => <InfoRowListSkeleton rows={5} />;

export default LodgingRows;
