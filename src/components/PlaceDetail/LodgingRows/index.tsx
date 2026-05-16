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

const AVAILABILITY_LABEL: Record<LodgingInfo["airbnbAvailability"], string> = {
  common: "Widely available",
  limited: "Limited",
  none: "Not available",
};

interface AvailabilityBadgeProps {
  availability: LodgingInfo["airbnbAvailability"];
}

const AvailabilityBadge = ({ availability }: AvailabilityBadgeProps) => (
  <span
    className={classNames("lodging-rows-badge", `availability-${availability}`)}
  >
    {AVAILABILITY_LABEL[availability]}
  </span>
);

export interface LodgingRowsProps {
  lodging: LodgingInfo;
}

const LodgingRows = ({ lodging }: LodgingRowsProps) => {
  const rows: InfoRow[] = [
    {
      icon: <StarBorderRoundedIcon />,
      label: "Recommended",
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
      label: "Hotels",
      value: (
        <>
          <AvailabilityBadge availability={lodging.hotelAvailability} />
          <span className="info-rows-sub"> — {lodging.hotelNote}</span>
        </>
      ),
    },
    {
      icon: <AttachMoneyRoundedIcon />,
      label: "Price range",
      value: lodging.priceRange,
    },
    {
      icon: <EventAvailableRoundedIcon />,
      label: "Booking tip",
      value: lodging.bookingTip,
    },
  ];

  return <InfoRowList rows={rows} />;
};

export const LodgingSkeleton = () => <InfoRowListSkeleton rows={5} />;

export default LodgingRows;
